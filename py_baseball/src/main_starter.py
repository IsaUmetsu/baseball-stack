import argparse
import datetime
import re
import sys
import traceback
import os

# Add src directory to Python path to allow absolute imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.application.use_cases.collect_starters import CollectStartersUseCase
from src.infrastructure.persistence.json_starter_repository import JsonStarterRepository
from src.infrastructure.scraper.driver_factory import get_webdriver
from src.infrastructure.scraper.starter_scraper import SeleniumStarterScraper

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
    parser = argparse.ArgumentParser(description="Baseball Starter Announce Collector using DDD architecture.")
    parser.add_argument('-d', '--date', type=str, default=None, help="Specify a single date (MMDD or YYYYMMDD).")
    parser.add_argument('-ss', '--season-start', type=str, default=datetime.date.today().strftime("%m%d"), help="Start date (MMDD or YYYYMMDD).")
    parser.add_argument('-se', '--season-end', type=str, default=datetime.date.today().strftime("%m%d"), help="End date (MMDD or YYYYMMDD).")
    parser.add_argument('-s', '--specify', nargs='+', type=int, help="Specify game numbers to process (integers).")
    parser.add_argument('-e', '--exclude', nargs='+', type=int, help="Exclude game numbers from processing (integers).")
    parser.add_argument('--browser', type=str, default="firefox", choices=["firefox", "chrome"], help="Browser to use for scraping.")

    args = parser.parse_args()

    try:
        if args.date:
            start_date = end_date = parse_date(args.date)
        else:
            start_date = parse_date(args.season_start)
            end_date = parse_date(args.season_end)

        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        starter_path = os.path.join(project_root, "starter")

        with get_webdriver(browser=args.browser) as driver:
            # 1. Initialize Infrastructure components
            scraper = SeleniumStarterScraper(driver)
            repository = JsonStarterRepository(
                base_path=starter_path
            )

            # 2. Initialize Application Use Case (scraper, repository の順で渡す)
            use_case = CollectStartersUseCase(
                scraper=scraper,
                repository=repository,
            )

            # 3. 日付範囲をループして execute を呼び出し
            current_date = start_date
            while current_date <= end_date:
                use_case.execute(
                    target_date=current_date,
                    specify_games=args.specify,
                    exclude_games=args.exclude,
                )
                current_date += datetime.timedelta(days=1)

    except Exception as e:
        print("An unexpected error occurred:")
        traceback.print_exc()
        sys.exit(1)

    print("\n--- Main process finished successfully ---")

if __name__ == "__main__":
    main()