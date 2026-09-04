import { EntityManager } from "typeorm";
import { Scene } from "../../domain/models/scene";
import { ISceneRepository } from "../../domain/repositories/scene-repository.interface";
import {
  LiveHeader,
  LiveBody,
  PitchInfo,
  PitcherBatter,
  PitchDetails,
  PitchCourse,
  BatteryInfo,
  HomerunInfo,
  TeamInfo,
  GameOrder,
  BenchMaster,
  BenchMemberInfo,
} from "../../entities";
import {
  judgePlateAppearance,
  judgeAtBat,
  judgeHit,
  judgeOnbase,
  judgeError,
  judgeFc,
  judgePlayerChange,
  judgeIsBall,
  judgeIsStrike,
  judgePlusScore,
  judgePlusOutCount,
  calcTotalBase,
  indexOfAnd,
} from "../../util/liveBody";
import { teamNameHalfToIni, TOP, BTM, HM, AW } from "../../constant";
import { TeamInfoJson, BenchMemberInfoType } from "../../type/jsonType";

export class TypeORMSceneRepository implements ISceneRepository {
  public async saveAll(gameInfoId: number, scenes: Scene[], manager: EntityManager): Promise<void> {
    if (scenes.length === 0) return;

    // 1. LiveHeader
    const liveHeaderValues = scenes.map((sceneObj) => {
      const { sceneNo, liveHeader } = sceneObj;
      const { inning, away, home, count } = liveHeader;

      const splitInning = inning.split("回");
      let ingNum = Number(splitInning[0]);
      let ingTb = 0;

      if (splitInning[0] === "試合終了") ingNum = 99;
      if (["試合中止", "ノーゲーム", "試合前"].includes(splitInning[0])) ingNum = 0;

      if (splitInning[1] === "表") ingTb = TOP;
      if (splitInning[1] === "裏") ingTb = BTM;

      const pTeam = ingTb === TOP ? home.teamInitial : ingTb === BTM ? away.teamInitial : null;
      const bTeam = ingTb === TOP ? away.teamInitial : ingTb === BTM ? home.teamInitial : null;

      return {
        gameInfoId,
        scene: sceneNo,
        inning,
        awayInitial: away.teamInitial,
        awayScore: Number(away.currentScore),
        homeInitial: home.teamInitial,
        homeScore: Number(home.currentScore),
        countBall: Number(count.b),
        countStrike: Number(count.s),
        countOut: Number(count.o),
        ingNum,
        ingTb,
        pTeam,
        bTeam,
      };
    });

    await manager.createQueryBuilder().insert().into(LiveHeader).values(liveHeaderValues).execute();

    // 2. BatteryInfo and HomerunInfo Cache / In-memory Management
    const batteryMap = new Map<string, number>(); // "pitcher - catcher" -> id
    const homerunMap = new Map<string, number>(); // "homerunInfo" -> id

    const getCurrentPlayer = (allPlayers: string) => {
      const players = allPlayers.split("、");
      return players[players.length - 1];
    };

    // 3. LiveBody
    const liveBodyValues = [];
    for (const sceneObj of scenes) {
      const { sceneNo, liveHeader, liveBody, homeTeamInfo, awayTeamInfo } = sceneObj;
      const { inning } = liveHeader;
      const topBtm = inning.indexOf("表") > -1 ? TOP : inning.indexOf("裏") > -1 ? BTM : 0;
      const commitBatteryInfo =
        topBtm === TOP
          ? homeTeamInfo
            ? homeTeamInfo.batteryInfo
            : ""
          : awayTeamInfo
          ? awayTeamInfo.batteryInfo
          : "";

      const {
        battingResult,
        pitchingResult,
        onbaseInfo,
        currentBatterInfo: cbi,
        currentPicherInfo: cpi,
        nextBatter,
        inningBatterCnt,
      } = liveBody;

      const isPa = judgePlateAppearance(battingResult, cbi ? cbi.name : "");
      const plusOutCount = judgePlusOutCount(battingResult, pitchingResult);
      const b = Number(liveHeader.count.b);
      const s = Number(liveHeader.count.s);
      const o = Number(liveHeader.count.o);

      let currentPitcherOrder: number | null = null;
      if (cpi && commitBatteryInfo) {
        const [pitcher] = commitBatteryInfo.split(" - ");
        currentPitcherOrder = pitcher.split("、").length;
      }

      const bodyVal: any = {
        gameInfoId,
        scene: sceneNo,
        battingResult,
        pitchingResult,
        base1Player: null,
        base2Player: null,
        base3Player: null,
        currentBatterName: cbi ? cbi.name : null,
        currentBatterPlayerNo: cbi ? cbi.playerNo : null,
        currentBatterDomainHand: cbi ? cbi.domainHand : null,
        currentBatterAverage: cbi ? cbi.average : null,
        currentBatterAtBat: cbi ? (isPa ? (cbi.prevResult ? cbi.prevResult.split("、").length + 1 : 1) : null) : null,
        currentPitcherName: cpi ? cpi.name : null,
        currentPitcherPlayerNo: cpi ? cpi.playerNo : null,
        currentPitcherDomainHand: cpi ? cpi.domainHand : null,
        currentPitcherPitch: cpi ? Number(cpi.pitch) : null,
        currentPitcherVsBatterCnt: cpi ? Number(cpi.vsBatterCount) : null,
        currentPitcherEra: cpi ? cpi.pitchERA : null,
        currentPitcherOrder,
        nextBatterName: nextBatter,
        inningBatterCnt,
        prevCountBall: judgeIsBall(battingResult, b),
        prevCountStrike: judgeIsStrike(battingResult, s),
        prevCountOut: o - plusOutCount,
        plusScore: judgePlusScore(battingResult),
        plusOutCount,
        isPa: Number(isPa),
        isAb: Number(judgeAtBat(battingResult, cbi ? cbi.name : "")),
        isHit: Number(judgeHit(battingResult)),
        isOnbase: Number(judgeOnbase(battingResult)),
        isErr: Number(judgeError(battingResult)),
        isFc: Number(judgeFc(battingResult)),
        totalBase: calcTotalBase(battingResult),
        isChangePitcher: Number(judgePlayerChange(battingResult, "継投")),
        isChangeFileder: Number(judgePlayerChange(battingResult, "守備")),
        isChangeBatter: Number(judgePlayerChange(battingResult, "代打")),
        isChangeRunner: Number(judgePlayerChange(battingResult, "代走")),
      };

      if (onbaseInfo) {
        for (const { base, player } of onbaseInfo) {
          if (base === "base1") bodyVal.base1Player = player;
          if (base === "base2") bodyVal.base2Player = player;
          if (base === "base3") bodyVal.base3Player = player;
        }
      }

      liveBodyValues.push(bodyVal);
    }

    await manager.createQueryBuilder().insert().into(LiveBody).values(liveBodyValues).execute();

    // 4. PitchInfo & children
    const validPitchInfoScenes = scenes.filter((s) => s.pitchInfo);
    if (validPitchInfoScenes.length > 0) {
      const pitchInfoValues = validPitchInfoScenes.map((sceneObj) => ({
        gameInfoId,
        scene: sceneObj.sceneNo,
      }));

      const pitchInsertResult = await manager
        .createQueryBuilder()
        .insert()
        .into(PitchInfo)
        .values(pitchInfoValues)
        .execute();

      const pitchInfoIds = pitchInsertResult.identifiers.map((idObj: any) => idObj.id);

      const pbValues = [];
      const pdValues = [];
      const pcValues = [];

      for (let i = 0; i < validPitchInfoScenes.length; i++) {
        const sceneObj = validPitchInfoScenes[i];
        const pitchInfoId = pitchInfoIds[i];
        const { pitchInfo } = sceneObj;

        // PitcherBatter
        const { left, right } = pitchInfo.gameResult;
        pbValues.push({
          pitchInfoId,
          leftTitle: left.title,
          leftName: left.name,
          leftDomainHand: left.domainHand,
          rightTitle: right.title,
          rightName: right.name,
          rightDomainHand: right.domainHand,
        });

        // PitchDetails & PitchCourse
        const pitchCnts: number[] = [];
        for (const detail of pitchInfo.pitchDetails) {
          const { judgeIcon, pitchCnt, pitchType, pitchSpeed, pitchJudgeDetail } = detail;
          pdValues.push({
            pitchInfoId,
            judgeIcon: Number(judgeIcon),
            pitchCnt: Number(pitchCnt),
            pitchType,
            pitchSpeed,
            pitchJudgeDetail,
            isSwing: Number(indexOfAnd(pitchJudgeDetail, ["空", "振"])),
            isMissed: Number(pitchJudgeDetail.indexOf("見") > -1),
          });
          pitchCnts.push(Number(pitchCnt));
        }

        if (pitchInfo.allPitchCourse) {
          for (let idx = 0; idx < pitchInfo.allPitchCourse.length; idx++) {
            const course = pitchInfo.allPitchCourse[idx];
            if (course) {
              pcValues.push({
                pitchInfoId,
                pitchCnt: pitchCnts[idx],
                top: Number(course.top),
                left: Number(course.left),
              });
            }
          }
        }
      }

      if (pbValues.length > 0) {
        await manager.createQueryBuilder().insert().into(PitcherBatter).values(pbValues).execute();
      }
      if (pdValues.length > 0) {
        await manager.createQueryBuilder().insert().into(PitchDetails).values(pdValues).execute();
      }
      if (pcValues.length > 0) {
        await manager.createQueryBuilder().insert().into(PitchCourse).values(pcValues).execute();
      }
    }

    // 5. BatteryInfo & HomerunInfo inserts
    for (const sceneObj of scenes) {
      const { homeTeamInfo, awayTeamInfo } = sceneObj;
      const teamInfosToProcess = [homeTeamInfo, awayTeamInfo].filter(Boolean);

      for (const tInfo of teamInfosToProcess) {
        if (!tInfo) continue;
        const { batteryInfo, homerunInfo } = tInfo;

        if (batteryInfo && !batteryMap.has(batteryInfo)) {
          const [pitcher, catcher] = batteryInfo.split(" - ");
          let savedBattery = await manager.getRepository(BatteryInfo).findOne({
            where: { gameInfoId, pitcher, catcher },
          });

          if (!savedBattery) {
            savedBattery = new BatteryInfo();
            savedBattery.gameInfoId = gameInfoId;
            savedBattery.scene = sceneObj.sceneNo;
            savedBattery.currentP = getCurrentPlayer(pitcher);
            savedBattery.currentC = getCurrentPlayer(catcher);
            savedBattery.pitcher = pitcher;
            savedBattery.catcher = catcher;
            await manager.save(savedBattery);
          }
          batteryMap.set(batteryInfo, savedBattery.id);
        }

        if (homerunInfo && !homerunMap.has(homerunInfo)) {
          let savedHomerun = await manager.getRepository(HomerunInfo).findOne({
            where: { gameInfoId, homerun: homerunInfo },
          });

          if (!savedHomerun) {
            savedHomerun = new HomerunInfo();
            savedHomerun.gameInfoId = gameInfoId;
            savedHomerun.scene = sceneObj.sceneNo;
            savedHomerun.homerun = homerunInfo;
            await manager.save(savedHomerun);
          }
          homerunMap.set(homerunInfo, savedHomerun.id);
        }
      }
    }

    // 6. TeamInfo & children
    const teamInfoValues: any[] = [];
    const teamInsertParams: { sceneObj: Scene; tInfo: TeamInfoJson; homeAway: string }[] = [];

    for (const sceneObj of scenes) {
      const { sceneNo, homeTeamInfo, awayTeamInfo } = sceneObj;
      if (homeTeamInfo) {
        const bId = homeTeamInfo.batteryInfo ? batteryMap.get(homeTeamInfo.batteryInfo) || null : null;
        const hId = homeTeamInfo.homerunInfo ? homerunMap.get(homeTeamInfo.homerunInfo) || null : null;
        teamInfoValues.push({
          gameInfoId,
          scene: sceneNo,
          homeAway: HM,
          teamName: homeTeamInfo.name,
          teamInitialKana: teamNameHalfToIni[homeTeamInfo.name] || null,
          batteryInfoId: bId,
          homerunInfoId: hId,
        });
        teamInsertParams.push({ sceneObj, tInfo: homeTeamInfo, homeAway: HM });
      }
      if (awayTeamInfo) {
        const bId = awayTeamInfo.batteryInfo ? batteryMap.get(awayTeamInfo.batteryInfo) || null : null;
        const hId = awayTeamInfo.homerunInfo ? homerunMap.get(awayTeamInfo.homerunInfo) || null : null;
        teamInfoValues.push({
          gameInfoId,
          scene: sceneNo,
          homeAway: AW,
          teamName: awayTeamInfo.name,
          teamInitialKana: teamNameHalfToIni[awayTeamInfo.name] || null,
          batteryInfoId: bId,
          homerunInfoId: hId,
        });
        teamInsertParams.push({ sceneObj, tInfo: awayTeamInfo, homeAway: AW });
      }
    }

    if (teamInfoValues.length > 0) {
      const teamInsertResult = await manager
        .createQueryBuilder()
        .insert()
        .into(TeamInfo)
        .values(teamInfoValues)
        .execute();

      const teamInfoIds = teamInsertResult.identifiers.map((idObj: any) => idObj.id);

      const goValues = [];
      const bmValues = [];
      const bmiValues = [];

      // Track bench master member counts per team for sequential comparison
      const lastBenchMemberCountMap = new Map<string, number>();

      for (let i = 0; i < teamInsertParams.length; i++) {
        const { sceneObj, tInfo, homeAway } = teamInsertParams[i];
        const teamInfoId = teamInfoIds[i];

        // GameOrder
        if (tInfo.order) {
          for (const order of tInfo.order) {
            goValues.push({
              teamInfoId,
              orderNo: Number(order.no),
              position: order.position,
              name: order.name,
              domainHand: order.domainHand,
              average: order.average,
            });
          }
        }

        // BenchMaster & BenchMemberInfo
        const { benchPitcher: p, benchCatcher: c, benchInfielder: iList, benchOutfielder: o } = tInfo;
        const currentMemberCount = p.length + c.length + iList.length + o.length;

        bmValues.push({
          gameInfoId,
          scene: sceneObj.sceneNo,
          teamInfoId,
          teamName: tInfo.name,
          memberCount: currentMemberCount,
        });

        // Determine if we should save bench member info (initial scene or decreased member count)
        const lastCount = lastBenchMemberCountMap.get(tInfo.name);
        if (lastCount === undefined || currentMemberCount < lastCount) {
          const addBenchMember = (position: string, member: BenchMemberInfoType) => {
            bmiValues.push({
              teamInfoId,
              position,
              playerName: member.name,
              domainHand: member.domainHand,
              average: member.average,
            });
          };

          for (const member of p) addBenchMember("投手", member);
          for (const member of c) addBenchMember("捕手", member);
          for (const member of iList) addBenchMember("内野手", member);
          for (const member of o) addBenchMember("外野手", member);
        }

        lastBenchMemberCountMap.set(tInfo.name, currentMemberCount);
      }

      if (goValues.length > 0) {
        await manager.createQueryBuilder().insert().into(GameOrder).values(goValues).execute();
      }
      if (bmValues.length > 0) {
        await manager.createQueryBuilder().insert().into(BenchMaster).values(bmValues).execute();
      }
      if (bmiValues.length > 0) {
        await manager.createQueryBuilder().insert().into(BenchMemberInfo).values(bmiValues).execute();
      }
    }
  }
}
