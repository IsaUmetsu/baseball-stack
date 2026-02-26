import requests 
from bs4 import BeautifulSoup
import re

urllink = "https://baseball.yahoo.co.jp/npb/game/2020081506/score"
url = requests.get(urllink)
soup = BeautifulSoup(url.content, "html.parser")

print(soup)