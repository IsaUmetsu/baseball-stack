
import time
from datetime import date, timedelta
from typing import List, Optional
from src.domain.repositories.starter_repository import StarterRepository
from src.infrastructure.scraper.starter_scraper import SeleniumStarterScraper

class CollectStartersUseCase:
    def __init__(self, scraper: SeleniumStarterScraper, repository: StarterRepository):
        self._scraper = scraper
        self._repository = repository

    def execute(
        self,
        target_date: date,
        specify_games: Optional[List[int]] = None,
        exclude_games: Optional[List[int]] = None
    ):
        print(f"----- Processing date: {target_date.strftime('%Y-%m-%d')} -----")
        
        try:
            game_nos = self._scraper.get_game_nos(target_date)
            if not game_nos:
                print(f"No games found for date: {target_date.strftime('%Y-%m-%d')}")
                return
        except Exception as e:
            print(f"Error fetching game numbers for {target_date.strftime('%Y-%m-%d')}: {e}")
            return

        for idx, game_no_str in enumerate(game_nos):
            game_idx = idx + 1

            if specify_games and game_idx not in specify_games:
                continue
            if exclude_games and game_idx in exclude_games:
                continue

            try:
                # 1秒待機
                time.sleep(1)

                game_stats = self._scraper.scrape_game_starter(game_no_str, target_date)
                
                if game_stats:
                    self._repository.save(game_stats, target_date, game_idx)
                    print(f"[SUCCESS] Saved starter for {target_date.strftime('%Y%m%d')}-{game_idx:02d}: {game_stats.away.team} vs {game_stats.home.team}")
                else:
                    print(f"[INFO] No starter info found for {target_date.strftime('%Y%m%d')}-{game_idx:02d}")

            except Exception as e:
                import traceback
                print(f"[ERROR] Failed to process game {target_date.strftime('%Y%m%d')}-{game_idx:02d}")
                traceback.print_exc()

