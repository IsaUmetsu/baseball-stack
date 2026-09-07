import datetime
import time
import re
from typing import Tuple, List, Dict, Any
from selenium.webdriver.chrome.webdriver import WebDriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

def get_config(key: str, date_game_no: str = "", date: str = "") -> str:
    config = {
        "gameTopUrl": f"https://baseball.yahoo.co.jp/npb/game/{date_game_no}/top",
        "gameStatsUrl": f"https://baseball.yahoo.co.jp/npb/game/{date_game_no}/stats",
        "gameTextUrl": f"https://baseball.yahoo.co.jp/npb/game/{date_game_no}/text",
        "gameIndexUrl": f"https://baseball.yahoo.co.jp/npb/game/{date_game_no}/index",
        "scheduleUrl": f"https://baseball.yahoo.co.jp/npb/schedule/first/all?date={date}",
    }
    return config[key]

def is_tokyo_olympics_period(target_date: datetime.date) -> bool:
    date_str = target_date.strftime("%Y%m%d")
    return "20210718" <= date_str <= "20210812"

SELECTORS = {
    "gameState": "#async-gameDetail > div.bb-gameTeam__score > p.bb-gameCard__state",
    "scheduleCards": "a.bb-score__content",
    "pitchStatsWrapper": "#async-gamePitcherStats",
    "batStatsWrapper": "#async-gameBatterStats",
    "awayTeamName": "#async-gamePitcherStats section.bb-modCommon03:nth-of-type(1) header h1",
    "homeTeamName": "#async-gamePitcherStats section.bb-modCommon03:nth-of-type(2) header h1",
    "awayPitchStats": "#async-gamePitcherStats section.bb-modCommon03:nth-of-type(1) table tbody tr",
    "homePitchStats": "#async-gamePitcherStats section.bb-modCommon03:nth-of-type(2) table tbody tr",
    "awayBatStats": "#async-gameBatterStats .bb-modBlowResultsTable > div:nth-of-type(1) table tbody tr",
    "homeBatStats": "#async-gameBatterStats .bb-modBlowResultsTable > div:nth-of-type(4) table tbody tr",
    "batResult": "#text_live .bb-liveText",
    "batResultUnit": ".bb-liveText__orderedList .bb-liveText__item",
    "batResultUnitNo": ".bb-liveText__number",
    "batResultUnitOrder": ".bb-liveText__text .bb-liveText__batter .bb-liveText__order",
    "batResultUnitBatter": ".bb-liveText__text .bb-liveText__batter .bb-liveText__player",
    "summaryPoint": ".bb-liveText__text .bb-liveText__summary--point",
}

