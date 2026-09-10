import { format } from 'util';
import * as path from 'path';
import { OutputJson } from './type/jsonType';
import { checkGameDir, getJson, countFiles, checkDateDir, BASEBALL_DATA_DIR } from './util/fs';
import { checkArgDaySeasonEndSpecify } from './util/display';
import { getDayInfo } from './util/day';

const startGameNo = 1;
const endGameNo = 6;
const startSceneCnt = 1;

const { D, SE, S } = process.env;
let { targetDay, seasonEndArg, specifyArg } = checkArgDaySeasonEndSpecify(D, SE, S);
const { day, seasonStart, seasonEnd } = getDayInfo(targetDay, seasonEndArg);

const datePath = path.join(BASEBALL_DATA_DIR, 'output');
const gamePath = path.join(BASEBALL_DATA_DIR, 'output', '%s', '%s');
const jsonPath = path.join(BASEBALL_DATA_DIR, 'output', '%s', '%s', '%s.json');

/**
 * 1シーンごとの試合データ取得
 */
const getData = async (scene: number, dateString: string, gameNo: string): Promise<OutputJson> => {
  return JSON.parse(getJson(format(jsonPath, dateString, gameNo, scene)));
};

/**
 * イニング文字列をハーフイニング単位の連番インデックスに変換する
 * 1回表 -> 0, 1回裏 -> 1, 2回表 -> 2, 2回裏 -> 3, ...
 * 試合終了 / 中止 / ノーゲーム -> 999
 */
const inningToIndex = (inning: string): number => {
  if (!inning) return -1;
  if (inning.includes('試合終了') || inning.includes('試合中止') || inning.includes('ノーゲーム') || inning.includes('コールド')) {
    return 999;
  }

  const match = inning.match(/(\d+)回(表|裏)/);
  if (!match) return -1;

  const inningNum = parseInt(match[1], 10);
  const isUra = match[2] === '裏';

  return (inningNum - 1) * 2 + (isUra ? 1 : 0);
};

const MULTI_OUT_KEYWORDS = ['併殺', '三重殺', 'ゲッツー', 'タッチアウト', '戻れず', '盗塁失敗', '守備妨害'] as const;

/**
 * 複数アウト（併殺・三重殺・走塁死等）に該当するプレーかを判定する
 */
const isDoubleOrTriplePlay = (battingResult = '', pitchingResult = ''): boolean => {
  const target = `${battingResult} ${pitchingResult}`;
  return MULTI_OUT_KEYWORDS.some(keyword => target.includes(keyword));
};


