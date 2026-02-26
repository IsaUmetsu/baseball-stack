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
from config import getConfig, getTeamInitial, getTeamInitialByFullName, isTokyoOlympicsPeriod
from driver import getChromeDriver, getFirefoxDriver
from util import Util
from common import getGameNos, commonWait

parser = argparse.ArgumentParser(prog="blowser", add_help=True)
parser.add_argument('-ss', '--season-start', type=str, default=datetime.datetime.now().strftime("%m%d"))
parser.add_argument('-se', '--season-end', type=str, default=datetime.datetime.now().strftime("%m%d"))
parser.add_argument('-s', '--specify', nargs='+', type=str)
parser.add_argument('-e', '--exclude', nargs='+', type=str)
args = parser.parse_args()

# driver生成
driver = getFirefoxDriver()
# シーズン開始日設定
targetDate = datetime.datetime.strptime("2023" + args.season_start, "%Y%m%d")
dateEnd = datetime.datetime.strptime("2023" + args.season_end, "%Y%m%d")

def createPitchStatsDetail(rows):
    statsTupleList = []
    if isTokyoOlympicsPeriod(targetDate):
        params = ["name", "ip", "np", "bf", "ha", "hra", "so", "bb", "hbp", "balk", "ra", "er"]
    else:
        if len(rows) == 14: # 試合終了後
            params = ["result", "name", "era", "ip", "np", "bf", "ha", "hra", "so", "bb", "hbp", "balk", "ra", "er"]
        else: # 試合中
            statsTupleList.append(("result", "")) # 結果は未定であるため空欄で設定
            params = ["name", "era", "ip", "np", "bf", "ha", "hra", "so", "bb", "hbp", "balk", "ra", "er"]
    
    for idx, param in enumerate(params):
        statsTupleList.append((param, rows[idx].text))
    return dict(statsTupleList)

def createPitchStats(pitchStatusElem):
    pitchStats = []
    for pitchStat in pitchStatusElem:
        rows = pitchStat.find_elements_by_css_selector("tr td")
        pitchStats.append(createPitchStatsDetail(rows))
    return pitchStats

def createBatStatsDetail(cols):
    statsTupleList = []
    if isTokyoOlympicsPeriod(targetDate):
        params = ["position", "name", "ab", "run", "hit", "rbi", "so", "bb", "hbp", "sh", "sb", "e", "hr", "ing1", "ing2", "ing3", "ing4", "ing5", "ing6", "ing7", "ing8", "ing9"]
    else:
        params = ["position", "name", "ave", "ab", "run", "hit", "rbi", "so", "bb", "hbp", "sh", "sb", "e", "hr", "ing1", "ing2", "ing3", "ing4", "ing5", "ing6", "ing7", "ing8", "ing9"]
    if len(cols) > 23:
        params.append("ing10")

    for idx, param in enumerate(params):
        statsTupleList.append((param, cols[idx].text))
    return dict(statsTupleList)

def createBatStats(statusElems):
    stats = []
    for statusElem in statusElems:
        cols = statusElem.find_elements_by_css_selector("tr td")
        if len(cols) >= 14:
            stats.append(createBatStatsDetail(cols))
    return stats

def createScoreBoard(scoreBoardElems):
    scoreBoardTupleList = []
    params = ["total", "ing1", "ing2", "ing3", "ing4", "ing5", "ing6", "ing7", "ing8", "ing9"]
    if len(scoreBoardElems) > 10:
        params.append("ing10")

    for idx, param in enumerate(params):
        scoreBoardTupleList.append((param, scoreBoardElems[idx].text))
    return dict(scoreBoardTupleList)

print("----- current time: {0} -----".format(datetime.datetime.now().strftime("%Y/%m/%d %H:%M:%S")))

