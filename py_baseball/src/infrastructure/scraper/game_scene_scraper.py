import datetime
import re
from typing import List, Tuple, Optional

from selenium.webdriver.chrome.webdriver import WebDriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

from src.domain.models.game_scene import GameScene, TeamDetailInfo
from src.infrastructure.scraper.scene_selectors import (
    SELECTORS, LEAGUE_2021, get_team_initial, is_tokyo_olympics_period
)
from src.infrastructure.scraper.scene_navigator import SceneNavigator
from src.infrastructure.scraper.scene_parser import (
    parse_live_header, parse_live_body, parse_pitch_info
)
from src.infrastructure.scraper.scene_team_parser import parse_team_info


class SeleniumGameSceneScraper:
    def __init__(self, driver: WebDriver):
        self.driver = driver
        self.navigator = SceneNavigator(driver)

    def get_game_nos(self, target_date: datetime.date) -> List[str]:
        if is_tokyo_olympics_period(target_date):
            date_mmdd = target_date.strftime("%m%d")
            if date_mmdd in LEAGUE_2021:
                start, end = LEAGUE_2021[date_mmdd]
                return [f"00{n}" for n in range(start, end + 1)]
            return []

        schedule_url = f"https://baseball.yahoo.co.jp/npb/schedule/?date={target_date.strftime('%Y-%m-%d')}"
        self.driver.get(schedule_url)
        try:
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, SELECTORS["gameCards"]))
            )
        except TimeoutException:
            return []

        elems = self.driver.find_elements(By.CSS_SELECTOR, SELECTORS["gameCards"])
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

    def open_game_score(self, target_date: datetime.date, game_no_str: str) -> bool:
        date_game_no = f"2021{game_no_str}"
        score_url = (
            f"https://baseball.yahoo.co.jp/npb_practice/game/{date_game_no}/score"
            if is_tokyo_olympics_period(target_date)
            else f"https://baseball.yahoo.co.jp/npb/game/{date_game_no}/score"
        )
        self.driver.get(score_url)
        try:
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, SELECTORS["contentMain"]))
            )
            return True
        except TimeoutException:
            return False

    def get_game_initial_info(self) -> Tuple[str, str, str, str, str]:
        ctx = self.navigator.get_content_main()
        def txt(sel):
            e = ctx.find_elements(By.CSS_SELECTOR, SELECTORS[sel])
            return e[0].text.strip() if e else ""
        away_t = txt("teamInitialAway")
        home_t = txt("teamInitialHome")
        return away_t, home_t, get_team_initial(away_t), get_team_initial(home_t), txt("inning")

    def navigate_to_inning(self, from_inning: int, from_top_btm: str) -> bool:
        return self.navigator.navigate_to_inning(from_inning, from_top_btm)

    def ensure_replay_mode(self) -> None:
        self.navigator.ensure_replay_mode()

    def rewind_to_start_of_inning(self, from_inning: int, from_top_btm: str) -> None:
        self.navigator.rewind_to_start_of_inning(from_inning, from_top_btm)

    def extract_current_scene(
        self,
        team_away: str,
        team_home: str,
        cached_home: Optional[TeamDetailInfo],
        cached_away: Optional[TeamDetailInfo],
        cached_inning: Optional[str]
    ) -> Tuple[GameScene, TeamDetailInfo, TeamDetailInfo, str]:
        ctx = self.navigator.get_content_main()
        live_header = parse_live_header(ctx, team_away, team_home)
        live_body = parse_live_body(ctx)
        pitch_info = parse_pitch_info(ctx)

        curr_inning = live_header.inning
        force_reload = (cached_home is None or cached_away is None or cached_inning != curr_inning)

        if not force_reload and live_body.currentBatterInfo and live_body.currentBatterInfo.name:
            b_name = live_body.currentBatterInfo.name
            if not any(any(p.name == b_name for p in t.order) for t in [cached_home, cached_away] if t):
                force_reload = True

        if not force_reload and live_body.currentPicherInfo and live_body.currentPicherInfo.name:
            p_name = live_body.currentPicherInfo.name
            if not any(p_name in t.batteryInfo for t in [cached_home, cached_away] if t):
                force_reload = True

        if not force_reload:
            for runner in live_body.onbaseInfo:
                if runner.player and not any(any(p.name == runner.player for p in t.order) for t in [cached_home, cached_away] if t):
                    force_reload = True
                    break

        if force_reload:
            cached_home = parse_team_info(ctx, "homeTeamElemId")
            cached_away = parse_team_info(ctx, "awayTeamElemId")
            cached_inning = curr_inning

        scene = GameScene(
            liveHeader=live_header,
            liveBody=live_body,
            pitchInfo=pitch_info,
            homeTeamInfo=cached_home,
            awayTeamInfo=cached_away,
        )
        return scene, cached_home, cached_away, cached_inning

    def advance_to_next_scene(self, current_inning_str: str) -> bool:
        return self.navigator.advance_to_next_scene(current_inning_str)

