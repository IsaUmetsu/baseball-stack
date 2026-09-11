import datetime
import time
import traceback
from typing import List, Optional

from src.domain.repositories.starter_repository import StarterRepository
from src.infrastructure.scraper.starter_scraper import SeleniumStarterScraper


class CollectStartersUseCase:
    def __init__(
        self,
        starter_repository: StarterRepository,
        starter_scraper: SeleniumStarterScraper,
    ):
        self._repository = starter_repository
        self._scraper = starter_scraper

    def execute(
        self,
        start_date: datetime.date,
        end_date: datetime.date,
        specify: Optional[List[str]] = None,
        exclude: Optional[List[str]] = None,
        **kwargs,
    ):
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime("%Y%m%d")
            print(f"--- Processing date: {current_date.strftime('%Y-%m-%d')} ---")

            try:
                game_nos = self._scraper.get_game_nos(current_date)
                if not game_nos:
                    print(f"No games found for date: {current_date.strftime('%Y-%m-%d')}")
                    current_date += datetime.timedelta(days=1)
                    continue
            except Exception as e:
                print(f"Error fetching game numbers for {current_date.strftime('%Y-%m-%d')}: {e}")
                current_date += datetime.timedelta(days=1)
                continue

            for idx, game_no_str in enumerate(game_nos):
                game_seq = str(idx + 1)
                file_name = f"{idx + 1:02d}.json"

                if specify and game_seq not in specify:
                    print(f"  [SKIP] Game {game_no_str} (index: {game_seq}) is not in the specify list.")
                    continue
                if exclude and game_seq in exclude:
                    print(f"  [SKIP] Game {game_no_str} (index: {game_seq}) is in the exclude list.")
                    continue

                try:
                    time.sleep(1)
                    starter_info = self._scraper.scrape_game_starter(game_no_str, current_date)

                    if starter_info:
                        self._repository.save(starter_info, date_str=date_str, file_name=file_name)
                        print(
                            f"  [DONE] Saved starter for {date_str}-{file_name}: "
                            f"{starter_info.away.team} vs {starter_info.home.team}"
                        )
                    else:
                        print(f"  [WARN] No starter info found for {date_str}-{file_name}")

                except Exception:
                    print(f"  [ERROR] Failed to process game {date_str}-{file_name}:")
                    traceback.print_exc()
                    continue

            current_date += datetime.timedelta(days=1)

        print("\nStarter collection process finished.")


