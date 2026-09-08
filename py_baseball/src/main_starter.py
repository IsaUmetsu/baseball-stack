
import sys
import os
import argparse
import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

# Add project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.application.use_cases.collect_starters import CollectStartersUseCase
from src.infrastructure.persistence.json_starter_repository import JsonStarterRepository
from src.infrastructure.scraper.starter_scraper import SeleniumStarterScraper

def main():
    parser = argparse.ArgumentParser(description="Collect baseball game starters.")
    parser.add_argument('-d', '--date', type=str, help="Specify a single date (e.g., 20230510).")
    parser.add_argument('-ss', '--season-start', type=str, default=datetime.date.today().strftime("%Y%m%d"))
    parser.add_argument('-se', '--season-end', type=str, default=datetime.date.today().strftime("%Y%m%d"))
    parser.add_argument('-s', '--specify', nargs='+', type=int, help="Specify game numbers to process.")
    parser.add_argument('-e', '--exclude', nargs='+', type=int, help="Exclude game numbers from processing.")
    args = parser.parse_args()

    def parse_date(date_str: str) -> datetime.date:
        return datetime.datetime.strptime(date_str, "%Y%m%d").date()

    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=chrome_options)

    # DI
    # `py_baseball`がルートだと仮定
    # プロジェクトのルートパスを取得
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    # 出力先ディレクトリを指定
    output_dir = os.path.join(project_root, 'starter')
    
    repository = JsonStarterRepository(base_path=output_dir)
    scraper = SeleniumStarterScraper(driver)
    use_case = CollectStartersUseCase(scraper, repository)

    try:
        if args.date:
            start_date = parse_date(args.date)
            end_date = start_date
        else:
            start_date = parse_date(args.season_start)
            end_date = parse_date(args.season_end)
        
        current_date = start_date
        while current_date <= end_date:
            use_case.execute(current_date, args.specify, args.exclude)
            current_date += datetime.timedelta(days=1)

    finally:
        driver.quit()
        print("----- Finished -----")

if __name__ == "__main__":
    main()
