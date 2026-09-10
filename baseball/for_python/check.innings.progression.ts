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
 * イニング文字列を数値表現に変換する
 * "1回表" -> 10, "1回裏" -> 15, "2回表" -> 20, ...
 */
const inningToNumber = (inning: string): number => {
    if (inning.includes("試合終了") || inning.includes("試合中止") || inning.includes("ノーゲーム")) return 999;
    
    const inningMatch = inning.match(/(\d+)回/);
    if (!inningMatch) return -1;
    
    const inningNum = parseInt(inningMatch[1], 10);
    const isUra = inning.includes("裏");
    
    return inningNum * 10 + (isUra ? 5 : 0);
}

const doCheck = async (gameNo, dateStr) => {
  const targetGameNo = format('0%d', gameNo);
  const existGameDir = await checkGameDir(datePath, dateStr, targetGameNo);
  if (!existGameDir) return;

  const sceneCnt = await countFiles(format(gamePath, dateStr, targetGameNo));
  if (sceneCnt === 0) return;

  let prevInningNum = 0;
  let prevOutCount = 0;

  for (let sceneNo = startSceneCnt; sceneNo <= sceneCnt; sceneNo++) {
    const data = await getData(sceneNo, dateStr, targetGameNo);
    const { liveHeader } = data;

    if (!liveHeader) {
      console.error(`[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - liveHeader is missing.`);
      continue;
    }

    const { inning, bso } = liveHeader;
    const currentInningNum = inningToNumber(inning);
    const currentOutCount = bso ? Number(bso.o) : 0;

    if (sceneNo > 1) {
      // イニング進行チェック
      if (currentInningNum < prevInningNum) {
        console.error(`[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - イニングが戻っています: ${prevInningNum} -> ${currentInningNum}`);
      } else if (currentInningNum > prevInningNum) {
        // イニングが進んだ場合
        const diff = currentInningNum - prevInningNum;
        if (diff > 5) {
            console.error(`[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - イニングが飛んでいます: ${prevInningNum} -> ${currentInningNum}`);
        }
        if (prevOutCount < 3 && prevInningNum < 999) {
             // 3アウト未満でのチェンジを許容するのは、前のイニングが試合終了などでない場合
             if (inningToNumber(inning) > prevInningNum) {
                // console.warn(`[WARN] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo-1} - 3アウト未満でチェンジしました: ${prevOutCount}アウト`);
             }
        }
        prevOutCount = 0; // イニングが変わったらアウトカウントリセット
      }

      // アウトカウント進行チェック
      if (currentInningNum == prevInningNum) { // 同じイニング内
        if (currentOutCount < prevOutCount) {
          console.error(`[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - アウトカウントが減少しました: ${prevOutCount} -> ${currentOutCount}`);
        }
        if (currentOutCount > prevOutCount + 1) {
          console.error(`[ERROR] date: ${dateStr}, gameNo: ${targetGameNo}, sceneNo: ${sceneNo} - アウトカウントが飛んでいます: ${prevOutCount} -> ${currentOutCount}`);
        }
      }
    }
    
    prevInningNum = currentInningNum;
    prevOutCount = currentOutCount;
  }
  
  const lastJson = await getData(sceneCnt, dateStr, targetGameNo);
  if (["試合終了", "試合中止", "ノーゲーム"].includes(lastJson.liveHeader.inning)) {
    console.log(`[OK] date: ${dateStr}, gameNo: ${targetGameNo} - progression complete.`);
  } else {
    console.warn(`[WARN] date: ${dateStr}, gameNo: ${targetGameNo} - 試合が終了していません: ${lastJson.liveHeader.inning}`);
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
    console.log(err);
  }
})();
