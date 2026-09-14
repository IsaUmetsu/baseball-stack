import { OutputJson } from "../../type/jsonType";
import { GameFileDataSource } from "../../infrastructure/file/game-file.datasource";

export interface CheckProgressionResult {
  hasError: boolean;
  isFinished: boolean;
  needRerun: boolean;
}

export class CheckInningsProgressionUseCase {
  private static readonly START_SCENE_CNT = 1;
  private static readonly MULTI_OUT_REGEX = /併殺|三重殺|ゲッツー|タッチアウト|戻れず|盗塁失敗|守備妨害/;

  constructor(private readonly fileDataSource: GameFileDataSource) {}

  public async execute(
    dateStr: string,
    targetGameNo: string,
    isCleanMode: boolean
  ): Promise<CheckProgressionResult | null> {
    const existGameDir = await this.fileDataSource.existGameDirectory(dateStr, targetGameNo);
    if (!existGameDir) return null;

    let sceneCnt = await this.fileDataSource.getSceneCount(dateStr, targetGameNo);
    if (sceneCnt === 0) return null;

    let hasError = false;
    let needRerun = false;

    // ==========================================
    // フェーズ 1: 重複シーンの検知＆自動連番修復
    // ==========================================
    const recentScenes: { sceneNo: number; data: OutputJson }[] = [];

    for (let sceneNo = CheckInningsProgressionUseCase.START_SCENE_CNT; sceneNo <= sceneCnt; sceneNo++) {
      const data = this.fileDataSource.getSceneJson(dateStr, targetGameNo, sceneNo);
      if (!data) continue;

      const { liveBody } = data;
      const battingResult = liveBody?.battingResult || "";
      const pitchingResult = liveBody?.pitchingResult || "";
      const currentBatter = liveBody?.currentBatterInfo?.name;

      let isDuplicate = false;
      let matchedPrevSceneNo = -1;

      if (liveBody && (battingResult || pitchingResult) && currentBatter) {
        for (let offset = 1; offset <= 3; offset++) {
          const prevEntry = recentScenes[recentScenes.length - offset];
          if (!prevEntry) continue;

          const prevLiveBody = prevEntry.data.liveBody;
          const prevBatter = prevLiveBody?.currentBatterInfo?.name;

          if (
            prevBatter &&
            currentBatter === prevBatter &&
            battingResult === (prevLiveBody?.battingResult || "") &&
            pitchingResult === (prevLiveBody?.pitchingResult || "")
          ) {
            isDuplicate = true;
            matchedPrevSceneNo = prevEntry.sceneNo;
            break;
          }
        }
      }

      if (isDuplicate) {
        if (isCleanMode) {
          this.fileDataSource.removeDuplicateAndRenumber(dateStr, targetGameNo, sceneNo, sceneCnt);
          console.log(
            `[CLEAN DUP] date: ${dateStr}, gameNo: ${targetGameNo} - deleted duplicate scene ${sceneNo}, renumbered ${sceneNo + 1}..${sceneCnt} -> ${sceneNo}..${sceneCnt - 1}`
          );
          sceneCnt--;
          sceneNo--;
          continue;
        } else {
          console.error(
            `[ERROR DUP] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - 重複シーン検知 (scene ${matchedPrevSceneNo} と完全一致)`
          );
          needRerun = true;
        }
      }

      recentScenes.push({ sceneNo, data });
      if (recentScenes.length > 4) {
        recentScenes.shift();
      }
    }

    // ==========================================
    // フェーズ 2: イニング／アウトカウント整合性チェック
    // ==========================================
    let firstDeleteFromScene: number | null = null;
    let prevInningIdx = -1;
    let prevInningStr = "";
    let prevOutCount = 0;
    let currentInningFirstScene = 1;

    for (let sceneNo = CheckInningsProgressionUseCase.START_SCENE_CNT; sceneNo <= sceneCnt; sceneNo++) {
      const data = this.fileDataSource.getSceneJson(dateStr, targetGameNo, sceneNo);
      if (!data) continue;

      const { liveHeader, liveBody } = data;

      if (!liveHeader) {
        console.error(`[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - liveHeader is missing.`);
        hasError = true;
        if (firstDeleteFromScene === null) firstDeleteFromScene = sceneNo;
        continue;
      }

      const currentInningStr = liveHeader.inning || "";
      const currentInningIdx = this.inningToIndex(currentInningStr);
      const currentOutCount = liveHeader.count ? Number(liveHeader.count.o) : (Number((liveHeader as any).bso?.o) || 0);

      const battingResult = liveBody?.battingResult || "";
      const pitchingResult = liveBody?.pitchingResult || "";

      // 最初のシーンのチェック
      if (sceneNo === 1) {
        if (currentInningIdx !== 0 && currentInningIdx !== 999) {
          console.error(`[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: 1 - 試合開始イニングが不正です: ${currentInningStr}`);
          hasError = true;
          if (firstDeleteFromScene === null) firstDeleteFromScene = 1;
        }
        prevInningIdx = currentInningIdx;
        prevInningStr = currentInningStr;
        prevOutCount = currentOutCount;
        currentInningFirstScene = 1;
        continue;
      }

      // イニング進行チェック
      if (currentInningIdx === 999) {
        if (prevInningIdx === 999) {
          // 試合終了の連続は問題なし
        } else if (prevInningIdx < 0) {
          console.error(
            `[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - 不明なイニングから試合終了に遷移しました: ${prevInningStr} -> ${currentInningStr}`
          );
          hasError = true;
          if (firstDeleteFromScene === null) firstDeleteFromScene = currentInningFirstScene;
        }
      } else if (prevInningIdx === 999) {
        console.error(
          `[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - 試合終了後にイニングが進行しました: ${prevInningStr} -> ${currentInningStr}`
        );
        hasError = true;
        if (firstDeleteFromScene === null) firstDeleteFromScene = sceneNo;
      } else if (currentInningIdx < prevInningIdx) {
        console.error(
          `[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - イニングが戻っています: ${prevInningStr} -> ${currentInningStr}`
        );
        hasError = true;
        if (firstDeleteFromScene === null) firstDeleteFromScene = currentInningFirstScene;
      } else if (currentInningIdx > prevInningIdx + 1) {
        console.error(
          `[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - イニング飛び: ${prevInningStr} -> ${currentInningStr}`
        );
        hasError = true;
        if (firstDeleteFromScene === null) firstDeleteFromScene = sceneNo;
      } else if (currentInningIdx === prevInningIdx + 1) {
        if (prevOutCount !== 3) {
          console.error(
            `[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - 前イニングが3アウト未満でチェンジしました: ${prevInningStr} (${prevOutCount}アウト) -> ${currentInningStr}`
          );
          hasError = true;
          if (firstDeleteFromScene === null) firstDeleteFromScene = currentInningFirstScene;
        }
        currentInningFirstScene = sceneNo;
        prevOutCount = 0;
      }

      // アウトカウント進行チェック（同一イニング内）
      if (currentInningIdx === prevInningIdx && currentInningIdx !== 999) {
        if (currentOutCount < prevOutCount) {
          console.error(
            `[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - アウトカウント減少: ${prevOutCount} -> ${currentOutCount}`
          );
          hasError = true;
          if (firstDeleteFromScene === null) firstDeleteFromScene = currentInningFirstScene;
        } else if (currentOutCount > prevOutCount) {
          const outDiff = currentOutCount - prevOutCount;
          if (outDiff === 2) {
            if (!this.isDoubleOrTriplePlay(battingResult, pitchingResult)) {
              console.error(
                `[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - アウトカウント飛び (併殺記録なし): ${prevOutCount} -> ${currentOutCount} (結果: ${battingResult})`
              );
              hasError = true;
              if (firstDeleteFromScene === null) firstDeleteFromScene = currentInningFirstScene;
            }
          } else if (outDiff === 3) {
            if (!this.isDoubleOrTriplePlay(battingResult, pitchingResult)) {
              console.error(
                `[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - アウトカウント飛び (三重殺記録なし): ${prevOutCount} -> ${currentOutCount} (結果: ${battingResult})`
              );
              hasError = true;
              if (firstDeleteFromScene === null) firstDeleteFromScene = currentInningFirstScene;
            }
          } else if (outDiff > 3 || currentOutCount > 3) {
            console.error(
              `[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - アウトカウント飛び: ${prevOutCount} -> ${currentOutCount}`
            );
            hasError = true;
            if (firstDeleteFromScene === null) firstDeleteFromScene = currentInningFirstScene;
          }
        }
      }

      prevInningIdx = currentInningIdx;
      prevInningStr = currentInningStr;
      prevOutCount = currentOutCount;
    }

    if (hasError) {
      needRerun = true;
    }

    if (isCleanMode && firstDeleteFromScene !== null) {
      const deletedCount = this.fileDataSource.deleteScenes(dateStr, targetGameNo, firstDeleteFromScene, sceneCnt);
      console.log(
        `[CLEAN] date: ${dateStr}, gameNo: ${targetGameNo} - deleted ${deletedCount} files (scene ${firstDeleteFromScene} to ${sceneCnt}).`
      );
    }

    const lastJson = this.fileDataSource.getSceneJson(dateStr, targetGameNo, sceneCnt);
    const lastInning = lastJson?.liveHeader ? lastJson.liveHeader.inning : "";
    const isFinished = ["試合終了", "試合中止", "ノーゲーム", "コールド"].some((term) => lastInning.includes(term));

    if (!isFinished) {
      if (!hasError) {
        console.warn(`[WARN] date: ${dateStr}, gameNo: ${targetGameNo} - 試合が終了していません: ${lastInning}`);
        needRerun = true;
      }
    } else if (!hasError) {
      console.log(`[OK] date: ${dateStr}, gameNo: ${targetGameNo} - progression complete.`);
    }

    return { hasError, isFinished, needRerun };
  }

  private inningToIndex(inning: string): number {
    if (!inning) return -1;
    if (
      inning.includes("試合終了") ||
      inning.includes("試合中止") ||
      inning.includes("ノーゲーム") ||
      inning.includes("コールド")
    ) {
      return 999;
    }

    const match = inning.match(/(\d+)回(表|裏)/);
    if (!match) return -1;

    const inningNum = parseInt(match[1], 10);
    const isUra = match[2] === "裏";

    return (inningNum - 1) * 2 + (isUra ? 1 : 0);
  }

  private isDoubleOrTriplePlay(battingResult = "", pitchingResult = ""): boolean {
    return CheckInningsProgressionUseCase.MULTI_OUT_REGEX.test(`${battingResult} ${pitchingResult}`);
  }
}