const doCheck = async (gameNo: number, dateStr: string) => {
  const targetGameNo = format('0%d', gameNo);
  const existGameDir = await checkGameDir(datePath, dateStr, targetGameNo);
  if (!existGameDir) return;

  const sceneCnt = await countFiles(format(gamePath, dateStr, targetGameNo));
  if (sceneCnt === 0) return;

  let hasError = false;
  let prevInningIdx = -1;
  let prevInningStr = '';
  let prevOutCount = 0;

  for (let sceneNo = startSceneCnt; sceneNo <= sceneCnt; sceneNo++) {
    const data = await getData(sceneNo, dateStr, targetGameNo);
    const { liveHeader, liveBody } = data;

    if (!liveHeader) {
      console.error(`[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - liveHeader is missing.`);
      hasError = true;
      continue;
    }

    const currentInningStr = liveHeader.inning || '';
    const currentInningIdx = inningToIndex(currentInningStr);
    const currentOutCount = liveHeader.count ? Number(liveHeader.count.o) : (Number((liveHeader as any).bso?.o) || 0);

    const battingResult = liveBody?.battingResult || '';
    const pitchingResult = liveBody?.pitchingResult || '';

    // 最初のシーンのチェック
    if (sceneNo === 1) {
      if (currentInningIdx !== 0 && currentInningIdx !== 999) {
        console.error(`[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: 1 - 試合開始イニングが不正です: ${currentInningStr}`);
        hasError = true;
      }
      prevInningIdx = currentInningIdx;
      prevInningStr = currentInningStr;
      prevOutCount = currentOutCount;
      continue;
    }

    // イニング進行チェック
    if (currentInningIdx === 999) {
      // 試合終了への遷移
      if (prevInningIdx === 999) {
        // 試合終了の連続は問題なし
      } else if (prevInningIdx < 0) {
        console.error(`[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - 不明なイニングから試合終了に遷移しました: ${prevInningStr} -> ${currentInningStr}`);
        hasError = true;
      }
    } else if (prevInningIdx === 999) {
      // 試合終了後に別のイニングが出現した場合は異常
      console.error(`[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - 試合終了後にイニングが進行しました: ${prevInningStr} -> ${currentInningStr}`);
      hasError = true;
    } else if (currentInningIdx < prevInningIdx) {
      // イニング逆行
      console.error(`[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - イニングが戻っています: ${prevInningStr} -> ${currentInningStr}`);
      hasError = true;
    } else if (currentInningIdx > prevInningIdx + 1) {
      // イニングスキップ
      console.error(`[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - イニング飛び: ${prevInningStr} -> ${currentInningStr}`);
      hasError = true;
    } else if (currentInningIdx === prevInningIdx + 1) {
      // イニングが次へ進んだ場合（表 -> 裏、または 裏 -> 次の表）
      // 直前イニングが 3アウトで終了していたかを検証
      if (prevOutCount !== 3) {
        console.error(`[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - 前イニングが3アウト未満でチェンジしました: ${prevInningStr} (${prevOutCount}アウト) -> ${currentInningStr}`);
        hasError = true;
      }
      prevOutCount = 0; // イニングチェンジ時はアウトカウントリセット
    }

    // アウトカウント進行チェック（同一イニング内）
    if (currentInningIdx === prevInningIdx && currentInningIdx !== 999) {
      if (currentOutCount < prevOutCount) {
        console.error(`[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - アウトカウント減少: ${prevOutCount} -> ${currentOutCount}`);
        hasError = true;
      } else if (currentOutCount > prevOutCount) {
        const outDiff = currentOutCount - prevOutCount;
        if (outDiff === 2) {
          // 2アウト増加（併殺打などのダブルプレーか検証）
          if (!isDoubleOrTriplePlay(battingResult, pitchingResult)) {
            console.error(`[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - アウトカウント飛び (併殺記録なし): ${prevOutCount} -> ${currentOutCount} (結果: ${battingResult})`);
            hasError = true;
          }
        } else if (outDiff === 3) {
          // 3アウト増加（三重殺か検証）
          if (!isDoubleOrTriplePlay(battingResult, pitchingResult)) {
            console.error(`[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - アウトカウント飛び (三重殺記録なし): ${prevOutCount} -> ${currentOutCount} (結果: ${battingResult})`);
            hasError = true;
          }
        } else if (outDiff > 3 || currentOutCount > 3) {
          console.error(`[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - アウトカウント飛び: ${prevOutCount} -> ${currentOutCount}`);
          hasError = true;
        }
      }
    }

    prevInningIdx = currentInningIdx;
    prevInningStr = currentInningStr;
    prevOutCount = currentOutCount;
  }

  const lastJson = await getData(sceneCnt, dateStr, targetGameNo);
  const lastInning = lastJson.liveHeader ? lastJson.liveHeader.inning : '';
  const isFinished = ['試合終了', '試合中止', 'ノーゲーム', 'コールド'].some(term => lastInning.includes(term));

  if (!isFinished) {
    console.warn(`[WARN] date: ${dateStr}, gameNo: ${targetGameNo} - 試合が終了していません: ${lastInning}`);
  } else if (!hasError) {
    console.log(`[OK] date: ${dateStr}, gameNo: ${targetGameNo} - progression complete.`);
  }
};

/**
 * メイン処理
 */
const main = async () => {
  while (day.isSameOrAfter(seasonStart) && day.isSameOrBefore(seasonEnd)) {
    const dateStr = day.format('YYYYMMDD');
    const existDateDir = await checkDateDir(datePath, dateStr);
    if (!existDateDir) {
      day.add(1, 'days');
      continue;
    }

    if (specifyArg) {
      await doCheck(Number(specifyArg), dateStr);
    } else {
      for (let gameNo = startGameNo; gameNo <= endGameNo; gameNo++) {
        await doCheck(gameNo, dateStr);
      }
    }
    day.add(1, 'days');
  }
  console.log('----- all check finished -----');
};

// Execute
(async () => {
  try {
    await main();
  } catch (err) {
    console.error(err);
  }
})();
