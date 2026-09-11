import datetime
import traceback
from typing import List, Optional

from src.domain.repositories.game_stats_repository import GameStatsRepository
from src.infrastructure.scraper.game_stats_scraper import SeleniumGameStatsScraper
from src.infrastructure.scraper.scene_selectors import is_tokyo_olympics_period


class CollectGameStatsUseCase:
    def __init__(
        self,
        game_stats_repository: GameStatsRepository,
        game_stats_scraper: SeleniumGameStatsScraper,
    ):
        self._repository = game_stats_repository
        self._scraper = game_stats_scraper

    def execute(
        self,
        start_date: datetime.date,
        end_date: datetime.date,
        specify: Optional[List[str]] = None,
        exclude: Optional[List[str]] = None,
        **kwargs,
    ) -> None:
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime("%Y%m%d")
            print(f"--- Processing date: {current_date.strftime('%Y-%m-%d')} ---")
            game_nos = self._scraper.get_game_nos(current_date)

            for idx, game_no in enumerate(game_nos):
                game_seq = str(idx + 1)
                file_name = f"{idx + 1:02d}.json"

                if specify and game_seq not in specify:
                    print(f"  [SKIP] Game {game_no} (index: {game_seq}) is not in specify list.")
                    continue
                if exclude and game_seq in exclude:
                    print(f"  [SKIP] Game {game_no} (index: {game_seq}) is in exclude list.")
                    continue

                if is_tokyo_olympics_period(current_date):
                    date_game_no = game_no
                else:
                    date_game_no = game_no if game_no.startswith("2021") else f"2021{game_no}"

                try:
                    game_state, is_finished, found = self._scraper.fetch_game_state(
                        date_game_no, current_date
                    )
                    if not found:
                        print(
                            f"----- date: {date_str}, not found game gameNo: {idx + 1}, page: {date_game_no} -----"
                        )
                        continue

                    pitcher_data, batter_data = self._scraper.scrape_game_stats(
                        date_game_no, current_date, is_finished
                    )
                    self._repository.save_pitcher_stats(date_str, file_name, pitcher_data)
                    self._repository.save_batter_stats(date_str, file_name, batter_data)

                    if game_state not in ["試合中止", "ノーゲーム", "試合前"]:
                        text_data = self._scraper.scrape_text_stats(date_game_no, current_date)
                        if text_data is not None:
                            self._repository.save_text_stats(date_str, file_name, text_data)

                    print(f"  [DONE] Saved stats for game {date_game_no} as {file_name}")

                except Exception:
                    print(f"  [ERROR] Failed to process game {date_game_no}:")
                    traceback.print_exc()
                    continue

            current_date += datetime.timedelta(days=1)

        print("\nCollection process finished.")