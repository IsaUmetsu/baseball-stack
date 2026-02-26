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
from config import getConfig, getLeague2021
from driver import getChromeDriver, getFirefoxDriver
from util import Util

# 年を2021 にする
# オープン戦は試合番号を取得して取るようにする

parser = argparse.ArgumentParser(prog="blowser", add_help=True)
parser.add_argument('-ss', '--season-start', type=str, default=datetime.datetime.now().strftime("%m%d"))
parser.add_argument('-se', '--season-end', type=str, default=datetime.datetime.now().strftime("%m%d"))
parser.add_argument('-s', '--specify', nargs='+', type=str)
parser.add_argument('-e', '--exclude', nargs='+', type=str)
args = parser.parse_args()

def commonWait():
    time.sleep(2)

def getInningSelector(inning, topBtm):
    topBtmDic = { "表": 1, "裏": 2 }
    return getSelector("inningBase").format(topBtmDic[topBtm], inning + 1)

# driver生成
driver = getFirefoxDriver()
util = Util(driver)
# シーズン開始日設定
targetDate = datetime.datetime.strptime("2021" + args.season_start, "%Y%m%d")
dateEnd = datetime.datetime.strptime("2021" + args.season_end, "%Y%m%d")

print("----- current time: {0} -----".format(datetime.datetime.now().strftime("%Y/%m/%d %H:%M:%S")))

try:
    while targetDate <= dateEnd:
        # 指定日の[日程・結果]画面へ遷移
        driver.get(getConfig("scheduleUrl").replace("[date]", targetDate.strftime("%Y-%m-%d")))
        commonWait()

        # for gameCard in util.getElems("gameCards"):
        gameElems = util.getElems("gameCards")

        for idx, gameElem in enumerate(gameElems):
            print (idx)
            print (type(idx))
            url = gameElem.get_attribute("href")
            
            print (url)
            gameNoArr = re.findall(r'https://baseball.yahoo.co.jp/npb/game/2021(\d+)/index', url)
            if len(gameNoArr) == 0:
                print ("not exist gameNo")
                break

            print (gameNoArr[0])

    driver.close()
    driver.quit()
    print("----- finished time: {0} -----\n\n".format(datetime.datetime.now().strftime("%Y/%m/%d %H:%M:%S")))

except:
    driver.close()
    driver.quit()

    import traceback
    traceback.print_exc()
