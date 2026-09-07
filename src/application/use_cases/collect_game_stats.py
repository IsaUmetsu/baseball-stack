import datetime
from typing import Any, List, Optional

from src.domain.repositories.game_stats_repository import GameStatsRepository

class CollectGameStatsUseCase:
    def __init__(
        self,
        game_stats_repository: GameStatsRepository,
        game_stats_scraper: Any,  # Scraper interface will be defined and injected in a later step
    ):
        self._repository = game_stats_repository
        self._scraper = game_stats_scraper

    def execute(
        self,
        start_date: datetime.date,
        end_date: datetime.date,
        game_kind: Optional[str] = None,
        specify: Optional[List[str]] = None,
        exclude: Optional[List[str]] = None,
    ):
        """
        Orchestrates the collection of game stats for a given date range.

        This method contains the high-level logic flow:
        1. Loop through the specified date range.
        2. For each date, ask the scraper to get game information.
        3. For each game, tell the scraper to fetch detailed stats.
        4. Pass the fetched data to the repository for persistence.
        """
        current_date = start_date
        while current_date <= end_date:
            print(f"--- Processing date: {current_date.strftime('%Y-%m-%d')} ---")

            # The actual implementation of the scraper will be done in a future step.
            # The following lines are placeholders to illustrate the intended workflow.

            print("  (Placeholder) Step 1: Getting game list for the day from a scraper.")
            # e.g., game_infos = self._scraper.get_game_infos_for_date(current_date)

            print("  (Placeholder) Step 2: Looping through each game...")
            # e.g., for game_info in game_infos:

            print("    (Placeholder) Step 3: Scraping all stats for a single game.")
            # e.g., game_stats = self._scraper.scrape_game_stats(game_info)
            
            print("    (Placeholder) Step 4: Saving the scraped data via the repository.")
            # e.g., if game_stats: self._repository.save(game_stats)
            
            current_date += datetime.timedelta(days=1)
        
        print("\nCollection process finished.")
