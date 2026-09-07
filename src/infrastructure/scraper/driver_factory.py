import shutil
from contextlib import contextmanager
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions

# This function is a simplified version of the original _find_driver
def _find_driver(name: str) -> str:
    driver_path = shutil.which(name)
    if driver_path:
        return driver_path
    raise FileNotFoundError(f"{name} not found in PATH.")

@contextmanager
def get_webdriver(browser: str = "firefox"):
    """
    Provides a WebDriver instance as a context manager.
    Ensures the driver is properly closed after use.

    Args:
        browser (str): The browser to use ('firefox' or 'chrome').
    """
    if browser == "firefox":
        options = FirefoxOptions()
        options.add_argument("-headless")
        driver = webdriver.Firefox(executable_path=_find_driver("geckodriver"), options=options)
    elif browser == "chrome":
        options = ChromeOptions()
        options.add_argument("--headless")
        driver = webdriver.Chrome(executable_path=_find_driver("chromedriver"), options=options)
    else:
        raise ValueError(f"Unsupported browser: {browser}")

    try:
        yield driver
    finally:
        driver.quit()
