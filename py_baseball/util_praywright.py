from selector import getSelector
from config import getConfig
import re

class Util:
    def __init__(self, page):
        self.page = page

    def getText(self, selector):
        full = getSelector(selector)
        loc = self.page.locator(full)
        return loc.first.text_content() if loc.count() > 0 else ""

    def getElems(self, selector):
        full = getSelector(selector)
        return self.page.locator(full)

    def getSpecifyText(self, elem, selector):
        loc = elem.locator(selector)
        return loc.first.text_content() if loc.count() > 0 else ""

    def getSpecifyClass(self, elem, selector):
        loc = elem.locator(selector)
        return loc.first.get_attribute("class") if loc.count() > 0 else ""

    def getSpecifyElems(self, elem, selector):
        return elem.locator(selector)

    def getTeamText(self, homeAway, selector):
        full = getSelector(homeAway) + " " + getSelector(selector)
        loc = self.page.locator(full)
        return loc.first.text_content() if loc.count() > 0 else ""

    def getTeamElems(self, homeAway, selector):
        full = getSelector(homeAway) + " " + getSelector(selector)
        return self.page.locator(full)

    def getGameNo(self, gameCard, pathDate):
        indexUrlRegex = getConfig('gameIndexUrl').replace('[dateGameNo]', pathDate + '0(\d)')
        href = gameCard.get_attribute("href")
        searchResult = re.findall(indexUrlRegex, href)
        return searchResult[0] if len(searchResult) > 0 else ''