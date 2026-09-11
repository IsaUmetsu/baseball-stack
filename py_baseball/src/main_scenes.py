import argparse
import datetime
import os
import re
import sys
import traceback

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.application.use_cases.collect_game_scenes import CollectGameScenesUseCase
from src.infrastructure.persistence.json_game_scene_repository import JsonGameSceneRepository
from src.infrastructure.scraper.driver_factory import get_webdriver
from src.infrastructure.scraper.game_scene_scraper import SeleniumGameSceneScraper


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
    parser = argparse.ArgumentParser(description="Baseball Game Scenes Collector using DDD architecture.")
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

        base_dir = os.environ.get("PY_BASEBALL_DATA_DIR", "/Users/IsamuUmetsu/dev/py_baseball")
        output_path = os.path.join(base_dir, "output")

        with get_webdriver(browser=args.browser) as driver:
            scraper = SeleniumGameSceneScraper(driver)
            repository = JsonGameSceneRepository(base_path=output_path)
            use_case = CollectGameScenesUseCase(scraper=scraper, repository=repository)

            use_case.execute(
                start_date=start_date,
                end_date=end_date,
                specify=args.specify,
                exclude=args.exclude,
            )

    except Exception:
        print("An unexpected error occurred:")
        traceback.print_exc()
        sys.exit(1)

    print("\n--- Scenes collection finished successfully ---")


if __name__ == "__main__":
    main()
