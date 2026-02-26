import time
import re
from config import getLeague2021, isTokyoOlympicsPeriod

def commonWait():
    time.sleep(2)

def getGameNos(util, targetDate):
    gameNos = []
    # tokyo2020 中断期間か
    if isTokyoOlympicsPeriod(targetDate):
            start, end = getLeague2021(targetDate.strftime("%m%d"))
            for gameNoTmp in range(start, end + 1):
                gameNos.append("00" + str(gameNoTmp))
    else:
        for idx, gameElem in enumerate(util.getElems("gameCards")):
            url = gameElem.get_attribute("href")
            gameNoArr = re.findall(r'https://baseball.yahoo.co.jp/npb/game/2021(\d+)/index', url)
            if len(gameNoArr) == 0:
                print ("not exist gameNo")
                break
            gameNos.append(gameNoArr[0])

    return gameNos
