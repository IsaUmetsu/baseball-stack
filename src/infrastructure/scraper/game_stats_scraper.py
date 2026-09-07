import datetime
import time
from typing import Tuple, List, Dict, Any
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# --- Start of functions and data copied and adapted from py_baseball --- 

# Adapted from config.py
def get_config(key: str, date_game_no: str = "", date: str = "") -> str:
    config = {
        "gameScoreUrl": f"https://baseball.yahoo.co.jp/npb/game/{date_game_no}/score",
        "gameStatsUrl": f"https://baseball.yahoo.co.jp/npb/game/{date_game_no}/stats",
        "gameTextUrl": f"https://baseball.yahoo.co.jp/npb/game/{date_game_no}/text",
        "gameIndexUrl": f"https://baseball.yahoo.co.jp/npb/game/{date_game_no}/index",
        "scheduleUrl": f"https://baseball.yahoo.co.jp/npb/schedule/?date={date}",
    }
    return config[key]

def is_tokyo_olympics_period(target_date: datetime.date) -> bool:
    date_str = target_date.strftime("%Y%m%d")
    return "20210718" <= date_str <= "20210812"

# Adapted from selector.py
# A minimal set of selectors needed for the scraper
SELECTORS = {
    "gameState": "#gm_brd .bb-gameDetail .bb-gameCard__state",
    "awayPitchStats": "#async-gamePitcherStats section.bb-modCommon03:nth-of-type(1) table tbody tr",
    "homePitchStats": "#async-gamePitcherStats section.bb-modCommon03:nth-of-type(2) table tbody tr",
    "awayBatStats": "#async-gameBatterStats .bb-modBlowResultsTable > div:nth-of-type(1) table tbody tr",
    "homeBatStats": "#async-gameBatterStats .bb-modBlowResultsTable > div:nth-of-type(4) table tbody tr",
    "awayScoreBoard": "#async-gameBatterStats .bb-teamScoreTable__row--away td",
    "homeScoreBoard": "#async-gameBatterStats .bb-teamScoreTable__row--home td",
    "batResult": "#text_live .bb-liveText",
    "batResultInning": "header h1",
    "batResultTeam": "header p",
    "batResultUnit": ".bb-liveText__orderedList .bb-liveText__item",
    "batResultUnitNo": ".bb-liveText__number",
    "batResultUnitOrder": ".bb-liveText__text .bb-liveText__batter .bb-liveText__order",
    "batResultUnitBatter": ".bb-liveText__text .bb-liveText__batter .bb-liveText__player",
    "summaryPoint": ".bb-liveText__text .bb-liveText__summary--point",
}

# --- End of adapted functions --- 

