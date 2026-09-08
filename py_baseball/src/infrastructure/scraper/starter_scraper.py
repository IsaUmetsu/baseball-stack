
import re
from datetime import date
from typing import List, Optional

from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException

from src.domain.models.starter import StarterGameStats, TeamStarterInfo

class SeleniumStarterScraper:

    def __init__(self, driver: WebDriver):
        self._driver = driver
        self._team_initials = {
            '巨人': 'G', 'ヤクルト': 'S', 'ＤｅＮＡ': 'DB', '中日': 'D', '阪神': 'T', '広島': 'C',
            'ソフトバンク': 'H', 'ロッテ': 'M', '西武': 'L', '楽天': 'E', '日本ハム': 'F', 'オリックス': 'B',
            '読売': 'G', '東京ヤクルト': 'S', '横浜ＤｅＮＡ': 'DB', '中日': 'D', '阪神': 'T', '広島東洋': 'C',
            '福岡ソフトバンク': 'H', '千葉ロッテ': 'M', '埼玉西武': 'L', '東北楽天': 'E', '北海道日本ハム': 'F', 'オリックス': 'B'
        }

    def _get_team_initial(self, team_name: str) -> str:
        return self._team_initials.get(team_name, team_name)

    def get_game_nos(self, target_date: date) -> List[str]:
        base_url = "https://npb.jp/games/{year}/schedule_{month:02d}.html"
        url = base_url.format(year=target_date.year, month=target_date.month)
        self._driver.get(url)
        
        game_nos = []
        date_str = target_date.strftime("%m月%d日")
        
        # セレクタを動的に生成
        row_selector = f'//tr[contains(td[1], "{date_str}")]'
        game_link_selector = f'{row_selector}//a[contains(@href, "/games/{target_date.year}/")]'

        try:
            links = self._driver.find_elements(By.XPATH, game_link_selector)
            for link in links:
                href = link.get_attribute('href')
                match = re.search(r'2021(\d{4})', href)
                if match:
                    game_nos.append(match.group(1))
        except NoSuchElementException:
            print(f"No games found for date: {target_date.strftime('%Y-%m-%d')}")

        return game_nos
        
    def _is_tokyo_olympics_period(self, target_date: date):
        # 簡易的な判定
        return date(2021, 7, 14) <= target_date <= date(2021, 8, 12)

    def scrape_game_starter(self, game_no_str: str, target_date: date) -> Optional[StarterGameStats]:
        date_game_no = f"2021{game_no_str}"
        
        base_url = "https://npb.jp/games/2021/daily/deck/{date_game_no}.html"
        if self._is_tokyo_olympics_period(target_date):
             # 練習試合用のURL
             base_url = "https://npb.jp/games/2021/daily/deck/npb_practice/{date_game_no}.html"

        url = base_url.format(date_game_no=date_game_no)
        self._driver.get(url)

        try:
            start_time = self._driver.find_element(By.ID, 'time').text
            
            # --- チーム名取得 ---
            try:
                # 試合前
                game_recent_elem = self._driver.find_element(By.ID, "gm_recen")
                away_team_name = game_recent_elem.find_element(By.CSS_SELECTOR, ".teams > .away > .team_name > a").text
                home_team_name = game_recent_elem.find_element(By.CSS_SELECTOR, ".teams > .home > .team_name > a").text
            except NoSuchElementException:
                # 試合開始後
                ing_brd_elem = self._driver.find_element(By.ID, "ing_brd")
                away_team_name = ing_brd_elem.find_element(By.CSS_SELECTOR, ".away > .name").text
                home_team_name = ing_brd_elem.find_element(By.CSS_SELECTOR, ".home > .name").text

            away_team = self._get_team_initial(away_team_name)
            home_team = self._get_team_initial(home_team_name)

            # --- 先発投手取得 ---
            try:
                # 試合前
                strt_pit_elem = self._driver.find_element(By.ID, "strt_pit")
                away_pitcher = strt_pit_elem.find_element(By.CSS_SELECTOR, ".away .name").text
                home_pitcher = strt_pit_elem.find_element(By.CSS_SELECTOR, ".home .name").text
                
                return StarterGameStats(
                    start=start_time,
                    away=TeamStarterInfo(team=away_team, pitcher=away_pitcher),
                    home=TeamStarterInfo(team=home_team, pitcher=home_pitcher)
                )

            except NoSuchElementException:
                # 試合開始後
                strt_mem_elem = self._driver.find_element(By.ID, "strt_mem")
                away_pitcher = strt_mem_elem.find_element(By.XPATH, "//div[@id='st_member']//div[contains(@class, 'away')]//table//tr[1]/td[2]").text
                home_pitcher = strt_mem_elem.find_element(By.XPATH, "//div[@id='st_member']//div[contains(@class, 'home')]//table//tr[1]/td[2]").text
                
                return StarterGameStats(
                    start=start_time,
                    away=TeamStarterInfo(team=away_team, pitcher=away_pitcher),
                    home=TeamStarterInfo(team=home_team, pitcher=home_pitcher)
                )

        except NoSuchElementException:
            # 試合中止
            try:
                game_title = self._driver.find_element(By.CSS_SELECTOR, "#gm_card .teams").text
                # "チーム名 vs. チーム名" の形式を想定
                parts = [p.strip() for p in game_title.split('vs.')]
                if len(parts) == 2:
                    home_team_name = parts[0]
                    away_team_name = parts[1]
                    away_team = self._get_team_initial(away_team_name)
                    home_team = self._get_team_initial(home_team_name)
                    
                    return StarterGameStats(
                        start= "中止", # or some other status
                        away=TeamStarterInfo(team=away_team),
                        home=TeamStarterInfo(team=home_team)
                    )
            except NoSuchElementException:
                print(f"Could not parse cancelled game for game_no: {game_no_str}")
                return None
        return None