try:
    while targetDate <= dateEnd:
        util = Util(driver)
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
            startTime = time.time()
            # 日付ディレクトリ作成 (pitch)
            dateStr = targetDate.strftime("%Y%m%d")
            fullPathDate = "/".join([getConfig("pathPitcherStats"), dateStr])
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

            # URL一部分作成 (2023年もURLは2021のままのため)
            dateGameNo = "2021" + gameNoStr

            # 指定試合の[トップ]画面へ遷移
            topUrl = getConfig("gameTopUrl").replace("npb", "npb_practice") if isTokyoOlympicsPeriod(targetDate) else getConfig("gameTopUrl")
            driver.get(topUrl.replace("[dateGameNo]", dateGameNo))
            commonWait()

            gameState = ""
            isFinished = False
            try:
                gameStateElem = driver.find_element_by_css_selector(getSelector("gameState"))
                gameState = gameStateElem.get_attribute("textContent")
                gameState.strip()
                isFinished = gameState in ["試合終了", "試合中止", "ノーゲーム"]
            except:
                print("----- not found game gameNo: {0}, page: {1} -----".format(gameNo, gameNoStr))
                continue

            # 指定試合の[出場成績]画面へ遷移
            statsUrl = getConfig("gameStatsUrl").replace("npb", "npb_practice") if isTokyoOlympicsPeriod(targetDate) else getConfig("gameStatsUrl")
            driver.get(statsUrl.replace("[dateGameNo]", dateGameNo))
            commonWait()

            contentMain = driver.find_element_by_css_selector("#gm_stats")
            util = Util(contentMain)

            awayTeam = getTeamInitialByFullName(util.getText("awayTeamFullName"))
            homeTeam = getTeamInitialByFullName(util.getText("homeTeamFullName"))
            # ソフトバンク戦以外は一旦除外 (23/9/23追記)
            # if awayTeam != 'H' and homeTeam != 'H':
            # ソフトバンク戦は一旦除外 (23/9/24追記)
            # if awayTeam == 'H' or homeTeam == 'H':
                # print("----- skip game: {0}, away {1} vs {2} home -----".format(gameNo, awayTeam, homeTeam))
                # continue
            # pitch stats
            awayPitchStats = createPitchStats(util.getElems("awayPitchStats"))
            homePitchStats = createPitchStats(util.getElems("homePitchStats"))

            awayInfo = { "team": awayTeam, "stats": awayPitchStats }
            homeInfo = { "team": homeTeam, "stats": homePitchStats }

            data = { "away": awayInfo, "home": homeInfo, "isFinished": isFinished }
            # save as json
            with open("{0}/{1}.json".format(fullPathDate, gameNo), 'w') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            print("----- [done][pitch] date: {0}, gameNo: {1}, {2} vs {3}, {4:3.1f}[sec] -----".format(
                    dateStr, gameNo, awayTeam, homeTeam, time.time() - startTime))

            ### bat
            startTime = time.time()
            # 日付ディレクトリ作成 (bat)
            fullPathDate = "/".join([getConfig("pathBatterStats"), dateStr])
            if not os.path.exists(fullPathDate):
                os.mkdir(fullPathDate)
            # bat stats
            awayBatStats = createBatStats(util.getElems("awayBatStats"))
            homeBatStats = createBatStats(util.getElems("homeBatStats"))
            awayScoreBoard = createScoreBoard(util.getElems("awayScoreBoard"))
            homeScoreBoard = createScoreBoard(util.getElems("homeScoreBoard"))

            awayInfo = { "team": awayTeam, "stats": awayBatStats, "scoreBoard": awayScoreBoard }
            homeInfo = { "team": homeTeam, "stats": homeBatStats, "scoreBoard": homeScoreBoard }

            data = { "away": awayInfo, "home": homeInfo, "isFinished": isFinished }
            # save as json
            with open("{0}/{1}.json".format(fullPathDate, gameNo), 'w') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print("----- [done]  [bat] date: {0}, gameNo: {1}, {2} vs {3}, {4:3.1f}[sec] -----".format(
                    dateStr, gameNo, awayTeam, homeTeam, time.time() - startTime))

            ### text
            startTime = time.time()
            # 日付ディレクトリ作成
            fullPathDate = "/".join([getConfig("pathTextStats"), dateStr])
            if not os.path.exists(fullPathDate):
                os.mkdir(fullPathDate)
            # 指定試合の[テキスト速報]画面へ遷移
            textUrl = getConfig("gameTextUrl").replace("npb", "npb_practice") if isTokyoOlympicsPeriod(targetDate) else getConfig("gameTextUrl")
            driver.get(textUrl.replace("[dateGameNo]", dateGameNo))
            commonWait()
            # 範囲限定
            contentMain = driver.find_element_by_css_selector("#text_live")
            util = Util(contentMain)

            data = []

            # 1回表・1回裏など
            for orderListElem in util.getElems("batResult"):
                orderListUtil = Util(orderListElem)
                batResultUnits = orderListUtil.getElems("batResultUnit")
                # 打者1人ずつ情報
                for batResultUnit in batResultUnits:
                    batResultUnitUtil = Util(batResultUnit)
                    summaryPoints = batResultUnitUtil.getElems("summaryPoint")
                    if summaryPoints:
                        # 得点ごと
                        for summaryPoint in summaryPoints:
                            data.append({
                                "inning": orderListUtil.getText("batResultInning"),
                                "team": orderListUtil.getText("batResultTeam"),
                                "no": batResultUnitUtil.getText("batResultUnitNo"),
                                "order": batResultUnitUtil.getText("batResultUnitOrder"),
                                "batter": batResultUnitUtil.getText("batResultUnitBatter"),
                                "detail": summaryPoint.text
                            })

            # save as json
            with open("{0}/{1}.json".format(fullPathDate, gameNo), 'w') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print("----- [done] [text] date: {0}, gameNo: {1}, {2} vs {3}, {4:3.1f}[sec] -----".format(
                    dateStr, gameNo, awayTeam, homeTeam, time.time() - startTime))

        targetDate = targetDate + datetime.timedelta(days=1)

    driver.close()
    driver.quit()
    print("----- finished time: {0} -----\n\n".format(datetime.datetime.now().strftime("%Y/%m/%d %H:%M:%S")))

except:
    driver.close()
    driver.quit()

    import traceback
    traceback.print_exc()
