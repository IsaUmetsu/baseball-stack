import re
import time
from typing import Optional, Tuple
from selenium.webdriver.chrome.webdriver import WebDriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

from src.infrastructure.scraper.scene_selectors import SELECTORS, get_inning_selector


class SceneStuckException(Exception):
    """Raised when replay next is clicked but scene signature does not change within timeout."""
    pass


class SceneNavigator:
    def __init__(self, driver: WebDriver):
        self.driver = driver

    def safe_click(self, elem) -> None:
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", elem)
        try:
            elem.click()
        except Exception:
            self.driver.execute_script("arguments[0].click();", elem)

    def get_content_main(self):
        try:
            return self.driver.find_element(By.CSS_SELECTOR, SELECTORS["contentMain"])
        except Exception:
            return self.driver

    def navigate_to_inning(self, from_inning: int, from_top_btm: str) -> bool:
        ctx = self.get_content_main()
        selector = get_inning_selector(from_inning, from_top_btm)
        elems = ctx.find_elements(By.CSS_SELECTOR, selector)
        if not elems:
            return False

        self.safe_click(elems[0])
        expected = f"{from_inning}回{from_top_btm}"
        try:
            WebDriverWait(self.driver, 10).until(
                lambda d: d.find_element(By.CSS_SELECTOR, SELECTORS["inning"]).text.strip() == expected
            )
        except Exception:
            pass

        try:
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, SELECTORS["contentMain"]))
            )
            return True
        except TimeoutException:
            return False

    def ensure_replay_mode(self) -> None:
        ctx = self.get_content_main()
        if ctx.find_elements(By.CSS_SELECTOR, SELECTORS["replayNext"]):
            return

        for sel in ["#replay a", "#replay dl dd a", "#replay td a", "#replay dt", "#replay_title"]:
            elems = ctx.find_elements(By.CSS_SELECTOR, sel)
            target = next((e for e in elems if e.is_displayed() and e.is_enabled()), None)
            if target:
                self.safe_click(target)
                try:
                    WebDriverWait(self.driver, 10).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, SELECTORS["contentMain"]))
                    )
                except TimeoutException:
                    pass
                break

    def rewind_to_start_of_inning(self, from_inning: int, from_top_btm: str) -> None:
        if from_inning <= 1 and from_top_btm == "表":
            return

        ctx = self.get_content_main()
        back_elems = ctx.find_elements(By.CSS_SELECTOR, SELECTORS["replayBack"])
        if back_elems:
            self.safe_click(back_elems[0])

        while True:
            ctx = self.get_content_main()
            cnt_elems = ctx.find_elements(By.CSS_SELECTOR, SELECTORS["inningBatterCnt"])
            cnt_text = cnt_elems[0].text.strip() if cnt_elems else ""
            if len(cnt_text) > 0:
                nxt = ctx.find_elements(By.CSS_SELECTOR, SELECTORS["replayNext"])
                if nxt:
                    self.safe_click(nxt[0])
                break
            else:
                back = ctx.find_elements(By.CSS_SELECTOR, SELECTORS["replayBack"])
                if not back:
                    break
                self.safe_click(back[0])

    def get_scene_signature(self) -> Optional[Tuple[str, ...]]:
        try:
            ctx = self.get_content_main()
            def txt(sel):
                e = ctx.find_elements(By.CSS_SELECTOR, SELECTORS[sel])
                return e[0].text.strip() if e else ""
            p_elems = ctx.find_elements(By.CSS_SELECTOR, SELECTORS["pitchDetail"])
            p_text = "|".join([e.text for e in p_elems])
            return (txt("inning"), txt("inningBatterCnt"), txt("currentBatterName"), txt("currentPitchCount"), txt("battingResult"), txt("pitchingResult"), p_text)
        except Exception:
            return None

    def advance_to_next_scene(self, current_inning_str: str) -> bool:
        prev_sig = self.get_scene_signature()
        ctx = self.get_content_main()
        next_elems = ctx.find_elements(By.CSS_SELECTOR, SELECTORS["replayNext"])
        if not next_elems:
            return False

        self.safe_click(next_elems[0])
        start_wait = time.time()
        while time.time() - start_wait < 20.0:
            time.sleep(0.5)
            try:
                curr_sig = self.get_scene_signature()
                if curr_sig != prev_sig:
                    return True
            except Exception:
                pass

        ctx = self.get_content_main()
        inning_elems = ctx.find_elements(By.CSS_SELECTOR, SELECTORS["inning"])
        if inning_elems and inning_elems[0].text.strip() == "試合終了":
            return False

        print(f"[WARN] Scene signature did not change at {current_inning_str}.")
        raise SceneStuckException(f"Scene signature did not change at {current_inning_str}.")

