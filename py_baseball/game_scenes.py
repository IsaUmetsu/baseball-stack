import time
import re
import json
from collections import OrderedDict
import pprint
import datetime
import os
import argparse

from selenium.common.exceptions import TimeoutException
from selenium.common.exceptions import NoSuchElementException

from selector import getSelector
from config import getConfig, getLeague2021, isTokyoOlympicsPeriod
from driver import getChromeDriver, getFirefoxDriver
from util import Util
from common import getGameNos, commonWait

parser = argparse.ArgumentParser(prog="blowser", add_help=True)
parser.add_argument('-ss', '--season-start', type=str, default=datetime.datetime.now().strftime("%m%d"))
parser.add_argument('-se', '--season-end', type=str, default=datetime.datetime.now().strftime("%m%d"))
parser.add_argument('-s', '--specify', nargs='+', type=str)
parser.add_argument('-e', '--exclude', nargs='+', type=str)
args = parser.parse_args()

def getInningSelector(inning, topBtm):
    topBtmDic = { "表": 1, "裏": 2 }
    return getSelector("inningBase").format(topBtmDic[topBtm], inning + 1)

# driver生成
driver = getFirefoxDriver()
util = Util(driver)
# シーズン開始日設定
targetDate = datetime.datetime.strptime("2023" + args.season_start, "%Y%m%d")
dateEnd = datetime.datetime.strptime("2023" + args.season_end, "%Y%m%d")

print("----- current time: {0} -----".format(datetime.datetime.now().strftime("%Y/%m/%d %H:%M:%S")))

