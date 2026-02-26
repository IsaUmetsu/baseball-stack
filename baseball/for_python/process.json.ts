import * as moment from "moment";
import { format } from 'util';

import { OutputJson, TeamInfoJson } from './type/jsonType.d';
import { insertGameInfo, insertLiveHeader, insertLiveBody, insertPitchInfo, insertAwayTeamInfo, insertHomeTeamInfo, executeUpdatePlusOutCount } from './util/db';
import { checkGameDir, getJson, countFiles, checkDateDir } from './util/fs';
import { checkArgDaySeasonEndSpecify, checkArgI } from "./util/display";
import { savePitchData, saveBatAndScoreData, saveText } from "./util/process";
import { teamArray as teams, TOP } from "./constant";
import { getDayInfo } from "./util/day";
import { AppDataSource } from "./util/datasource";
import * as path from "path";
import * as fs from "fs";

const startGameNo = 1;
const endGameNo = 6;
const startSceneCnt = 1;

// const { D, SE, S } = process.env;
// let { targetDay, seasonEndArg, specifyArg } = checkArgDaySeasonEndSpecify(D, SE, S);
// const { YEAR, seasonStart, seasonEnd } = getDayInfo(targetDay, seasonEndArg);

function resolveBaseballDataDir(): string {
  // ① env があれば最優先
  if (process.env.BASEBALL_DATA_DIR) {
    return process.env.BASEBALL_DATA_DIR;
  }

  // ② ローカル実行用の自動推測
  // baseball 配下から実行されている前提
  const candidate = path.resolve(process.cwd(), "..", "py_baseball");

  if (fs.existsSync(candidate)) {
    return candidate;
  }

  // ③ それでも無理なら即失敗
  throw new Error(
    "BASEBALL_DATA_DIR is not set and py_baseball directory was not found"
  );
}
const BASEBALL_DATA_DIR = resolveBaseballDataDir();

const BASE_DIR = BASEBALL_DATA_DIR ?? "/app/py_baseball";

const datePath = path.join(BASE_DIR, "output");
const gamePath = path.join(BASE_DIR, "output", "%s", "%s");
const jsonPath = path.join(BASE_DIR, "output", "%s", "%s", "%s.json");
const cardsJsonPath = path.join(BASE_DIR, "starter", "%s", "%s.json");

/**
 * 
 */
const commitTeamInfo = (topBtm: number, awayTeamInfo: TeamInfoJson, homeTeamInfo: TeamInfoJson) => {
  return topBtm == TOP
    ? homeTeamInfo ? homeTeamInfo.batteryInfo : ''
    : awayTeamInfo ? awayTeamInfo.batteryInfo : ''
  ;
}

/**
 * DB保存実行処理
 */
const saveData = async (scene: number, gameInfoId: number, data: OutputJson) => {
  // get all
  const { liveHeader, liveBody, pitchInfo, homeTeamInfo, awayTeamInfo } = data;

  // if nogame, return
  if (liveHeader.away == undefined) return;

  // insert into `live_header`
  const { ballCount, topBtm } = await insertLiveHeader(gameInfoId, scene, liveHeader);
  // insert into `live_body`
  await insertLiveBody(gameInfoId, scene, liveBody, ballCount, commitTeamInfo(topBtm, awayTeamInfo, homeTeamInfo));
  // insert into `pitch_info`, `pitcher_batter`, `pitch_details`, `pitch_course`
  await insertPitchInfo(gameInfoId, scene, pitchInfo);
  // insert into `battery_info`, `homerun_info`, `team_info`, `game_order`, `bench_master`, `bench_menber_info`
  await insertHomeTeamInfo(gameInfoId, scene, homeTeamInfo);
  await insertAwayTeamInfo(gameInfoId, scene, awayTeamInfo);
};

/**
 * 
 */
const getCardsAndInsert = async (date, gameNo, isNoGame) => {
  const { away, home } = JSON.parse(getJson(format(cardsJsonPath, date, gameNo)));
  return await insertGameInfo(date, teams[away.team], teams[home.team], gameNo, isNoGame);
}

/**
 * 
 */
const doSave = async (gameNo: string, dateStr: string) => {
  // define game no
  // 日付・ゲーム番号ディレクトリがない場合スキップ
  const existGameDir = await checkGameDir(datePath, dateStr, gameNo);
  if (! existGameDir) return;
  // 試合の全シーン数取得
  const sceneCnt = await countFiles(format(gamePath, dateStr, gameNo));
  let isNoGame = false;
  if (sceneCnt > 0) {
    const lastJson: OutputJson = JSON.parse(getJson(format(jsonPath, dateStr, gameNo, sceneCnt)));
    isNoGame = ["試合中止", "ノーゲーム"].includes(lastJson.liveHeader.inning);
  }
  // 対戦カード取得 & insert into `game_info`
  const gameInfoId = await getCardsAndInsert(dateStr, gameNo, isNoGame);

  for (let cnt = startSceneCnt; cnt <= sceneCnt; cnt++) {
    const data = JSON.parse(getJson(format(jsonPath, dateStr, gameNo, cnt)));
    if (data === undefined) continue;

    await saveData(cnt, gameInfoId, data).catch(err => {
      console.log(err);
      console.log(format('----- [game] finished: date: [%s], gameNo: [%s] -----', dateStr, gameNo));
    });
  }
  console.log(format('----- [game] finished: date: [%s], gameNo: [%s] %s -----', dateStr, gameNo, sceneCnt == 0 ? 'but not imported [because not complete game]' : ''));
}

/**
 *
 */
const saveGame = async (
  YEAR: string,
  targetDay: string,
  seasonStart: moment.Moment,
  seasonEnd: moment.Moment,
  specifyArg: number
) => {
  const day = moment(format("%s%s", YEAR, targetDay), "YYYYMMDD");
  while (day.isSameOrAfter(seasonStart) && day.isSameOrBefore(seasonEnd)) {
    // define game date
    const dateStr = day.format("YYYYMMDD");
    // 日付ディレクトリがない場合スキップ
    const existDateDir = await checkDateDir(datePath, dateStr);
    if (! existDateDir) { day.add(1, "days"); continue; }

    if (specifyArg) {
      await doSave(format("0%d", Number(specifyArg)), dateStr);
    } else {
      for (let gameNo = startGameNo; gameNo <= endGameNo; gameNo++) {
        try {
          await doSave(format("0%d", gameNo), dateStr);
        } catch (err) {
          console.log(err)
        }
      }
    }
    day.add(1, "days");
  }
  console.log('----- done!! [game] -----');
};

/**
 * メイン関数
 */
export const execProcessJson = async () => {
  try {
    await AppDataSource.initialize();
    const { D, SE, S, I } = process.env;
    let { targetDay, seasonEndArg, specifyArg } = checkArgDaySeasonEndSpecify(D, SE, S);
    const { YEAR, seasonStart, seasonEnd } = getDayInfo(targetDay, seasonEndArg);
    const { importGame, importText, importPitch, importBat } = checkArgI(I);

    if (importGame) {
      await saveGame(YEAR, targetDay, seasonStart, seasonEnd, specifyArg);
      await executeUpdatePlusOutCount(format("%s%s", YEAR, targetDay), format("%s%s", YEAR, seasonEndArg));
    }

    if (importText) await saveText(YEAR, targetDay, seasonStart, seasonEnd, specifyArg);
    if (importPitch) await savePitchData(YEAR, targetDay, seasonStart, seasonEnd, specifyArg);
    if (importBat) await saveBatAndScoreData(YEAR, targetDay, seasonStart, seasonEnd, specifyArg);
  } catch (err) {
    console.log(err);
  }
}
