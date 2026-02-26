import time
import re
import json
from collections import OrderedDict
import pprint
import datetime
import os

from selenium.common.exceptions import TimeoutException
from selenium.common.exceptions import NoSuchElementException

from selector import getSelector
from config import getConfig, getHawksGameInfo
from driver import getChromeDriver, getFirefoxDriver
from util import Util

def commonWait():
    time.sleep(2)

# driver生成
driver = getFirefoxDriver()
util = Util(driver)

hawksGameInfo = getHawksGameInfo()

for gameDate, gameCnt in hawksGameInfo.items():
    # 試合がない日はスキップ
    if gameCnt == -1:
        continue;

    # シーズン開始日設定
    targetDate = datetime.datetime.strptime("{0}".format(gameDate), "%Y%m%d")

    # 日付ディレクトリ作成
    pathDate = targetDate.strftime("%Y%m%d")
    fullPathDate = "/".join([getConfig("pathBase"), pathDate])
    if not os.path.exists(fullPathDate):
        os.mkdir(fullPathDate)
    # ゲームディレクトリ作成
    gameNo = "0{0}".format(gameCnt)
    fullGamePath = "/".join([getConfig("pathBase"), pathDate, gameNo])
    if not os.path.exists(fullGamePath):
        os.mkdir(fullGamePath)

    #「一球速報」に遷移
    driver.get(getConfig("gameScoreUrl").replace("[dateGameNo]", pathDate + gameNo))
    commonWait()
    # メインコンテンツ
    contentMain = driver.find_element_by_css_selector("#contentMain")
    # 1回表に遷移
    selectorTopOf1 = "#ing_brd tbody tr td:nth-child(2)"
    contentMain.find_element_by_css_selector(selectorTopOf1).click()
    commonWait()
    # ユーティリティ再定義
    util = Util(contentMain)
    scene = 0

    try:
        while 1:
            data = {}
            scene += 1
            startTime = time.time()

            # ------------ ライブヘッダ ------------
            data["liveHeader"] = {
                "inning": util.getText("inning"),
                "away": {
                    "teamInitial": util.getText("teamInitialAway"),
                    "currentScore": util.getText("currentScoreAway")
                },
                "home": {
                    "teamInitial": util.getText("teamInitialHome"),
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

            # 
            if liveBody["battingResult"] == "試合終了" or liveBody["battingResult"] == "試合中止" or liveBody["battingResult"] == "試合前":
                data["liveBody"] = liveBody
                # save as json
                with open("{0}/{1}.json".format(fullGamePath, scene), 'w') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                break
            
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
                "average": util.getText("currentBatterRate")
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

            print("----- done: "\
                "date: {0}, "
                "gameNo: {1}, "\
                "scene: {2:3d}, "\
                "inning: {3}, "\
                "{4}アウト, "\
                "{5:3.1f}[sec]"\
                " -----".format(
                    pathDate,
                    gameNo,
                    scene,
                    data["liveHeader"]["inning"],
                    data["liveHeader"]["count"]["o"],
                    time.time() - startTime
                )
            )

            #「次へ」ボタン押下
            selectorNextButton = "#replay .next a"
            contentMain.find_element_by_css_selector(selectorNextButton).click()
            commonWait()

    except TimeoutException as te:
        print(te)

    util = Util(driver)