class SeleniumGameStatsScraper:
    def __init__(self, driver: WebDriver):
        self.driver = driver

    def fetch_game_state(self, date_game_no: str) -> Tuple[str, bool]:
        url = get_config("gameTopUrl", date_game_no=date_game_no)
        self.driver.get(url)
        time.sleep(1)
        game_state_text = ""
        is_finished = False
        try:
            state_element = self.driver.find_element(By.CSS_SELECTOR, SELECTORS["gameState"])
            game_state_text = state_element.get_attribute("textContent").strip()
            print(f"[DEBUG] Game state found: '{game_state_text}'")
            is_finished = game_state_text in ["試合終了", "試合中止", "ノーゲーム"]
        except NoSuchElementException:
            print("[DEBUG] Game state element not found. Assuming game is not finished.")
            is_finished = False
        return game_state_text, is_finished

    def get_game_nos(self, target_date: datetime.date) -> List[str]:
        date_str = target_date.strftime("%Y-%m-%d")
        url = get_config("scheduleUrl", date=date_str)
        print(f"[DEBUG] Accessing schedule page: {url}")
        self.driver.get(url)

        try:
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, SELECTORS["scheduleCards"]))
            )
        except TimeoutException:
            print(f"[WARN] Timeout loading schedule page: {url}")
            return []

        elements = self.driver.find_elements(By.CSS_SELECTOR, SELECTORS["scheduleCards"])
        print(f"[DEBUG] Found {len(elements)} game elements with selector '{SELECTORS['scheduleCards']}'.")

        game_nos = []
        for elem in elements:
            href = elem.get_attribute("href")
            if href:
                match = re.search(r'/game/(\d+)/', href)
                if match:
                    game_id = match.group(1)
                    if game_id not in game_nos:
                        game_nos.append(game_id)
        print(f"[DEBUG] Extracted game nos: {game_nos}")
        return game_nos

    def _create_pitch_stats_detail(self, rows: List[Any], target_date: datetime.date) -> Dict[str, str]:
        stats_tuple_list = []
        if is_tokyo_olympics_period(target_date):
            params = ["name", "ip", "np", "bf", "ha", "hra", "so", "bb", "hbp", "balk", "ra", "er"]
        else:
            if len(rows) == 14:
                params = ["result", "name", "era", "ip", "np", "bf", "ha", "hra", "so", "bb", "hbp", "balk", "ra", "er"]
            else:
                stats_tuple_list.append(("result", ""))
                params = ["name", "era", "ip", "np", "bf", "ha", "hra", "so", "bb", "hbp", "balk", "ra", "er"]

        for idx, param in enumerate(params):
            if idx < len(rows):
                stats_tuple_list.append((param, rows[idx].text.strip()))
            else:
                stats_tuple_list.append((param, ""))
        return dict(stats_tuple_list)

    def _create_bat_stats_detail(self, cols: List[Any], target_date: datetime.date) -> Dict[str, str]:
        stats_tuple_list = []
        if is_tokyo_olympics_period(target_date):
            params = ["position", "name", "ab", "run", "hit", "rbi", "so", "bb", "hbp", "sh", "sb", "e", "hr"]
        else:
            params = ["position", "name", "ave", "ab", "run", "hit", "rbi", "so", "bb", "hbp", "sh", "sb", "e", "hr"]

        inning_cols = cols[len(params):]
        for i in range(len(inning_cols)):
            params.append(f"ing{i+1}")

        for idx, param in enumerate(params):
            if idx < len(cols):
                stats_tuple_list.append((param, cols[idx].text.strip()))
            else:
                stats_tuple_list.append((param, ""))
        return dict(stats_tuple_list)

    def fetch_pitch_stats(self, date_game_no: str, target_date: datetime.date) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        url = get_config("gameStatsUrl", date_game_no=date_game_no)
        print(f"[DEBUG] Accessing pitch stats URL: {url}")
        self.driver.get(url)
        try:
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, SELECTORS["pitchStatsWrapper"]))
            )
        except TimeoutException:
            print(f"[WARN] Timeout while waiting for pitch stats on {url}")
            return {"team": "", "stats": []}, {"team": "", "stats": []}

        away_team, home_team = "", ""
        try:
            away_team = self.driver.find_element(By.CSS_SELECTOR, SELECTORS["awayTeamName"]).text.strip()
        except NoSuchElementException:
            pass
        try:
            home_team = self.driver.find_element(By.CSS_SELECTOR, SELECTORS["homeTeamName"]).text.strip()
        except NoSuchElementException:
            pass

        away_stats, home_stats = [], []
        away_elems = self.driver.find_elements(By.CSS_SELECTOR, SELECTORS["awayPitchStats"])
        home_elems = self.driver.find_elements(By.CSS_SELECTOR, SELECTORS["homePitchStats"])
        print(f"[DEBUG] Found {len(away_elems)} away pitcher rows and {len(home_elems)} home pitcher rows.")

        for elem in away_elems:
            rows = elem.find_elements(By.TAG_NAME, "td")
            if rows:
                away_stats.append(self._create_pitch_stats_detail(rows, target_date))
        for elem in home_elems:
            rows = elem.find_elements(By.TAG_NAME, "td")
            if rows:
                home_stats.append(self._create_pitch_stats_detail(rows, target_date))

        return {"team": away_team, "stats": away_stats}, {"team": home_team, "stats": home_stats}

    def fetch_bat_stats(self, date_game_no: str, target_date: datetime.date, away_team: str = "", home_team: str = "") -> Tuple[Dict[str, Any], Dict[str, Any]]:
        url = get_config("gameStatsUrl", date_game_no=date_game_no)
        print(f"[DEBUG] Accessing bat stats URL: {url}")
        self.driver.get(url)
        try:
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, SELECTORS["batStatsWrapper"]))
            )
        except TimeoutException:
            print(f"[WARN] Timeout while waiting for bat stats on {url}")
            return {"team": away_team, "stats": []}, {"team": home_team, "stats": []}

        away_stats, home_stats = [], []
        away_elems = self.driver.find_elements(By.CSS_SELECTOR, SELECTORS["awayBatStats"])
        home_elems = self.driver.find_elements(By.CSS_SELECTOR, SELECTORS["homeBatStats"])
        print(f"[DEBUG] Found {len(away_elems)} away batter rows and {len(home_elems)} home batter rows.")

        for elem in away_elems:
            cols = elem.find_elements(By.TAG_NAME, "td")
            if cols:
                away_stats.append(self._create_bat_stats_detail(cols, target_date))
        for elem in home_elems:
            cols = elem.find_elements(By.TAG_NAME, "td")
            if cols:
                home_stats.append(self._create_bat_stats_detail(cols, target_date))

        return {"team": away_team, "stats": away_stats}, {"team": home_team, "stats": home_stats}

    def fetch_text_stats(self, date_game_no: str, target_date: datetime.date) -> List[Dict[str, str]]:
        url = get_config("gameTextUrl", date_game_no=date_game_no)
        print(f"[DEBUG] Accessing text stats URL: {url}")
        self.driver.get(url)
        time.sleep(1)
        data = []
        try:
            bat_result_elems = self.driver.find_elements(By.CSS_SELECTOR, SELECTORS["batResult"])
            for order_list_elem in bat_result_elems:
                try:
                    inning = order_list_elem.find_element(By.CSS_SELECTOR, "header h1").text.strip()
                    team = order_list_elem.find_element(By.CSS_SELECTOR, "header p").text.strip()
                except NoSuchElementException:
                    inning, team = "", ""

                for unit in order_list_elem.find_elements(By.CSS_SELECTOR, SELECTORS["batResultUnit"]):
                    summary_points = unit.find_elements(By.CSS_SELECTOR, SELECTORS["summaryPoint"])
                    if summary_points:
                        no = unit.find_element(By.CSS_SELECTOR, SELECTORS["batResultUnitNo"]).text.strip()
                        order = unit.find_element(By.CSS_SELECTOR, SELECTORS["batResultUnitOrder"]).text.strip()
                        batter = unit.find_element(By.CSS_SELECTOR, SELECTORS["batResultUnitBatter"]).text.strip()
                        for point in summary_points:
                            data.append({
                                "inning": inning,
                                "team": team,
                                "no": no,
                                "order": order,
                                "batter": batter,
                                "detail": point.text.strip(),
                            })
        except Exception as e:
            print(f"[WARN] Error parsing text stats: {e}")
        return data