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
from config import getConfig, getTeamInitial, getLeague2021, isTokyoOlympicsPeriod
from driver import getChromeDriver, getFirefoxDriver
from util import Util
from common import getGameNos, commonWait

parser = argparse.ArgumentParser(prog="blowser", add_help=True)
parser.add_argument('-ss', '--season-start', type=str, default=datetime.datetime.now().strftime("%m%d"))
parser.add_argument('-se', '--season-end', type=str, default=(datetime.datetime.now() + datetime.timedelta(days=1)).strftime("%m%d"))
parser.add_argument('-s', '--specify', nargs='+', type=str)
parser.add_argument('-e', '--exclude', nargs='+', type=str)
args = parser.parse_args()

# driver生成
driver = getFirefoxDriver()
# シーズン開始日設定
targetDate = datetime.datetime.strptime("2023" + args.season_start, "%Y%m%d")
dateEnd = datetime.datetime.strptime("2023" + args.season_end, "%Y%m%d")

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
            # 日付ディレクトリ作成
            pathDate = targetDate.strftime("%Y%m%d")
            fullPathDate = "/".join([getConfig("pathBaseStarter"), pathDate])
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

            # URL一部分作成 (2022年もURLは2021のままのため)
            dateGameNo = "2021" + gameNoStr

            # 指定試合の[トップ]画面へ遷移
            topUrl = getConfig("gameTopUrl").replace("npb", "npb_practice") if isTokyoOlympicsPeriod(targetDate) else getConfig("gameTopUrl")
            topUrlEdit = topUrl.replace("[dateGameNo]", dateGameNo)
            driver.get(topUrlEdit)
            commonWait()

            away = "away"
            home = "home"
            util = Util(driver)
            startTime = startTime = util.getText("startTime")

            try:
                try:
                    # 試合前
                    util = Util(driver.find_element_by_css_selector("#gm_recen"))
                    away = getTeamInitial(util.getText("awayTeam"))
                    home = getTeamInitial(util.getText("homeTeam"))
                except NoSuchElementException as e:
                    # 試合開始後
                    util = Util(driver.find_element_by_css_selector("#ing_brd"))
                    away = getTeamInitial(util.getText("awayTeamPast"))
                    home = getTeamInitial(util.getText("homeTeamPast"))

                try:
                    # 試合前
                    util = Util(driver.find_element_by_css_selector("#strt_pit"))
                    awayStartPitcher = util.getText("awayStartPitcher")
                    homeStartPitcher = util.getText("homeStartPitcher")

                    awayInfo = { "team": away, "pitcher": awayStartPitcher }
                    homeInfo = { "team": home, "pitcher": homeStartPitcher }

                    data = { "start": startTime, "away": awayInfo, "home": homeInfo }
                    # save as json
                    with open("{0}/{1}.json".format(fullPathDate, gameNo), 'w') as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
                    
                    print("----- [done] date: {0}, gameNo: {1}, {2} vs {3} -----".format(pathDate, gameNo, away, home))
                except NoSuchElementException as e:
                    # 試合開始後
                    util = Util(driver.find_element_by_css_selector("#strt_mem"))
                    awayStartPitcherPast = util.getText("awayStartPitcherPast")
                    homeStartPitcherPast = util.getText("homeStartPitcherPast")

                    awayInfo = { "team": away, "pitcher": awayStartPitcherPast }
                    homeInfo = { "team": home, "pitcher": homeStartPitcherPast }

                    data = { "start": startTime, "away": awayInfo, "home": homeInfo }
                    # save as json
                    with open("{0}/{1}.json".format(fullPathDate, gameNo), 'w') as f:
                        json.dump(data, f, indent=2, ensure_ascii=False)
                    print("----- [done] date: {0}, gameNo: {1}, {2} vs {3} -----".format(pathDate, gameNo, away, home))

            except NoSuchElementException as e:
                gameTitleSpanArray = []
                # 試合中止時
                try:
                    gameTitleSpanElem = driver.find_element_by_css_selector(getSelector("gameTitleSpan"))
                    gameTitleSpan = gameTitleSpanElem.get_attribute("textContent")
                    # gameTitleSpanArray = gameTitleSpan.split(" ")# to 2022
                    gameTitleSpanArray = gameTitleSpan.split(" vs. ")# from 2023
                except Exception as e:
                    print("----- not found game, because pending, gameNo: {0}, page: {1} -----".format(gameNo, gameNoStr))
                    print(e)
                    continue

                away = getTeamInitial(gameTitleSpanArray[1]) # from 2023
                home = getTeamInitial(gameTitleSpanArray[0])

                data = { "start": startTime, "away": { "team": away }, "home": { "team": home } }
                # save as json
                with open("{0}/{1}.json".format(fullPathDate, gameNo), 'w') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print("----- [pending game] date: {0}, gameNo: {1}, {2} vs {3} -----".format(pathDate, gameNo, away, home))

        targetDate = targetDate + datetime.timedelta(days=1)

    driver.close()
    driver.quit()
    print("----- finished time: {0} -----\n\n".format(datetime.datetime.now().strftime("%Y/%m/%d %H:%M:%S")))

except:
    driver.close()
    driver.quit()

    import traceback
    traceback.print_exc()