class SeleniumGameStatsScraper:
    def __init__(self, driver: WebDriver):
        self.driver = driver

    def _create_pitch_stats_detail(self, rows: List[Any], target_date: datetime.date) -> Dict[str, str]:
        stats_tuple_list = []
        if is_tokyo_olympics_period(target_date):
            params = ["name", "ip", "np", "bf", "ha", "hra", "so", "bb", "hbp", "balk", "ra", "er"]
        else:
            if len(rows) == 14:  # Post-game
                params = ["result", "name", "era", "ip", "np", "bf", "ha", "hra", "so", "bb", "hbp", "balk", "ra", "er"]
            else:  # In-game
                stats_tuple_list.append(("result", ""))
                params = ["name", "era", "ip", "np", "bf", "ha", "hra", "so", "bb", "hbp", "balk", "ra", "er"]
        
        for idx, param in enumerate(params):
            stats_tuple_list.append((param, rows[idx].text))
        return dict(stats_tuple_list)

    def _create_bat_stats_detail(self, cols: List[Any], target_date: datetime.date) -> Dict[str, str]:
        stats_tuple_list = []
        if is_tokyo_olympics_period(target_date):
            params = ["position", "name", "ab", "run", "hit", "rbi", "so", "bb", "hbp", "sh", "sb", "e", "hr"]
        else:
            params = ["position", "name", "ave", "ab", "run", "hit", "rbi", "so", "bb", "hbp", "sh", "sb", "e", "hr"]
        # Dynamically add inning columns if they exist
        inning_cols = cols[len(params):]
        for i, col in enumerate(inning_cols):
            params.append(f"ing{i+1}")

        for idx, param in enumerate(params):
            stats_tuple_list.append((param, cols[idx].text))
        return dict(stats_tuple_list)

    def fetch_game_state(self, date_game_no: str) -> Tuple[str, bool]:
        url = get_config("gameScoreUrl", date_game_no=date_game_no)
        self.driver.get(url)
        try:
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, SELECTORS["gameState"]))
            )
            state_elem = self.driver.find_element(By.CSS_SELECTOR, SELECTORS["gameState"])
            game_state = state_elem.text
            is_finished = game_state in ["試合終了", "試合中止"]
            return game_state, is_finished
        except (TimeoutException, NoSuchElementException):
            return "不明", False

    def fetch_pitch_stats(self, date_game_no: str, target_date: datetime.date) -> Tuple[List[Dict[str, str]], List[Dict[str, str]]]:
        url = get_config("gameStatsUrl", date_game_no=date_game_no)
        self.driver.get(url)
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, SELECTORS["awayPitchStats"]))
        )
        
        away_stats, home_stats = [], []
        for elem in self.driver.find_elements(By.CSS_SELECTOR, SELECTORS["awayPitchStats"]):
            rows = elem.find_elements(By.TAG_NAME, "td")
            if rows:
                away_stats.append(self._create_pitch_stats_detail(rows, target_date))
        
        for elem in self.driver.find_elements(By.CSS_SELECTOR, SELECTORS["homePitchStats"]):
            rows = elem.find_elements(By.TAG_NAME, "td")
            if rows:
                home_stats.append(self._create_pitch_stats_detail(rows, target_date))

        return away_stats, home_stats

    def fetch_bat_stats(self, date_game_no: str, target_date: datetime.date) -> Tuple[List[Dict[str, str]], List[Dict[str, str]]]:
        url = get_config("gameStatsUrl", date_game_no=date_game_no)
        self.driver.get(url)
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, SELECTORS["awayBatStats"]))
        )

        away_stats, home_stats = [], []
        for elem in self.driver.find_elements(By.CSS_SELECTOR, SELECTORS["awayBatStats"]):
            cols = elem.find_elements(By.TAG_NAME, "td")
            if cols:
                away_stats.append(self._create_bat_stats_detail(cols, target_date))

        for elem in self.driver.find_elements(By.CSS_SELECTOR, SELECTORS["homeBatStats"]):
            cols = elem.find_elements(By.TAG_NAME, "td")
            if cols:
                home_stats.append(self._create_bat_stats_detail(cols, target_date))
        
        return away_stats, home_stats

    def fetch_text_stats(self, date_game_no: str, target_date: datetime.date) -> List[Dict[str, str]]:
        url = get_config("gameTextUrl", date_game_no=date_game_no)
        self.driver.get(url)
        WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, SELECTORS["batResult"]))
        )

        data = []
        for order_list_elem in self.driver.find_elements(By.CSS_SELECTOR, SELECTORS["batResult"]):
            inning = order_list_elem.find_element(By.CSS_SELECTOR, SELECTORS["batResultInning"]).text
            team = order_list_elem.find_element(By.CSS_SELECTOR, SELECTORS["batResultTeam"]).text
            
            for unit in order_list_elem.find_elements(By.CSS_SELECTOR, SELECTORS["batResultUnit"]):
                summary_points = unit.find_elements(By.CSS_SELECTOR, SELECTORS["summaryPoint"])
                if summary_points:
                    no = unit.find_element(By.CSS_SELECTOR, SELECTORS["batResultUnitNo"]).text
                    order = unit.find_element(By.CSS_SELECTOR, SELECTORS["batResultUnitOrder"]).text
                    batter = unit.find_element(By.CSS_SELECTOR, SELECTORS["batResultUnitBatter"]).text
                    for point in summary_points:
                        data.append({
                            "inning": inning,
                            "team": team,
                            "no": no,
                            "order": order,
                            "batter": batter,
                            "detail": point.text,
                        })
        return data
