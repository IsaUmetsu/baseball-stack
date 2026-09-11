import datetime
import re
import time
from typing import List, Optional

from selenium.common.exceptions import NoSuchElementException, TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from src.domain.models.starter import StarterInfo, TeamStarter
from src.infrastructure.scraper.scene_selectors import (
    LEAGUE_2021,
    get_team_initial,
    is_tokyo_olympics_period,
)

SELECTORS = {
    "gameCards": "#gm_card .bb-score__content",
    "startTime": "#gm_brd .bb-gameDescription time",
    "gameState": ".bb-gameCard__state",
    "gameDetailTeams": "#async-gameDetail .bb-gameTeam .bb-gameTeam__name",
    "gameDetailAttacks": "#async-gameTeamAttack p",
    "gmRecen": "#gm_recen",
    "awayTeam": "#gm_recen .bb-gameCard__readMore .bb-gameCard__readMoreItem:nth-child(2) span",
    "homeTeam": "#gm_recen .bb-gameCard__readMore .bb-gameCard__readMoreItem:nth-child(1) span",
    "strtPit": "#strt_pit",
    "awayStartPitcher": "#strt_pit .bb-splits__item:nth-child(2) header h1 a",
    "homeStartPitcher": "#strt_pit .bb-splits__item:nth-child(1) header h1 a",
    "ingBrd": "#ing_brd",
    "awayTeamPast": "#ing_brd tbody tr:nth-child(1) td:nth-child(1)",
    "homeTeamPast": "#ing_brd tbody tr:nth-child(2) td:nth-child(1)",
    "strtMem": "#strt_mem",
    "awayStartPitcherPast": "#strt_mem section .bb-splits__item:nth-child(2) table:nth-child(2) tbody tr td:nth-child(3)",
    "homeStartPitcherPast": "#strt_mem section .bb-splits__item:nth-child(1) table:nth-child(2) tbody tr td:nth-child(3)",
    "gameTitleSpan": "#gm_menu section header h1 span",
}


class SeleniumStarterScraper:
    def __init__(self, driver: WebDriver):
        self._driver = driver

    def get_game_nos(self, target_date: datetime.date) -> List[str]:
        if is_tokyo_olympics_period(target_date):
            date_mmdd = target_date.strftime("%m%d")
            if date_mmdd in LEAGUE_2021:
                start, end = LEAGUE_2021[date_mmdd]
                return [f"00{n}" for n in range(start, end + 1)]
            return []

        schedule_url = f"https://baseball.yahoo.co.jp/npb/schedule/?date={target_date.strftime('%Y-%m-%d')}"
        self._driver.get(schedule_url)
        try:
            WebDriverWait(self._driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, SELECTORS["gameCards"]))
            )
        except TimeoutException:
            return []

        elems = self._driver.find_elements(By.CSS_SELECTOR, SELECTORS["gameCards"])
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


    def scrape_game_starter(self, game_no_str: str, target_date: datetime.date) -> Optional[StarterInfo]:
        date_game_no = f"2021{game_no_str}"
        top_url = (
            f"https://baseball.yahoo.co.jp/npb_practice/game/{date_game_no}/top"
            if is_tokyo_olympics_period(target_date)
            else f"https://baseball.yahoo.co.jp/npb/game/{date_game_no}/top"
        )
        self._driver.get(top_url)
        time.sleep(1)

        # 試合中止等の状態判定
        state_elems = self._driver.find_elements(By.CSS_SELECTOR, SELECTORS["gameState"])
        state_text = state_elems[0].text.strip() if state_elems else ""

        if "中止" in state_text:
            return self._extract_cancelled_game()

        start_time = ""
        try:
            start_time_elem = self._driver.find_element(By.CSS_SELECTOR, SELECTORS["startTime"])
            start_time = start_time_elem.text.strip()
        except NoSuchElementException:
            start_time = ""

        try:
            away, home = "", ""
            gm_recen_elems = self._driver.find_elements(By.CSS_SELECTOR, SELECTORS["gmRecen"])
            if gm_recen_elems:
                away = get_team_initial(self._driver.find_element(By.CSS_SELECTOR, SELECTORS["awayTeam"]).text.strip())
                home = get_team_initial(self._driver.find_element(By.CSS_SELECTOR, SELECTORS["homeTeam"]).text.strip())
            else:
                away = get_team_initial(self._driver.find_element(By.CSS_SELECTOR, SELECTORS["awayTeamPast"]).text.strip())
                home = get_team_initial(self._driver.find_element(By.CSS_SELECTOR, SELECTORS["homeTeamPast"]).text.strip())

            away_pitcher, home_pitcher = "", ""
            strt_pit_elems = self._driver.find_elements(By.CSS_SELECTOR, SELECTORS["strtPit"])
            if strt_pit_elems:
                away_pitcher = self._driver.find_element(By.CSS_SELECTOR, SELECTORS["awayStartPitcher"]).text.strip()
                home_pitcher = self._driver.find_element(By.CSS_SELECTOR, SELECTORS["homeStartPitcher"]).text.strip()
            else:
                away_pitcher = self._driver.find_element(By.CSS_SELECTOR, SELECTORS["awayStartPitcherPast"]).text.strip()
                home_pitcher = self._driver.find_element(By.CSS_SELECTOR, SELECTORS["homeStartPitcherPast"]).text.strip()

            return StarterInfo(
                start=start_time,
                away=TeamStarter(team=away, pitcher=away_pitcher),
                home=TeamStarter(team=home, pitcher=home_pitcher),
            )

        except NoSuchElementException:
            # 万が一状態判定をすり抜けた場合の中止フォールバック
            return self._extract_cancelled_game()

    def _extract_cancelled_game(self) -> Optional[StarterInfo]:
        try:
            away, home = "", ""
            team_elems = self._driver.find_elements(By.CSS_SELECTOR, SELECTORS["gameDetailTeams"])
            attack_elems = self._driver.find_elements(By.CSS_SELECTOR, SELECTORS["gameDetailAttacks"])

            if len(team_elems) >= 2:
                team1 = get_team_initial(team_elems[0].text.strip())
                team2 = get_team_initial(team_elems[1].text.strip())
                if attack_elems and "後攻" in attack_elems[0].text:
                    home, away = team1, team2
                else:
                    away, home = team1, team2
            else:
                title = self._driver.title
                match = re.search(r'([^\s]+)vs\.([^\s\-]+)', title)
                if match:
                    home = get_team_initial(match.group(1).strip())
                    away = get_team_initial(match.group(2).strip())
                else:
                    title_elem = self._driver.find_element(By.CSS_SELECTOR, SELECTORS["gameTitleSpan"])
                    title_text = title_elem.get_attribute("textContent") or ""
                    teams = title_text.split(" vs. ")
                    if len(teams) >= 2:
                        home = get_team_initial(teams[0].strip())
                        away = get_team_initial(teams[1].strip())

            if not away and not home:
                return None

            return StarterInfo(
                start="試合中止",
                away=TeamStarter(team=away, pitcher=None),
                home=TeamStarter(team=home, pitcher=None),
            )
        except Exception as e:
            print(f"[ERROR] Failed to parse cancelled game: {e}")
            return None

