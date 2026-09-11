import datetime
import re
import time
from typing import Any, Dict, List, Optional, Tuple

from selenium.common.exceptions import NoSuchElementException, TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from src.domain.models.stats import BatterStatsData, PitcherStatsData, TextPlayItem
from src.infrastructure.scraper.scene_selectors import (
    LEAGUE_2021,
    TEAM_INITIALS,
    is_tokyo_olympics_period,
)

TEAM_INITIAL_BY_FULL_NAME = {
    "横浜DeNAベイスターズ": "De",
    "阪神タイガース": "T",
    "読売ジャイアンツ": "G",
    "中日ドラゴンズ": "D",
    "広島東洋カープ": "C",
    "東京ヤクルトスワローズ": "S",
    "東北楽天ゴールデンイーグルス": "E",
    "福岡ソフトバンクホークス": "H",
    "埼玉西武ライオンズ": "L",
    "オリックス・バファローズ": "B",
    "千葉ロッテマリーンズ": "M",
    "北海道日本ハムファイターズ": "F",
}

SELECTORS = {
    "scheduleCards": "#gm_card .bb-score__content",
    "gameState": "#gm_brd .bb-gameDetail .bb-gameTeam__score .bb-gameCard__state",
    "awayTeamFullName": "#async-gamePitcherStats section.bb-modCommon03:nth-of-type(1) header",
    "homeTeamFullName": "#async-gamePitcherStats section.bb-modCommon03:nth-of-type(2) header",
    "awayPitchStats": "#async-gamePitcherStats section.bb-modCommon03:nth-of-type(1) table tbody tr",
    "homePitchStats": "#async-gamePitcherStats section.bb-modCommon03:nth-of-type(2) table tbody tr",
    "awayBatStats": "#async-gameBatterStats .bb-modBlowResultsTable > div:nth-of-type(1) table tbody tr",
    "homeBatStats": "#async-gameBatterStats .bb-modBlowResultsTable > div:nth-of-type(4) table tbody tr",
    "awayScoreBoard": "#async-gameBatterStats .bb-teamScoreTable__row--away td",
    "homeScoreBoard": "#async-gameBatterStats .bb-teamScoreTable__row--home td",
    "textLive": "#text_live",
    "batResult": "#text_live .bb-liveText",
    "batResultInning": "header h1",
    "batResultTeam": "header p",
    "batResultUnit": ".bb-liveText__orderedList .bb-liveText__item",
    "batResultUnitNo": ".bb-liveText__number",
    "batResultUnitOrder": ".bb-liveText__text .bb-liveText__batter .bb-liveText__order",
    "batResultUnitBatter": ".bb-liveText__text .bb-liveText__batter .bb-liveText__player",
    "summaryPoint": ".bb-liveText__text .bb-liveText__summary--point",
}


def get_team_initial_from_text(raw_text: str) -> str:
    cleaned = raw_text.strip()
    if cleaned in TEAM_INITIAL_BY_FULL_NAME:
        return TEAM_INITIAL_BY_FULL_NAME[cleaned]
    for full_name, initial in TEAM_INITIAL_BY_FULL_NAME.items():
        if full_name in cleaned:
            return initial
    if cleaned in TEAM_INITIALS:
        return TEAM_INITIALS[cleaned]
    for short_name, initial in TEAM_INITIALS.items():
        if short_name in cleaned:
            return initial
    return cleaned


