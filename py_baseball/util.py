import re
import time
from selenium.common.exceptions import NoSuchElementException, StaleElementReferenceException

from selector import getSelector
from config import getConfig

def retry_on_stale(func):
    def wrapper(self, *args, **kwargs):
        for attempt in range(3):
            try:
                return func(self, *args, **kwargs)
            except StaleElementReferenceException:
                if attempt == 2:
                    raise
                time.sleep(0.5)
                if hasattr(self.driver, "parent"):
                    try:
                        root_driver = self.driver.parent
                        new_content_main = root_driver.find_element_by_css_selector("#contentMain")
                        self.driver = new_content_main
                    except Exception as e:
                        print(f"Failed to refresh #contentMain: {e}")
                else:
                    pass
        return func(self, *args, **kwargs)
    return wrapper

class Util:
    def __init__(self, driver):
        self.driver = driver

    @retry_on_stale
    def getText(self, selector):
        try:
            return self.driver.find_element_by_css_selector(getSelector(selector)).text
        except NoSuchElementException:
            return ""
    
    @retry_on_stale
    def getElems(self, selector):
        try:
            return self.driver.find_elements_by_css_selector(getSelector(selector))
        except NoSuchElementException:
            return []

    @retry_on_stale
    def getSpecifyText(self, elem, selector):
        try:
            return elem.find_element_by_css_selector(selector).text
        except NoSuchElementException:
            return ""

    @retry_on_stale
    def getSpecifyClass(self, elem, selector):
        try:
            return elem.find_element_by_css_selector(selector).get_attribute("class")
        except NoSuchElementException:
            return ""

    @retry_on_stale
    def getSpecifyElems(self, elem, selector):
        try:
            return elem.find_elements_by_css_selector(selector)
        except NoSuchElementException:
            return []

    @retry_on_stale
    def getTeamText(self, homeAway, selector):
        try:
            fullSelector = getSelector(homeAway) + " " + getSelector(selector)
            return self.driver.find_element_by_css_selector(fullSelector).text
        except NoSuchElementException:
            return ""

    @retry_on_stale
    def getTeamElems(self, homeAway, selector):
        try:
            fullSelector = getSelector(homeAway) + " " + getSelector(selector)
            return self.driver.find_elements_by_css_selector(fullSelector)
        except NoSuchElementException:
            return []

    @retry_on_stale
    def getGameNo(self, gameCard, pathDate):
        indexUrlRegex = getConfig('gameIndexUrl').replace('[dateGameNo]', pathDate + '0(\d)')
        searchResult = re.findall(indexUrlRegex, gameCard.get_attribute('href'))
        return searchResult[0] if len(searchResult) > 0 else ''