try:
    while targetDate <= dateEnd:
        # 指定日の[日程・結果]画面へ遷移
        driver.get(getConfig("scheduleUrl").replace("[date]", targetDate.strftime("%Y-%m-%d")))
        commonWait()

        gameNos = []
        try:
            gameNos = getGameNos(util, targetDate)
        except KeyError:
            print ("not exist gameNo, date: {0}".format(targetDate.strftime("%m%d")))
            targetDate = targetDate + datetime.timedelta(days=1)
            continue

        for idx, gameNoStr in enumerate(gameNos):
            # 日付ディレクトリ作成
            dateStr = targetDate.strftime("%Y%m%d")
            fullPathDate = "/".join([getConfig("pathBase"), dateStr])
            if not os.path.exists(fullPathDate):
                os.mkdir(fullPathDate)

            # ゲーム番号生成
            gameNo = str(idx + 1)
            # 特定試合 指定時
            if args.specify:
                if gameNo not in args.specify:
                    continue
            # 特定試合 除外時
            if args.exclude:
                if gameNo in args.exclude:
                    continue
            # ゲーム番号再生成
            gameNo = "0" + gameNo

            fullGamePath = "/".join([getConfig("pathBase"), dateStr, gameNo])
            if not os.path.exists(fullGamePath):
                os.mkdir(fullGamePath)

            # URL一部分作成 (2023年もURLは2021のままのため)
            dateGameNo = "2021" + gameNoStr

            #「一球速報」に遷移
            scoreUrl = getConfig("gameScoreUrl").replace("npb", "npb_practice") if isTokyoOlympicsPeriod(targetDate) else getConfig("gameScoreUrl")
            driver.get(scoreUrl.replace("[dateGameNo]", dateGameNo))
            commonWait()
            # メインコンテンツ
            contentMain = ""
            try:
                contentMain = driver.find_element_by_css_selector("#contentMain")
            except:
                print("----- not found game gameNo: {0}, page: {1} -----".format(gameNo, gameNoStr))
                continue

            # ユーティリティ再定義 (対象セレクタを限定させる (driver → contentMain))
            util = Util(contentMain)
            teamInitialAway = util.getText("teamInitialAway")
            teamInitialHome = util.getText("teamInitialHome")
            # ソフトバンク戦以外は一旦除外 (23/9/23追記)
            # if teamInitialAway != 'ソ' and teamInitialHome != 'ソ':
            # # ソフトバンク戦は一旦除外 (23/9/24追記)
            # if teamInitialAway == 'ソ' or teamInitialHome == 'ソ':
            #     print("----- skip game: {0}, away {1} vs {2} home -----".format(gameNo, teamInitialAway, teamInitialHome))
            #     continue
            # 一球速報 初期遷移時のイニング
            currentInningTopBtm = util.getText("inning")
            print("----- game: {0}, currentInningTopBtm: {1} -----".format(gameNo, currentInningTopBtm))

            # 取得対象(開始) 初期値設定
            fromInning = 1
            fromTopBtm = "表"
            # 取得対象(終了) 初期値設定
            toInning = 0
            toTopBtm = ""
            # ファイル一覧を取得 (隠しファイルは削除)
            files = os.listdir(fullGamePath)
            if '.DS_Store' in files:
                files.remove('.DS_Store')
            fileCount = len(files)

            # 初期遷移時が 試合前、試合中止、ノーゲーム の場合は保存せず次の試合へ
            if currentInningTopBtm in ["試合前", "試合中止", "ノーゲーム"]:
                with open("{0}/1.json".format(fullGamePath), 'w') as f:
                    json.dump({"liveHeader": {"inning": currentInningTopBtm }}, f, indent=2, ensure_ascii=False)
                continue
            # 初期遷移時が 試合終了 以外の場合
            if currentInningTopBtm not in ["試合終了"]:
                # 取得対象(終了) のイニング決定
                currentInning, currentTopBtm = currentInningTopBtm.split("回")
                toInning = int(currentInning)
                toTopBtm = currentTopBtm

            # 過去に保存済みの場合
            if fileCount > 0:
                # 取得対象(開始) のイニング決定
                jsonOpen = open("{0}/{1}.json".format(fullGamePath, fileCount))
                loadedJson = json.load(jsonOpen)
                # 保存済みの最新イニング
                savedLatestInningTopBtm = loadedJson["liveHeader"]["inning"]
                print("----- game: {0}, savedLatestInningTopBtm: {1} -----".format(gameNo, savedLatestInningTopBtm))
                # 試合終了まで取得済みの場合、保存対象外
                if savedLatestInningTopBtm in ["試合終了", "試合中止", "ノーゲーム"]:
                    continue
                elif savedLatestInningTopBtm in ["試合前"]:
                    # ファイルカウントを0に戻す
                    fileCount = 0
                    print('not start game')
                # 試合途中まで取得済みの場合
                else:
                    currentInning, currentTopBtm = savedLatestInningTopBtm.split("回")
                    fromInning = int(currentInning)
                    # 
                    if currentTopBtm == "表":
                        # 2回表〜9回表の場合は「裏」にする
                        fromTopBtm = "裏"
                    # 2回裏〜9回裏の場合は、1つイニングを進めて「表」にする
                    elif currentTopBtm == "裏":
                        fromInning = fromInning + 1
                        fromTopBtm = "表"

            # 指定のイニングに遷移
            selectorInning = getInningSelector(fromInning, fromTopBtm)
            contentMain.find_element_by_css_selector(selectorInning).click()
            commonWait()

            # 取得対象(開始) 1回裏以降の場合
            if fromInning > 1 or fromTopBtm == "裏":
                #「戻る」ボタン押下
                selectorPrevButton = "#replay .back a"
                contentMain.find_element_by_css_selector(selectorPrevButton).click()
                commonWait()
                while 1:
                    # 現在の打者数
                    currentBatterCnt = util.getText("inningBatterCnt")
                    # 投手変更、守備変更がない場合
                    if len(currentBatterCnt) > 0:
                        #「次へ」ボタン押下
                        selectorNextButton = "#replay .next a"
                        contentMain.find_element_by_css_selector(selectorNextButton).click()
                        commonWait()
                        # シート変更の初期シーンに移動したら抜ける
                        break
                    # 依然シートの変更がある場合は「戻る」ボタン押下
                    else:
                        contentMain.find_element_by_css_selector(selectorPrevButton).click()
                        commonWait()   

            # 処理開始シーン定義
            scene = fileCount

            try:
                while 1:
                    data = {}
                    scene += 1
                    startTime = time.time()

                    # ------------ ライブヘッダ ------------
                    data["liveHeader"] = {
                        "inning": util.getText("inning"),
                        "away": {
                            "teamInitial": teamInitialAway,
                            "currentScore": util.getText("currentScoreAway")
                        },
                        "home": {
                            "teamInitial": teamInitialHome,
                            "currentScore": util.getText("currentScoreHome")
                        },
                        "count": {
                            "b": len(util.getText("countBall")),
                            "s": len(util.getText("countStrike")),
                            "o": len(util.getText("countOut"))
                        }
                    }
                    # ------------ /ライブヘッダ ------------

                    # ------------ ライブボディ ------------
                    liveBody = {}
                    # 打撃結果概要欄
                    liveBody["battingResult"] = util.getText("battingResult")
                    liveBody["pitchingResult"] = util.getText("pitchingResult")

                    # 取得対象が存在しない場合、保存して終了
                    if liveBody["battingResult"] in ["試合終了", "試合中止", "試合前"]:
                        data["liveBody"] = liveBody
                        # save as json
                        with open("{0}/{1}.json".format(fullGamePath, scene), 'w') as f:
                            json.dump(data, f, indent=2, ensure_ascii=False)
                        break

                    # 取得対象(終了) が存在する場合
                    if toInning > 0 and len(toTopBtm) > 0:
                        # 取得対象範囲を超えた場合、保存せず終了
                        currentInning, currentTopBtm = data["liveHeader"]["inning"].split("回")
                        if int(currentInning) == toInning and currentTopBtm == toTopBtm:
                            break;

                    # 塁状況
                    onbaseInfoElem = util.getElems("onbaseInfo")
                    onbaseInfo = []
                    for elem in onbaseInfoElem:
                        onbaseInfo.append({
                            "base": elem.get_attribute("id"),
                            "player": elem.text
                        })
                    liveBody["onbaseInfo"] = onbaseInfo

                    # ボールリスト概要 ("#dakyu .bottom #nxt_batt .balllist") は省略
                    # 現在打者概要
                    liveBody["currentBatterInfo"] = {
                        "name": util.getText("currentBatterName"),
                        "playerNo": util.getText("currentBatterPlayerNo"),
                        "domainHand": util.getText("currentBatterDomainHand"),
                        "average": util.getText("currentBatterRate"),
                        "prevResult": util.getText("currentBatterPrevResult"),
                    }
                    # 登板投手概要
                    liveBody["currentPicherInfo"] = {
                        "name": util.getText("currentPitcherName"),
                        "playerNo": util.getText("currentPitcherPlayerNo"),
                        "domainHand": util.getText("currentPitcherHand"),
                        "pitch": util.getText("currentPitchCount"),
                        "vsBatterCount": util.getText("currentPitcherVSBatterCount"),
                        "pitchERA": util.getText("currentPitchERA"),
                    }
                    # 次の打者
                    liveBody["nextBatter"] = util.getText("nextBatter")
                    # イニング打者数
                    liveBody["inningBatterCnt"] = util.getText("inningBatterCnt")

                    data["liveBody"] = liveBody
                    # ------------ /ライブボディ ------------

                    commonWait() # liveheader, livebody 取得後に wait

                    pitchInfo = {}
                    # 投球詳細
                    pitchDetailsElem = util.getElems("pitchDetail")
                    pitchDetails = []
                    for elem in pitchDetailsElem:
                        pitchDetails.append({
                            "judgeIcon": util.getSpecifyClass(elem, "tr td:nth-child(1) span").split(" ")[1][-1:],
                            "pitchCnt": util.getSpecifyText(elem, "tr td:nth-child(2)"),
                            "pitchType": util.getSpecifyText(elem, "tr td:nth-child(3)"),
                            "pitchSpeed": util.getSpecifyText(elem, "tr td:nth-child(4)"),
                            "pitchJudgeDetail": util.getSpecifyText(elem, "tr td:nth-child(5)")
                        })
                    pitchInfo["pitchDetails"] = pitchDetails

                    # 投球コース
                    pitchDetailsCourseElem = util.getElems("pitchingCourse")
                    allPitchCourse = []
                    #
                    for course in pitchDetailsCourseElem:
                        courseDetailNum = re.findall(r'-?\d+', course.get_attribute("style"))
                        # 0: top, 1: left
                        allPitchCourse.append({
                            "top": courseDetailNum[0],
                            "left": courseDetailNum[1]
                        })

                    pitchInfo["allPitchCourse"] = allPitchCourse

                    def getGameResult(leftOrRight):
                        return {
                            "title": util.getText("gameResult" + leftOrRight + "Title"),
                            "name": util.getText("gameResult" + leftOrRight + "Name"),
                            "domainHand": util.getText("gameResult" + leftOrRight + "DomainHand"),
                        }

                    # 対戦相手詳細
                    pitchInfo["gameResult"] = {
                        "left": getGameResult("Left"),
                        "right": getGameResult("Right"),
                    }

                    data["pitchInfo"] = pitchInfo

                    def createTeamInfo(homeAway):
                        teamInfo = {}
                        # チーム名
                        teamInfo["name"] = util.getTeamText(homeAway, "teamName")
                        # 現在のオーダー
                        teamOrder = []
                        teamOrdeElem = util.getTeamElems(homeAway, "teamOrder")
                        for elem in teamOrdeElem:
                            if len(util.getSpecifyElems(elem, "td")) > 0:
                                teamOrder.append({
                                    "no": util.getSpecifyText(elem, "tr td:nth-child(1)"),
                                    "position": util.getSpecifyText(elem, "tr td:nth-child(2)"),
                                    "name": util.getSpecifyText(elem, "tr td:nth-child(3) a"),
                                    "domainHand": util.getSpecifyText(elem, "tr td:nth-child(4)"),
                                    "average": util.getSpecifyText(elem, "tr td:nth-child(5)")
                                })
                        teamInfo["order"] = teamOrder
                        # バッテリー
                        battelyInfoElem = util.getTeamElems(homeAway, "teamBattery")
                        battelyInfo = ""
                        for elem in battelyInfoElem:
                            battelyInfo += elem.text
                        teamInfo["batteryInfo"] = battelyInfo
                        # 本塁打
                        homerunInfoElem = util.getTeamElems(homeAway, "teamHomerun")
                        homerunInfo = ""
                        for elem in homerunInfoElem:
                            homerunInfo += elem.text
                        teamInfo["homerunInfo"] = homerunInfo

                        def createBenchMemberInfo(memgersElem):
                            benchMemberInfo = []
                            for elem in memgersElem:
                                if elem.get_attribute("class") == "bb-splitsTable__row":
                                    benchMemberInfo.append({
                                        "name": util.getSpecifyText(elem, "tr td:nth-child(1) a"),
                                        "domainHand": util.getSpecifyText(elem, "tr td:nth-child(2)"),
                                        "average": util.getSpecifyText(elem, "tr td:nth-child(3)")
                                    })
                            return benchMemberInfo

                        # ベンチ入りメンバー(投手)
                        teamInfo["benchPitcher"] = createBenchMemberInfo(util.getTeamElems(homeAway, "benchPitcherInfo"))
                        # ベンチ入りメンバー(捕手)
                        teamInfo["benchCatcher"] = createBenchMemberInfo(util.getTeamElems(homeAway, "benchCatcherInfo"))
                        # ベンチ入りメンバー(内野手)
                        teamInfo["benchInfielder"] = createBenchMemberInfo(util.getTeamElems(homeAway, "benchInfielderInfo"))
                        # ベンチ入りメンバー(外野手)
                        teamInfo["benchOutfielder"] = createBenchMemberInfo(util.getTeamElems(homeAway, "benchOutfielderInfo"))

                        return teamInfo
                    
                    data["homeTeamInfo"] = createTeamInfo("homeTeamElemId")
                    data["awayTeamInfo"] = createTeamInfo("awayTeamElemId")

                    # save as json
                    with open("{0}/{1}.json".format(fullGamePath, scene), 'w') as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)

                    print("----- [done] date: {0}, gameNo: {1}, scene: {2:3d}, inning: {3}, {4}アウト, {5:3.1f}[sec] -----".format(
                        dateStr,
                        gameNo,
                        scene,
                        data["liveHeader"]["inning"],
                        data["liveHeader"]["count"]["o"],
                        time.time() - startTime
                    ))

                    #「次へ」ボタン押下
                    selectorNextButton = "#replay .next a"
                    contentMain.find_element_by_css_selector(selectorNextButton).click()
                    commonWait()

            except TimeoutException as te:
                print(te)
                print("----- [error] date: {0}, gameNo: {1}, scene: {2:3d}, inning: {3}, {4}アウト, {5:3.1f}[sec] -----".format(
                    dateStr,
                    gameNo,
                    scene,
                    data["liveHeader"]["inning"],
                    data["liveHeader"]["count"]["o"],
                    time.time() - startTime
                ))

        targetDate = targetDate + datetime.timedelta(days=1)
        util = Util(driver)

    driver.close()
    driver.quit()
    print("----- finished time: {0} -----\n\n".format(datetime.datetime.now().strftime("%Y/%m/%d %H:%M:%S")))

except:
    driver.close()
    driver.quit()

    import traceback
    traceback.print_exc()
