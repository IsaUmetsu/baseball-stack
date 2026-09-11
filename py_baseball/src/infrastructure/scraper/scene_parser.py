import re
import time
from typing import List, Dict
from selenium.webdriver.common.by import By
from selenium.common.exceptions import StaleElementReferenceException

from src.domain.models.game_scene import (
    LiveHeader, LiveScore, LiveCount, LiveBody, OnbaseInfo,
    CurrentBatterInfo, CurrentPitcherInfo, PitchInfo, PitchDetail,
    PitchCourse, GameResultPlayer
)
from src.infrastructure.scraper.scene_selectors import SELECTORS


def _get_text(ctx, sel_key: str) -> str:
    elems = ctx.find_elements(By.CSS_SELECTOR, SELECTORS[sel_key])
    return elems[0].text.strip() if elems else ""


def parse_live_header(ctx, team_away: str, team_home: str) -> LiveHeader:
    inning_text = _get_text(ctx, "inning")
    if inning_text == "試合終了":
        for _ in range(10):
            time.sleep(0.5)
            inning_text = _get_text(ctx, "inning")
            if inning_text != "試合終了":
                break

    return LiveHeader(
        inning=inning_text,
        away=LiveScore(teamInitial=team_away, currentScore=_get_text(ctx, "currentScoreAway")),
        home=LiveScore(teamInitial=team_home, currentScore=_get_text(ctx, "currentScoreHome")),
        count=LiveCount(
            b=len(_get_text(ctx, "countBall")),
            s=len(_get_text(ctx, "countStrike")),
            o=len(_get_text(ctx, "countOut")),
        ),
    )


def parse_live_body(ctx) -> LiveBody:
    onbase_list: List[OnbaseInfo] = []
    for attempt in range(3):
        try:
            elems = ctx.find_elements(By.CSS_SELECTOR, SELECTORS["onbaseInfo"])
            onbase_list = [OnbaseInfo(base=e.get_attribute("id") or "", player=e.text.strip()) for e in elems]
            break
        except StaleElementReferenceException:
            if attempt == 2:
                break
            time.sleep(0.3)

    return LiveBody(
        battingResult=_get_text(ctx, "battingResult"),
        pitchingResult=_get_text(ctx, "pitchingResult"),
        onbaseInfo=onbase_list,
        currentBatterInfo=CurrentBatterInfo(
            name=_get_text(ctx, "currentBatterName"),
            playerNo=_get_text(ctx, "currentBatterPlayerNo"),
            domainHand=_get_text(ctx, "currentBatterDomainHand"),
            average=_get_text(ctx, "currentBatterRate"),
            prevResult=_get_text(ctx, "currentBatterPrevResult"),
        ),
        currentPicherInfo=CurrentPitcherInfo(
            name=_get_text(ctx, "currentPitcherName"),
            playerNo=_get_text(ctx, "currentPitcherPlayerNo"),
            domainHand=_get_text(ctx, "currentPitcherHand"),
            pitch=_get_text(ctx, "currentPitchCount"),
            vsBatterCount=_get_text(ctx, "currentPitcherVSBatterCount"),
            pitchERA=_get_text(ctx, "currentPitchERA"),
        ),
        nextBatter=_get_text(ctx, "nextBatter"),
        inningBatterCnt=_get_text(ctx, "inningBatterCnt"),
    )


def parse_pitch_info(ctx) -> PitchInfo:
    pitch_details: List[PitchDetail] = []
    for attempt in range(3):
        try:
            elems = ctx.find_elements(By.CSS_SELECTOR, SELECTORS["pitchDetail"])
            current_details: List[PitchDetail] = []
            for elem in elems:
                tds = elem.find_elements(By.TAG_NAME, "td")
                icon = ""
                if len(tds) > 0:
                    spans = tds[0].find_elements(By.TAG_NAME, "span")
                    if spans:
                        parts = (spans[0].get_attribute("class") or "").split(" ")
                        if len(parts) > 1:
                            icon = parts[1][-1:]
                current_details.append(PitchDetail(
                    judgeIcon=icon,
                    pitchCnt=tds[1].text.strip() if len(tds) > 1 else "",
                    pitchType=tds[2].text.strip() if len(tds) > 2 else "",
                    pitchSpeed=tds[3].text.strip() if len(tds) > 3 else "",
                    pitchJudgeDetail=tds[4].text.strip() if len(tds) > 4 else "",
                ))
            pitch_details = current_details
            break
        except (StaleElementReferenceException, AttributeError, IndexError):
            if attempt == 2:
                break
            time.sleep(0.3)

    pitch_courses: List[PitchCourse] = []
    for attempt in range(3):
        try:
            elems = ctx.find_elements(By.CSS_SELECTOR, SELECTORS["pitchingCourse"])
            current_courses: List[PitchCourse] = []
            for course in elems:
                nums = re.findall(r'-?\d+', course.get_attribute("style") or "")
                top_v = nums[0] if len(nums) > 0 else ""
                left_v = nums[1] if len(nums) > 1 else ""
                current_courses.append(PitchCourse(top=top_v, left=left_v))
            pitch_courses = current_courses
            break
        except (StaleElementReferenceException, TypeError, IndexError):
            if attempt == 2:
                break
            time.sleep(0.3)

    return PitchInfo(
        pitchDetails=pitch_details,
        allPitchCourse=pitch_courses,
        gameResult={
            "left": GameResultPlayer(
                title=_get_text(ctx, "gameResultLeftTitle"),
                name=_get_text(ctx, "gameResultLeftName"),
                domainHand=_get_text(ctx, "gameResultLeftDomainHand"),
            ),
            "right": GameResultPlayer(
                title=_get_text(ctx, "gameResultRightTitle"),
                name=_get_text(ctx, "gameResultRightName"),
                domainHand=_get_text(ctx, "gameResultRightDomainHand"),
            ),
        },
    )
