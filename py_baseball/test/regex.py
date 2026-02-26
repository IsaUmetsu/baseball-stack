import re

text = "top:134px; left:63px;"
print(re.findall(r'\d+', text))
