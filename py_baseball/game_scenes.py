import time
import re
import json
from collections import OrderedDict
import pprint
import datetime
import os
import hashlib
import argparse

from selenium.common.exceptions import TimeoutException
from selenium.common.exceptions import NoSuchElementException, StaleElementReferenceException
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from selector import getSelector
from config import getConfig, getLeague2021, isTokyoOlympicsPeriod, getTeamInitial
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

def safe_click(elem):
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", elem)
    try:
        elem.click()
    except Exception:
        driver.execute_script("arguments[0].click();", elem)

# driver生成
driver = getFirefoxDriver()
util = Util(driver)
# シーズン開始日設定
def parse_date(date_str):
    cleaned = re.sub(r'\D', '', date_str)
    if len(cleaned) == 4:
        return datetime.datetime.strptime(datetime.datetime.now().strftime("%Y") + cleaned, "%Y%m%d")
    elif len(cleaned) == 8:
        return datetime.datetime.strptime(cleaned, "%Y%m%d")
    else:
        raise ValueError(f"Invalid date format: {date_str}")

targetDate = parse_date(args.season_start)
dateEnd = parse_date(args.season_end)

print("----- current time: {0} -----".format(datetime.datetime.now().strftime("%Y/%m/%d %H:%M:%S")))

try:
    while targetDate <= dateEnd:
        # 指定日の[日程・結果]画面へ遷移
        driver.get(getConfig("scheduleUrl").replace("[date]", targetDate.strftime("%Y-%m-%d")))
        try:
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, getSelector("gameCards"))))
        except TimeoutException:
            print("No game cards found on {0} (possibly no games scheduled). Skipping...".format(targetDate.strftime("%Y-%m-%d")))
            targetDate = targetDate + datetime.timedelta(days=1)
            continue

        gameNos = []
        try:
            gameNos = getGameNos(util, targetDate)
        except KeyError:
            print ("not exist gameNo, date: {0}".format(targetDate.strftime("%m%d")))
            targetDate = targetDate + datetime.timedelta(days=1)
            continue

        for idx, gameNoStr in enumerate(gameNos):
            # 過去保存データの判定に関する変数を初期化
            savedLatestInningTopBtm = ""
            fromInning = 1
            fromTopBtm = "表"
            toInning = 0
            toTopBtm = ""

            # 日付ディレクトリ作成
            dateStr = targetDate.strftime("%Y%m%d")
            fullPathDate = "/".join([getConfig("pathBase"), dateStr])
            if not os.path.exists(fullPathDate):
                os.makedirs(fullPathDate)

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
                os.makedirs(fullGamePath)

            # URL一部分作成 (2023年もURLは2021のままのため)
            dateGameNo = "2021" + gameNoStr

            #「一球速報」に遷移
            scoreUrl = getConfig("gameScoreUrl").replace("npb", "npb_practice") if isTokyoOlympicsPeriod(targetDate) else getConfig("gameScoreUrl")
            driver.get(scoreUrl.replace("[dateGameNo]", dateGameNo))
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "#contentMain")))
            # メインコンテンツ
            contentMain = ""
            try:
                contentMain = driver.find_element_by_css_selector("#contentMain")
            except:
                print("----- date: {0}, not found game gameNo: {1}, page: {2} -----".format(targetDate.strftime("%m/%d"), gameNo, gameNoStr))
                continue

            # ユーティリティ再定義 (対象セレクタを限定させる (driver → contentMain))
            util = Util(contentMain)
            teamInitialAway = util.getText("teamInitialAway")
            teamInitialHome = util.getText("teamInitialHome")
            try:
                away_initial = getTeamInitial(teamInitialAway)
            except:
                away_initial = teamInitialAway
            try:
                home_initial = getTeamInitial(teamInitialHome)
            except:
                home_initial = teamInitialHome
            # ソフトバンク戦以外は一旦除外 (23/9/23追記)
            # if teamInitialAway != 'ソ' and teamInitialHome != 'ソ':
            # # ソフトバンク戦は一旦除外 (23/9/24追記)
            # if teamInitialAway == 'ソ' or teamInitialHome == 'ソ':
            #     print("----- skip game: {0}, away {1} vs {2} home -----".format(gameNo, teamInitialAway, teamInitialHome))
            #     continue
            # 一球速報 初期遷移時のイニング
            currentInningTopBtm = util.getText("inning")
            print("----- date: {0}, game: {1}, {2} vs {3}, currentInningTopBtm: {4} -----".format(targetDate.strftime("%m/%d"), gameNo, away_initial, home_initial, currentInningTopBtm))

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
            else:
                # 試合終了の場合、全件取得するためtoInningとtoTopBtmは初期値(0と"")のままにする
                pass

            # 過去に保存済みの場合の判定と再開処理
            if fileCount > 0:
                loadedJson = {}
                try:
                    with open("{0}/{1}.json".format(fullGamePath, fileCount), 'r') as f:
                        loadedJson = json.load(f)
                except Exception as e:
                    # 破損ファイルなどの場合は最初から再取得する
                    fileCount = 0
                    print('loaded json error, scrape from scratch:', e)

                if fileCount > 0:
                    savedLatestInningTopBtm = loadedJson.get("liveHeader", {}).get("inning", "")
                    try:
                        away_initial = getTeamInitial(teamInitialAway)
                    except:
                        away_initial = teamInitialAway
                    try:
                        home_initial = getTeamInitial(teamInitialHome)
                    except:
                        home_initial = teamInitialHome
                    print("----- date: {0}, game: {1}, {2} vs {3}, savedLatestInningTopBtm: {4}, fileCount: {5} -----".format(targetDate.strftime("%m/%d"), gameNo, away_initial, home_initial, savedLatestInningTopBtm, fileCount))

                    # 1. 保存完了状態（スキップ対象）の判定
                    if savedLatestInningTopBtm in ["試合終了", "試合中止", "ノーゲーム"]:
                        # 正常に保存が完了しているため、次の試合へスキップ
                        continue
                    elif savedLatestInningTopBtm == "試合前":
                        # 「試合前」として保存されている場合は、1.jsonを上書きして1回表から新規取得を開始
                        fileCount = 0
                        print('game not started in previous save, restart scrape from scratch')

                    # 2. 途中で処理が中断されている場合の再開処理
                    elif bool(re.match(r'^\d+回(表|裏)$', savedLatestInningTopBtm)):
                        currentInning, currentTopBtm = savedLatestInningTopBtm.split("回")
                        fromInning = int(currentInning)
                        if currentTopBtm == "表":
                            # 〇回表の場合は「〇回裏」から再開
                            fromTopBtm = "裏"
                        elif currentTopBtm == "裏":
                            # 〇回裏の場合は「(〇+1)回表」から再開
                            fromInning = fromInning + 1
                            fromTopBtm = "表"

                    # 3. それ以外の予期しない状態（破損やダミーなど）
                    else:
                        fileCount = 0
                        print('invalid inning format in saved data, scrape from scratch')

            # 指定のイニングに遷移
            selectorInning = getInningSelector(fromInning, fromTopBtm)
            elem_inning = contentMain.find_element_by_css_selector(selectorInning)
            safe_click(elem_inning)

            # ページ遷移完了（イニング表示の更新）を待機
            expected_inning = f"{fromInning}回{fromTopBtm}"
            try:
                WebDriverWait(driver, 10).until(
                    lambda d: d.find_element_by_css_selector(getSelector("inning")).text.strip() == expected_inning
                )
            except Exception as e:
                print(f"Warning: timeout waiting for inning to become {expected_inning}: {e}")

            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "#contentMain")))

            contentMain = driver.find_element_by_css_selector("#contentMain")
            util = Util(contentMain)

            # 一球速報・リプレイ表示の開始
            # イニングタブをクリックした直後は「全般サマリー」画面になっており、一球速報モード（リプレイ）が開始していない場合がある
            # そのため、#replay 内の最初のリンクや、リプレイ開始用の要素をクリックする
            try:
                # すでに「次へ」ボタンが存在する場合は一球速報モードになっている
                contentMain.find_element_by_css_selector("#replay .next a")
            except NoSuchElementException:
                # 「次へ」ボタンがない場合、リプレイを開始するための要素を探索してクリックする
                start_element = None
                selectors_to_try = [
                    "#replay a",                  # replay内の全てのリンク
                    "#replay dl dd a",            # 打者リストのリンク
                    "#replay td a",               # テーブル内のリンク
                    "#replay dt",                 # 打者数のヘッダなど
                    "#replay_title",              # リプレイタイトル
                ]
                for sel in selectors_to_try:
                    try:
                        elems = contentMain.find_elements_by_css_selector(sel)
                        if len(elems) > 0:
                            # 最初の有効な要素を特定してクリック
                            for elem in elems:
                                if elem.is_displayed() and elem.is_enabled():
                                    start_element = elem
                                    break
                            if start_element:
                                break
                    except Exception:
                        continue
                
                if start_element:
                    safe_click(start_element)
                    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "#contentMain")))
                    contentMain = driver.find_element_by_css_selector("#contentMain")
                    util = Util(contentMain)

            # 取得対象(開始) 1回裏以降の場合
            if fromInning > 1 or fromTopBtm == "裏":
                #「戻る」ボタン押下
                selectorPrevButton = "#replay .back a"
                try:
                    elem_prev = contentMain.find_element_by_css_selector(selectorPrevButton)
                    safe_click(elem_prev)
                    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "#contentMain")))
                    contentMain = driver.find_element_by_css_selector("#contentMain")
                    util = Util(contentMain)
                except NoSuchElementException:
                    pass

                while 1:
                    # 現在の打者数
                    currentBatterCnt = util.getText("inningBatterCnt")
                    # 投手変更、守備変更がない場合
                    if len(currentBatterCnt) > 0:
                        #「次へ」ボタン押下
                        selectorNextButton = "#replay .next a"
                        try:
                            elem_next = contentMain.find_element_by_css_selector(selectorNextButton)
                            safe_click(elem_next)
                            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "#contentMain")))
                            contentMain = driver.find_element_by_css_selector("#contentMain")
                            util = Util(contentMain)
                        except NoSuchElementException:
                            break
                        # シート変更の初期シーンに移動したら抜ける
                        break
                    # 依然シートの変更がある場合は「戻る」ボタン押下
                    else:
                        try:
                            elem_prev = contentMain.find_element_by_css_selector(selectorPrevButton)
                            safe_click(elem_prev)
                            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "#contentMain")))
                            contentMain = driver.find_element_by_css_selector("#contentMain")
                            util = Util(contentMain)
                        except NoSuchElementException:
                            break

            # 処理開始シーン定義
            scene = fileCount
            
            loop_context = type('obj', (object,), {})()
            
            def get_scene_signature(u):
                try:
                    pitch_details_text = ""
                    try:
                        pitchDetailsElem = u.getElems("pitchDetail")
                        pitch_details_text = "|".join([elem.text for elem in pitchDetailsElem])
                    except Exception:
                        pass
                    return (
                        u.getText("inning"),
                        u.getText("inningBatterCnt"),
                        u.getText("currentBatterName"),
                        u.getText("currentPitchCount"),
                        u.getText("battingResult"),
                        u.getText("pitchingResult"),
                        pitch_details_text
                    )
                except Exception:
                    return None

            cached_inning = None
            cached_home_team_info = None
            cached_away_team_info = None

            try:
                while 1:
                    data = {}
                    scene += 1
                    startTime = time.time()

                    # ------------ ライブヘッダ ------------
                    inning_text = util.getText("inning")
                    if inning_text == "試合終了":
                        # 「試合終了」のままの場合は、ページ更新を待つためにリトライする
                        for _ in range(10):
                            time.sleep(0.5)
                            inning_text = util.getText("inning")
                            if inning_text != "試合終了":
                                break

                    data["liveHeader"] = {
                        "inning": inning_text,
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
                    if liveBody["battingResult"] in ["試合中止", "試合前"]:
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
                    onbaseInfo = []
                    for attempt in range(3):
                        try:
                            onbaseInfoElem = util.getElems("onbaseInfo")
                            current_onbaseInfo = []
                            for elem in onbaseInfoElem:
                                current_onbaseInfo.append({
                                    "base": elem.get_attribute("id"),
                                    "player": elem.text
                                })
                            onbaseInfo = current_onbaseInfo
                            break
                        except StaleElementReferenceException:
                            if attempt == 2:
                                print("StaleElementReferenceException occurred in onbaseInfo after 3 attempts. Safely continuing.")
                            else:
                                time.sleep(0.5)
                                contentMain = driver.find_element_by_css_selector("#contentMain")
                                util = Util(contentMain)
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

                    pitchInfo = {}
                    # 投球詳細
                    pitchDetails = []
                    for attempt in range(3):
                        try:
                            pitchDetailsElem = util.getElems("pitchDetail")
                            current_pitchDetails = []
                            for elem in pitchDetailsElem:
                                current_pitchDetails.append({
                                    "judgeIcon": util.getSpecifyClass(elem, "tr td:nth-child(1) span").split(" ")[1][-1:],
                                    "pitchCnt": util.getSpecifyText(elem, "tr td:nth-child(2)"),
                                    "pitchType": util.getSpecifyText(elem, "tr td:nth-child(3)"),
                                    "pitchSpeed": util.getSpecifyText(elem, "tr td:nth-child(4)"),
                                    "pitchJudgeDetail": util.getSpecifyText(elem, "tr td:nth-child(5)")
                                })
                            pitchDetails = current_pitchDetails
                            break
                        except (StaleElementReferenceException, AttributeError, IndexError) as e:
                            if attempt == 2:
                                print(f"WARNING: {type(e).__name__} occurred in pitchDetails after 3 attempts. Safely continuing.")
                            else:
                                time.sleep(0.5)
                                contentMain = driver.find_element_by_css_selector("#contentMain")
                                util = Util(contentMain)
                    pitchInfo["pitchDetails"] = pitchDetails

                    # 投球コース
                    allPitchCourse = []
                    for attempt in range(3):
                        try:
                            pitchDetailsCourseElem = util.getElems("pitchingCourse")
                            current_allPitchCourse = []
                            for course in pitchDetailsCourseElem:
                                courseDetailNum = re.findall(r'-?\d+', course.get_attribute("style"))
                                # 0: top, 1: left
                                current_allPitchCourse.append({
                                    "top": courseDetailNum[0],
                                    "left": courseDetailNum[1]
                                })
                            allPitchCourse = current_allPitchCourse
                            break
                        except (StaleElementReferenceException, TypeError, IndexError) as e:
                            if attempt == 2:
                                print(f"WARNING: {type(e).__name__} occurred in pitchingCourse after 3 attempts. Safely continuing.")
                            else:
                                time.sleep(0.5)
                                contentMain = driver.find_element_by_css_selector("#contentMain")
                                util = Util(contentMain)

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
                        global contentMain, util
                        for attempt in range(3):
                            try:
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
                            except StaleElementReferenceException:
                                if attempt == 2:
                                    raise
                                time.sleep(0.5)
                                contentMain = driver.find_element_by_css_selector("#contentMain")
                                util = Util(contentMain)
                    
                    current_scene_inning = data["liveHeader"]["inning"]
                    
                    # キャッシュの再取得判定
                    force_reload = False
                    if cached_home_team_info is None or cached_away_team_info is None or cached_inning != current_scene_inning:
                        force_reload = True
                    else:
                        # 現在の打者がキャッシュ内のオーダーに存在するか検証（代打検知）
                        current_batter_name = liveBody["currentBatterInfo"]["name"]
                        if current_batter_name:
                            found = False
                            for team_info in [cached_home_team_info, cached_away_team_info]:
                                if team_info and any(player["name"] == current_batter_name for player in team_info.get("order", [])):
                                    found = True
                                    break
                            if not found:
                                force_reload = True

                        # 現在の投手がキャッシュ内のバッテリー情報に存在するか検証（投手交代検知）
                        if not force_reload:
                            current_pitcher_name = liveBody["currentPicherInfo"]["name"]
                            if current_pitcher_name:
                                found = False
                                for team_info in [cached_home_team_info, cached_away_team_info]:
                                    if team_info and current_pitcher_name in team_info.get("batteryInfo", ""):
                                        found = True
                                        break
                                if not found:
                                    force_reload = True

                        # 塁上のランナーがキャッシュ内のオーダーに存在するか検証（代走検知）
                        if not force_reload:
                            for runner in liveBody.get("onbaseInfo", []):
                                runner_name = runner.get("player")
                                if runner_name:
                                    found = False
                                    for team_info in [cached_home_team_info, cached_away_team_info]:
                                        if team_info and any(player["name"] == runner_name for player in team_info.get("order", [])):
                                            found = True
                                            break
                                    if not found:
                                        force_reload = True
                                        break

                    if force_reload:
                        cached_home_team_info = createTeamInfo("homeTeamElemId")
                        cached_away_team_info = createTeamInfo("awayTeamElemId")
                        cached_inning = current_scene_inning

                    data["homeTeamInfo"] = cached_home_team_info
                    data["awayTeamInfo"] = cached_away_team_info

                    # --- 保存の直前 (json.dumpの直前) に追加 ---
                    current_json_str = json.dumps(data, sort_keys=True) # 保存対象のdict
                    current_hash = hashlib.md5(current_json_str.encode()).hexdigest()

                    if hasattr(loop_context, 'prev_hash') and loop_context.prev_hash == current_hash:
                        print(f"[WARN] 直前のシーンと完全一致したためスキップ/待機します")
                        time.sleep(1.0)
                        scene -= 1 # jsonファイルが連番になるように調整
                    else:
                        loop_context.prev_hash = current_hash
                        # --- ここまで追加して、既存の json.dump へ進む ---
                        # save as json
                        with open("{0}/{1}.json".format(fullGamePath, scene), 'w') as f:
                            json.dump(data, f, indent=2, ensure_ascii=False)

                        print("----- [done] date: {0}, gameNo: {1}, {2} vs {3}, scene: {4:3d}, inning: {5}, {6}アウト, {7:3.1f}[sec] -----".format(
                            targetDate.strftime("%m/%d"),
                            gameNo,
                            away_initial,
                            home_initial,
                            scene,
                            data["liveHeader"]["inning"],
                            data["liveHeader"]["count"]["o"],
                            time.time() - startTime
                        ))

                    #「次へ」ボタン押下
                    prev_sig = get_scene_signature(util)
                    selectorNextButton = "#replay .next a"
                    try:
                        try:
                            elem_next = contentMain.find_element_by_css_selector(selectorNextButton)
                        except StaleElementReferenceException:
                            contentMain = driver.find_element_by_css_selector("#contentMain")
                            util = Util(contentMain)
                            elem_next = contentMain.find_element_by_css_selector(selectorNextButton)
                        safe_click(elem_next)
                        
                        # シグネチャが切り替わるまで待機
                        start_wait = time.time()
                        current_sig = prev_sig # Initialize current_sig for the loop
                        while time.time() - start_wait < 20.0: # Increased timeout to 20 seconds
                            time.sleep(0.5) # Increased sleep interval for less frequent checks
                            try:
                                # Re-fetch contentMain and util inside the loop to ensure fresh elements
                                contentMain = driver.find_element_by_css_selector("#contentMain")
                                util = Util(contentMain)
                                current_sig = get_scene_signature(util)
                                if current_sig != prev_sig:
                                    print(f"DEBUG: Scene signature changed: {prev_sig[:5]} -> {current_sig[:5]}")
                                    break
                            except Exception as e:
                                print(f"DEBUG: Error during signature check: {e}")
                                # Continue loop if there's an error, hoping it's transient
                                pass
                        else:  # タイムアウトした場合のフォールバック処理
                            print(f"WARNING: Scene signature did not change. Attempting to advance to next inning.")
                            
                            # 現在のイニング表示を再取得して試合終了か確認
                            inning_text = util.getText("inning")
                            if inning_text == "試合終了":
                                print("INFO: Game is over. Breaking scene loop.")
                                break

                            try:
                                # 現在のイニング情報をパース
                                current_inning_str = data["liveHeader"]["inning"]
                                match = re.match(r'(\d+)回(表|裏)', current_inning_str)
                                
                                if not match:
                                    print(f"ERROR: Could not parse current inning '{current_inning_str}'. Breaking loop.")
                                    break
                                
                                current_inning_num = int(match.group(1))
                                current_top_btm = match.group(2)

                                # 次のイニングを計算
                                if current_top_btm == "表":
                                    next_inning_num = current_inning_num
                                    next_top_btm = "裏"
                                else:  # "裏"
                                    next_inning_num = current_inning_num + 1
                                    next_top_btm = "表"
                                
                                print(f"INFO: Advancing from {current_inning_str} to {next_inning_num}回{next_top_btm}.")

                                # 次のイニングのタブをクリック
                                selector_next_inning = getInningSelector(next_inning_num, next_top_btm)
                                elem_next_inning = contentMain.find_element_by_css_selector(selector_next_inning)
                                safe_click(elem_next_inning)

                                # ページが更新されるのを待つ
                                WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "#contentMain")))
                                contentMain = driver.find_element_by_css_selector("#contentMain")
                                util = Util(contentMain)
                                # ループを継続して新しいシーンを処理
                                continue

                            except Exception as e:
                                print(f"ERROR: Could not find or click next inning tab. Maybe game is over. Error: {e}. Breaking loop.")
                                break

                        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.CSS_SELECTOR, "#contentMain")))
                        contentMain = driver.find_element_by_css_selector("#contentMain")
                        util = Util(contentMain)
                    except NoSuchElementException:
                        # 最終イニング到達時など、「次へ」ボタンが存在しない・表示されないケース
                        break

            except TimeoutException as te:
                print(te)
                print("----- [error] date: {0}, gameNo: {1}, {2} vs {3}, scene: {4:3d}, inning: {5}, {6}アウト, {7:3.1f}[sec] -----".format(
                    targetDate.strftime("%m/%d"),
                    gameNo,
                    away_initial,
                    home_initial,
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