class SeleniumGameStatsScraper:
    def __init__(self, driver: WebDriver):
        self._driver = driver

    def _wait(self, seconds: float = 2.0) -> None:
        time.sleep(seconds)


    def get_game_nos(self, target_date: datetime.date) -> List[str]:
        if is_tokyo_olympics_period(target_date):
            date_mmdd = target_date.strftime("%m%d")
            if date_mmdd in LEAGUE_2021:
                start, end = LEAGUE_2021[date_mmdd]
                return [f"00{n}" for n in range(start, end + 1)]
            return []

        schedule_url = f"https://baseball.yahoo.co.jp/npb/schedule/?date={target_date.strftime('%Y-%m-%d')}"
        self._driver.get(schedule_url)
        self._wait()

        try:
            WebDriverWait(self._driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, SELECTORS["scheduleCards"]))
            )
        except TimeoutException:
            return []

        elems = self._driver.find_elements(By.CSS_SELECTOR, SELECTORS["scheduleCards"])
        game_nos: List[str] = []
        for elem in elems:
            href = elem.get_attribute("href") or ""
            match = re.search(r'/game/2021(\d+)/index', href)
            if match:
                game_nos.append(match.group(1))
            else:
                match_fallback = re.search(r'/game/(\d+)/', href)
                if match_fallback:
                    raw_id = match_fallback.group(1)
                    game_nos.append(raw_id[4:] if raw_id.startswith("2021") else raw_id)
        return game_nos

    def fetch_game_state(self, date_game_no: str, target_date: datetime.date) -> Tuple[str, bool, bool]:
        url_prefix = "npb_practice" if is_tokyo_olympics_period(target_date) else "npb"
        top_url = f"https://baseball.yahoo.co.jp/{url_prefix}/game/{date_game_no}/top"
        self._driver.get(top_url)
        self._wait()

        try:
            state_elem = self._driver.find_element(By.CSS_SELECTOR, SELECTORS["gameState"])
            game_state = (state_elem.get_attribute("textContent") or "").strip()
            is_finished = game_state in ["試合終了", "試合中止", "ノーゲーム"]
            return game_state, is_finished, True
        except NoSuchElementException:
            return "", False, False

    def _create_pitch_stats_detail(self, rows: List[Any], target_date: datetime.date) -> Dict[str, str]:
        stats_tuple_list: List[Tuple[str, str]] = []
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

    def _create_pitch_stats(self, pitch_status_elems: List[Any], target_date: datetime.date) -> List[Dict[str, str]]:
        pitch_stats: List[Dict[str, str]] = []
        for pitch_stat in pitch_status_elems:
            rows = pitch_stat.find_elements(By.CSS_SELECTOR, "td")
            if rows:
                pitch_stats.append(self._create_pitch_stats_detail(rows, target_date))
        return pitch_stats

    def _create_bat_stats_detail(self, cols: List[Any], target_date: datetime.date) -> Dict[str, str]:
        stats_tuple_list: List[Tuple[str, str]] = []
        if is_tokyo_olympics_period(target_date):
            params = [
                "position", "name", "ab", "run", "hit", "rbi", "so", "bb", "hbp",
                "sh", "sb", "e", "hr",
                "ing1", "ing2", "ing3", "ing4", "ing5", "ing6", "ing7", "ing8", "ing9"
            ]
        else:
            params = [
                "position", "name", "ave", "ab", "run", "hit", "rbi", "so", "bb", "hbp",
                "sh", "sb", "e", "hr",
                "ing1", "ing2", "ing3", "ing4", "ing5", "ing6", "ing7", "ing8", "ing9"
            ]

        if len(cols) > 23:
            params.append("ing10")
            if len(cols) > 24:
                params.append("ing11")
                if len(cols) > 25:
                    params.append("ing12")

        for idx, param in enumerate(params):
            if idx < len(cols):
                stats_tuple_list.append((param, cols[idx].text.strip()))
            else:
                stats_tuple_list.append((param, ""))
        return dict(stats_tuple_list)

    def _create_bat_stats(self, status_elems: List[Any], target_date: datetime.date) -> List[Dict[str, str]]:
        stats: List[Dict[str, str]] = []
        for status_elem in status_elems:
            cols = status_elem.find_elements(By.CSS_SELECTOR, "td")
            if len(cols) >= 14:
                stats.append(self._create_bat_stats_detail(cols, target_date))
        return stats

    def _create_score_board(self, score_board_elems: List[Any]) -> Dict[str, str]:
        score_board_tuple_list: List[Tuple[str, str]] = []
        params = ["total", "ing1", "ing2", "ing3", "ing4", "ing5", "ing6", "ing7", "ing8", "ing9"]
        if len(score_board_elems) > 10:
            params.append("ing10")
            if len(score_board_elems) > 11:
                params.append("ing11")
                if len(score_board_elems) > 12:
                    params.append("ing12")

        for idx, param in enumerate(params):
            if idx < len(score_board_elems):
                score_board_tuple_list.append((param, score_board_elems[idx].text.strip()))
            else:
                score_board_tuple_list.append((param, ""))
        return dict(score_board_tuple_list)

    def scrape_game_stats(
        self,
        date_game_no: str,
        target_date: datetime.date,
        is_finished: bool,
    ) -> Tuple[PitcherStatsData, BatterStatsData]:
        url_prefix = "npb_practice" if is_tokyo_olympics_period(target_date) else "npb"
        stats_url = f"https://baseball.yahoo.co.jp/{url_prefix}/game/{date_game_no}/stats"
        self._driver.get(stats_url)
        self._wait()

        away_team_raw = ""
        home_team_raw = ""
        try:
            away_team_elem = self._driver.find_element(By.CSS_SELECTOR, SELECTORS["awayTeamFullName"])
            away_team_raw = away_team_elem.text
        except NoSuchElementException:
            pass

        try:
            home_team_elem = self._driver.find_element(By.CSS_SELECTOR, SELECTORS["homeTeamFullName"])
            home_team_raw = home_team_elem.text
        except NoSuchElementException:
            pass

        away_team = get_team_initial_from_text(away_team_raw)
        home_team = get_team_initial_from_text(home_team_raw)

        away_pitch_elems = self._driver.find_elements(By.CSS_SELECTOR, SELECTORS["awayPitchStats"])
        home_pitch_elems = self._driver.find_elements(By.CSS_SELECTOR, SELECTORS["homePitchStats"])
        away_pitch_stats = self._create_pitch_stats(away_pitch_elems, target_date)
        home_pitch_stats = self._create_pitch_stats(home_pitch_elems, target_date)

        pitcher_data = PitcherStatsData(
            away_team=away_team,
            away_stats=away_pitch_stats,
            home_team=home_team,
            home_stats=home_pitch_stats,
            is_finished=is_finished,
        )

        away_bat_elems = self._driver.find_elements(By.CSS_SELECTOR, SELECTORS["awayBatStats"])
        home_bat_elems = self._driver.find_elements(By.CSS_SELECTOR, SELECTORS["homeBatStats"])
        away_bat_stats = self._create_bat_stats(away_bat_elems, target_date)
        home_bat_stats = self._create_bat_stats(home_bat_elems, target_date)

        away_score_board_elems = self._driver.find_elements(By.CSS_SELECTOR, SELECTORS["awayScoreBoard"])
        home_score_board_elems = self._driver.find_elements(By.CSS_SELECTOR, SELECTORS["homeScoreBoard"])
        away_score_board = self._create_score_board(away_score_board_elems)
        home_score_board = self._create_score_board(home_score_board_elems)

        batter_data = BatterStatsData(
            away_team=away_team,
            away_stats=away_bat_stats,
            away_score_board=away_score_board,
            home_team=home_team,
            home_stats=home_bat_stats,
            home_score_board=home_score_board,
            is_finished=is_finished,
        )

        return pitcher_data, batter_data

    def scrape_text_stats(
        self,
        date_game_no: str,
        target_date: datetime.date,
    ) -> Optional[List[TextPlayItem]]:
        url_prefix = "npb_practice" if is_tokyo_olympics_period(target_date) else "npb"
        text_url = f"https://baseball.yahoo.co.jp/{url_prefix}/game/{date_game_no}/text"
        self._driver.get(text_url)
        self._wait()

        content_main = None
        for attempt in range(3):
            try:
                WebDriverWait(self._driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, SELECTORS["textLive"]))
                )
                content_main = self._driver.find_element(By.CSS_SELECTOR, SELECTORS["textLive"])
                break
            except Exception:
                if attempt == 2:
                    return None
                print(f"Retrying to locate #text_live... attempt: {attempt + 1}")
                self._driver.refresh()
                self._wait()

        if not content_main:
            return None

        data: List[TextPlayItem] = []
        order_list_elems = content_main.find_elements(By.CSS_SELECTOR, SELECTORS["batResult"])
        for order_list_elem in order_list_elems:
            try:
                inning = order_list_elem.find_element(By.CSS_SELECTOR, SELECTORS["batResultInning"]).text.strip()
            except NoSuchElementException:
                inning = ""
            try:
                team = order_list_elem.find_element(By.CSS_SELECTOR, SELECTORS["batResultTeam"]).text.strip()
            except NoSuchElementException:
                team = ""

            bat_result_units = order_list_elem.find_elements(By.CSS_SELECTOR, SELECTORS["batResultUnit"])
            for bat_result_unit in bat_result_units:
                summary_points = bat_result_unit.find_elements(By.CSS_SELECTOR, SELECTORS["summaryPoint"])
                if summary_points:
                    try:
                        no = bat_result_unit.find_element(By.CSS_SELECTOR, SELECTORS["batResultUnitNo"]).text.strip()
                    except NoSuchElementException:
                        no = ""
                    try:
                        order = bat_result_unit.find_element(By.CSS_SELECTOR, SELECTORS["batResultUnitOrder"]).text.strip()
                    except NoSuchElementException:
                        order = ""
                    try:
                        batter = bat_result_unit.find_element(By.CSS_SELECTOR, SELECTORS["batResultUnitBatter"]).text.strip()
                    except NoSuchElementException:
                        batter = ""

                    for summary_point in summary_points:
                        data.append(
                            TextPlayItem(
                                inning=inning,
                                team=team,
                                no=no,
                                order=order,
                                batter=batter,
                                detail=summary_point.text.strip(),
                            )
                        )
        return data