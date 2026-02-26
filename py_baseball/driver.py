from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def getChromeDriver():
    option = ChromeOptions()
    option.add_argument('--headless')
    return webdriver.Chrome(executable_path="/Users/IsamuUmetsu/dev/py_baseball/driver/chromedriver", options=option)

def getFirefoxDriver():
    option = FirefoxOptions()
    option.add_argument('-headless')
    return webdriver.Firefox(executable_path="/Users/IsamuUmetsu/dev/py_baseball/driver/geckodriver", options=option)

def waitUntilLoad(driver, elem):
    # WebDriverWait(driver, 15).until(EC.presence_of_all_elements_located)
    WebDriverWait(driver, 15).until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, elem)))
