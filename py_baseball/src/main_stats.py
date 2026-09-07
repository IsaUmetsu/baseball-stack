import argparse
import datetime
import re
import sys
import traceback
import os

# Add src directory to Python path to allow absolute imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.application.use_cases.collect_game_stats import CollectGameStatsUseCase
from src.infrastructure.persistence.json_game_stats_repository import JsonGameStatsRepository
from src.infrastructure.scraper.driver_factory import get_webdriver
from src.infrastructure.scraper.game_stats_scraper import SeleniumGameStatsScraper

def parse_date(date_str: str) -> datetime.date:
    cleaned = re.sub(r'\D', '', date_str)
    if len(cleaned) == 4:
        year = datetime.datetime.now().year
        return datetime.datetime.strptime(f"{year}{cleaned}", "%Y%m%d").date()
    elif len(cleaned) == 8:
        return datetime.datetime.strptime(cleaned, "%Y%m%d").date()
    else:
        raise ValueError(f"Invalid date format: {date_str}. Please use MMDD or YYYYMMDD.")

def main():
    parser = argparse.ArgumentParser(description="Baseball Game Stats Collector using DDD architecture.")
    parser.add_argument('-d', '--date', type=str, default=None, help="Specify a single date (MMDD or YYYYMMDD).")
    parser.add_argument('-ss', '--season-start', type=str, default=datetime.date.today().strftime("%m%d"), help="Start date (MMDD or YYYYMMDD).")
    parser.add_argument('-se', '--season-end', type=str, default=datetime.date.today().strftime("%m%d"), help="End date (MMDD or YYYYMMDD).")
    parser.add_argument('-s', '--specify', nargs='+', type=str, help="Specify game numbers to process.")
    parser.add_argument('-e', '--exclude', nargs='+', type=str, help="Exclude game numbers from processing.")
    parser.add_argument('--browser', type=str, default="firefox", choices=["firefox", "chrome"], help="Browser to use for scraping.")

    args = parser.parse_args()

    try:
        if args.date:
            start_date = end_date = parse_date(args.date)
        else:
            start_date = parse_date(args.season_start)
            end_date = parse_date(args.season_end)

        # Define base path for storing data, mirroring original config
        _BASE = os.environ.get("PY_BASEBALL_DATA_DIR", "/Users/IsamuUmetsu/dev/py_baseball")
        pitch_stats_path = os.path.join(_BASE, "pitcherStats")
        bat_stats_path = os.path.join(_BASE, "batterStats")
        text_stats_path = os.path.join(_BASE, "text")

        with get_webdriver(browser=args.browser) as driver:
            # 1. Initialize Infrastructure components
            scraper = SeleniumGameStatsScraper(driver)
            repository = JsonGameStatsRepository(
                pitch_stats_path=pitch_stats_path,
                bat_stats_path=bat_stats_path,
                text_stats_path=text_stats_path,
            )

            # 2. Initialize Application Use Case
            use_case = CollectGameStatsUseCase(
                game_stats_repository=repository,
                game_stats_scraper=scraper,
            )

            # 3. Execute the Use Case
            use_case.execute(
                start_date=start_date,
                end_date=end_date,
                specify=args.specify,
                exclude=args.exclude,
            )

    except Exception as e:
        print("An unexpected error occurred:")
        traceback.print_exc()
        sys.exit(1)

    print("\n--- Main process finished successfully ---")

if __name__ == "__main__":
    main()
