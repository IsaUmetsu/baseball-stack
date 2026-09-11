import datetime


SELECTORS = {
    "gameCards": "#gm_card .bb-score__content",
    "contentMain": "#contentMain",
    "inningBase": "#ing_brd tbody tr:nth-child({0}) td:nth-child({1}) a",
    "inning": "#async-fieldBso .live em",
    "countBall": "#async-fieldBso .score .sbo .b b",
    "countStrike": "#async-fieldBso .score .sbo .s b",
    "countOut": "#async-fieldBso .score .sbo .o b",
    "teamInitialAway": "#async-fieldBso .score table tbody tr:nth-child(1) td:nth-child(1)",
    "currentScoreAway": "#async-fieldBso .score table tbody tr:nth-child(1) td:nth-child(2)",
    "teamInitialHome": "#async-fieldBso .score table tbody tr:nth-child(2) td:nth-child(1)",
    "currentScoreHome": "#async-fieldBso .score table tbody tr:nth-child(2) td:nth-child(2)",
    "battingResult": "#liveBody #result span",
    "pitchingResult": "#liveBody #result em",
    "onbaseInfo": "#dakyu div",
    "nextBatter": "#liveBody .bottom #nxt_batt .next table tbody tr:nth-child(2)",
    "currentBatterName": "#liveBody .bottom #batter .nm_box .nm a",
    "currentBatterPlayerNo": "#liveBody .bottom #batter .nm_box .nm span",
    "currentBatterDomainHand": "#liveBody .bottom #batter .dominantHand",
    "currentBatterRate": "#liveBody .bottom #batter .rate",
    "currentBatterPrevResult": "#liveBody .bottom #batter .anda",
    "currentPitcherName": "#liveBody .bottom #pit .nm_box .nm a",
    "currentPitcherPlayerNo": "#liveBody .bottom #pit .nm_box .nm span",
    "currentPitcherHand": "#liveBody .bottom #pit .dominantHand",
    "currentPitchCount": "#liveBody .bottom #pit .score td:nth-child(1)",
    "currentPitcherVSBatterCount": "#liveBody .bottom #pit .score td:nth-child(2)",
    "currentPitchERA": "#liveBody .bottom #pit .score td:nth-child(3)",
    "inningBatterCnt": "#replay dt",
    "pitchDetail": ".bb-splits__item:nth-child(2) table:nth-child(3) tbody tr",
    "pitchingCourse": ".bb-splits__item:nth-child(2) table:nth-child(1) tbody tr td div span.bb-icon__ballCircle",
    "gameResultLeftTitle": "#gm_rslt thead tr th:nth-child(1)",
    "gameResultLeftName": "#gm_rslt tbody tr td:nth-child(1)",
    "gameResultLeftDomainHand": "#gm_rslt tbody tr td:nth-child(2)",
    "gameResultRightTitle": "#gm_rslt thead tr th:nth-child(2)",
    "gameResultRightName": "#gm_rslt tbody tr td:nth-child(3)",
    "gameResultRightDomainHand": "#gm_rslt tbody tr td:nth-child(4)",
    "homeTeamElemId": "#gm_memh",
    "awayTeamElemId": "#gm_mema",
    "teamName": ".bb-head02__title",
    "teamOrder": "table:nth-child(2) tbody tr",
    "teamBattery": "table:nth-child(4) tbody:nth-child(1) tr:nth-child(2) td",
    "teamHomerun": "table:nth-child(4) tbody:nth-child(2) tr:nth-child(2) td",
    "benchPitcherInfo": "table:nth-child(5) tbody:nth-child(2) tr",
    "benchCatcherInfo": "table:nth-child(5) tbody:nth-child(3) tr",
    "benchInfielderInfo": "table:nth-child(5) tbody:nth-child(4) tr",
    "benchOutfielderInfo": "table:nth-child(5) tbody:nth-child(5) tr",
    "replayNext": "#replay .next a",
    "replayBack": "#replay .back a",
}

TEAM_INITIALS = {
    "DeNA": "De", "阪神": "T", "巨人": "G", "中日": "D", "広島": "C", "ヤクルト": "S",
    "楽天": "E", "ソフトバンク": "H", "西武": "L", "オリックス": "B", "ロッテ": "M", "日本ハム": "F",
    "全パ": "AP", "全セ": "AS",
}

LEAGUE_2021 = {
    "0302": [11, 12], "0303": [13, 16], "0304": [17, 18], "0305": [19, 20],
    "0306": [21, 26], "0307": [27, 32], "0309": [33, 38], "0310": [39, 44],
    "0311": [45, 45], "0312": [46, 51], "0313": [52, 57], "0314": [58, 63],
    "0316": [64, 69], "0317": [70, 75], "0318": [76, 76], "0319": [77, 82],
    "0320": [83, 88], "0321": [89, 94],
    "0727": [4884, 4887], "0728": [4889, 4892], "0729": [4894, 4894], "0730": [4895, 4898],
    "0731": [4899, 4904], "0801": [4905, 4909], "0803": [4910, 4914], "0804": [4915, 4920],
    "0805": [4921, 4923], "0806": [4924, 4925], "0808": [4926, 4930], "0809": [4931, 4936],
    "0810": [4937, 4939],
}


def get_team_initial(team: str) -> str:
    return TEAM_INITIALS.get(team, team)


def is_tokyo_olympics_period(target_date: datetime.date) -> bool:
    date_str = target_date.strftime("%Y%m%d")
    return "20210718" <= date_str <= "20210812"


def get_inning_selector(inning: int, top_btm: str) -> str:
    top_btm_dic = {"表": 1, "裏": 2}
    return SELECTORS["inningBase"].format(top_btm_dic[top_btm], inning + 1)
