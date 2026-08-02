import os
import shutil
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions

DRIVER_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "driver")

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def _find_driver(name):
    """システムPATH (Docker環境) → ローカル driver/ (macOS環境) の順でドライバを探す"""
    system = shutil.which(name)
    if system:
        return system
    local = os.path.join(DRIVER_DIR, name)
    if os.path.exists(local):
        return local
    return name  # SeleniumにPATH探索を任せる

def getChromeDriver():
    option = ChromeOptions()
    option.add_argument('--headless')
    return webdriver.Chrome(executable_path=_find_driver("chromedriver"), options=option)

def getFirefoxDriver():
    option = FirefoxOptions()
    option.add_argument('-headless')
    return webdriver.Firefox(executable_path=_find_driver("geckodriver"), options=option)

def waitUntilLoad(driver, elem):
    # WebDriverWait(driver, 15).until(EC.presence_of_all_elements_located)
    WebDriverWait(driver, 15).until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, elem)))
