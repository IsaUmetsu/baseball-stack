import time
from typing import List
from selenium.webdriver.common.by import By
from selenium.common.exceptions import StaleElementReferenceException

from src.domain.models.game_scene import TeamDetailInfo, OrderItem, BenchMemberItem
from src.infrastructure.scraper.scene_selectors import SELECTORS


def _get_text(ctx, selector_key: str) -> str:
    elems = ctx.find_elements(By.CSS_SELECTOR, SELECTORS[selector_key])
    return elems[0].text.strip() if elems else ""


def parse_team_info(ctx, elem_id_selector_key: str) -> TeamDetailInfo:
    parent_sel = SELECTORS[elem_id_selector_key]
    for attempt in range(3):
        try:
            team_elems = ctx.find_elements(By.CSS_SELECTOR, parent_sel)
            if not team_elems:
                return TeamDetailInfo(name="")
            t_ctx = team_elems[0]

            name = _get_text(t_ctx, "teamName")
            team_order: List[OrderItem] = []
            for elem in t_ctx.find_elements(By.CSS_SELECTOR, SELECTORS["teamOrder"]):
                tds = elem.find_elements(By.TAG_NAME, "td")
                if tds:
                    links = tds[2].find_elements(By.TAG_NAME, "a") if len(tds) > 2 else []
                    nm_t = links[0].text.strip() if links else (tds[2].text.strip() if len(tds) > 2 else "")
                    team_order.append(OrderItem(
                        no=tds[0].text.strip() if len(tds) > 0 else "",
                        position=tds[1].text.strip() if len(tds) > 1 else "",
                        name=nm_t,
                        domainHand=tds[3].text.strip() if len(tds) > 3 else "",
                        average=tds[4].text.strip() if len(tds) > 4 else "",
                    ))

            battery_info = "".join([e.text for e in t_ctx.find_elements(By.CSS_SELECTOR, SELECTORS["teamBattery"])])
            homerun_info = "".join([e.text for e in t_ctx.find_elements(By.CSS_SELECTOR, SELECTORS["teamHomerun"])])

            def parse_bench(sel_key: str) -> List[BenchMemberItem]:
                members: List[BenchMemberItem] = []
                for e in t_ctx.find_elements(By.CSS_SELECTOR, SELECTORS[sel_key]):
                    if e.get_attribute("class") == "bb-splitsTable__row":
                        tds = e.find_elements(By.TAG_NAME, "td")
                        links = tds[0].find_elements(By.TAG_NAME, "a") if len(tds) > 0 else []
                        m_nm = links[0].text.strip() if links else (tds[0].text.strip() if len(tds) > 0 else "")
                        members.append(BenchMemberItem(
                            name=m_nm,
                            domainHand=tds[1].text.strip() if len(tds) > 1 else "",
                            average=tds[2].text.strip() if len(tds) > 2 else "",
                        ))
                return members

            return TeamDetailInfo(
                name=name,
                order=team_order,
                batteryInfo=battery_info,
                homerunInfo=homerun_info,
                benchPitcher=parse_bench("benchPitcherInfo"),
                benchCatcher=parse_bench("benchCatcherInfo"),
                benchInfielder=parse_bench("benchInfielderInfo"),
                benchOutfielder=parse_bench("benchOutfielderInfo"),
            )
        except StaleElementReferenceException:
            if attempt == 2:
                break
            time.sleep(0.3)

    return TeamDetailInfo(name="")
