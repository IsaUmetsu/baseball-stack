
selectorList = {
    ### 日程結果
    "gameCards": "#gm_card .bb-score__content",
    "gameCardsHomeTeam": ".bb-score__team p:nth-child(1)",
    "gameCardsAwayTeam": ".bb-score__team p:nth-child(2)",

    ### トップ
    "gameState": "#gm_brd .bb-gameDetail .bb-gameTeam__score .bb-gameCard__state", # from 2023
    "startTime": "#gm_brd .bb-gameCard .bb-gameDescription time",
    "awayTeam": "#gm_recen .bb-gameCard__readMore .bb-gameCard__readMoreItem:nth-child(2) span",
    "homeTeam": "#gm_recen .bb-gameCard__readMore .bb-gameCard__readMoreItem:nth-child(1) span",
    "awayStartPitcher": "#strt_pit .bb-splits__item:nth-child(2) header h1 a",
    "homeStartPitcher": "#strt_pit .bb-splits__item:nth-child(1) header h1 a",
    "awayTeamPast": "#ing_brd tbody tr:nth-child(1) td:nth-child(1)",
    "homeTeamPast": "#ing_brd tbody tr:nth-child(2) td:nth-child(1)",
    "awayStartPitcherPast": "#strt_mem section .bb-splits__item:nth-child(2) table:nth-child(2) tbody tr td:nth-child(3)",
    "homeStartPitcherPast": "#strt_mem section .bb-splits__item:nth-child(1) table:nth-child(2) tbody tr td:nth-child(3)",
    "gameTitleSpan": "#gm_menu section header h1 span", # from 2023

    ## テキスト速報
    "batResult": "#text_live .bb-liveText",
    "batResultInning": "header h1",
    "batResultTeam": "header p",
    "batResultUnit": ".bb-liveText__orderedList .bb-liveText__item",
    "batResultUnitNo": ".bb-liveText__number",
    "batResultUnitOrder": ".bb-liveText__text .bb-liveText__batter .bb-liveText__order",
    "batResultUnitBatter": ".bb-liveText__text .bb-liveText__batter .bb-liveText__player",
    "summaryPoint": ".bb-liveText__text .bb-liveText__summary--point",

    ### 一球速報
    ## イニング
    "inningBase": "#ing_brd tbody tr:nth-child({0}) td:nth-child({1})",
    "topOf1": "#ing_brd tbody tr td:nth-child(2)",

    ### 出場成績
    ## 野手成績
    "awayTeamName": "#gm_stats .bb-modCommon01:nth-child(1) .bb-table--resultScoreBoard:nth-child(3) th",
    "homeTeamName": "#gm_stats .bb-modCommon01:nth-child(1) .bb-table--resultScoreBoard:nth-child(4) th",
    "awayScoreBoard": "#gm_stats .bb-modCommon01:nth-child(1) .bb-table--resultScoreBoard:nth-child(3) tr td",
    "homeScoreBoard": "#gm_stats .bb-modCommon01:nth-child(1) .bb-table--resultScoreBoard:nth-child(4) tr td",
    "awayBatStats": "#gm_stats .bb-modCommon01:nth-child(1) .bb-blowResultsTable:nth-child(2) table tbody tr",
    "homeBatStats": "#gm_stats .bb-modCommon01:nth-child(1) .bb-blowResultsTable:nth-child(5) table tbody tr",
    ## 投手成績
    "awayTeamFullName": "#gm_stats .bb-modCommon01:nth-child(2) .bb-modCommon02:nth-child(2) header",
    "homeTeamFullName": "#gm_stats .bb-modCommon01:nth-child(2) .bb-modCommon02:nth-child(3) header",
    "awayPitchStats": "#gm_stats .bb-modCommon01:nth-child(2) .bb-modCommon02:nth-child(2) table tbody tr",
    "homePitchStats": "#gm_stats .bb-modCommon01:nth-child(2) .bb-modCommon02:nth-child(3) table tbody tr",

    ## 速報詳細
    ## ライブヘッダ
    "inning": "#async-fieldBso .live em",
    "countBall": "#async-fieldBso .score .sbo .b b",
    "countStrike": "#async-fieldBso .score .sbo .s b",
    "countOut": "#async-fieldBso .score .sbo .o b",
    "teamInitialAway": "#async-fieldBso .score table tbody tr:nth-child(1) td:nth-child(1)",
    "currentScoreAway": "#async-fieldBso .score table tbody tr:nth-child(1) td:nth-child(2)",
    "teamInitialHome": "#async-fieldBso .score table tbody tr:nth-child(2) td:nth-child(1)",
    "currentScoreHome": "#async-fieldBso .score table tbody tr:nth-child(2) td:nth-child(2)",

    ## ライブボディ
    "battingResult": "#liveBody #result span",
    "pitchingResult": "#liveBody #result em",
    "onbaseInfo": "#dakyu div",
    "nextBatter": "#liveBody .bottom #nxt_batt .next table tbody tr:nth-child(2)",
    # 現在打者概要
    "currentBatterName": "#liveBody .bottom #batter .nm_box .nm a",
    "currentBatterPlayerNo": "#liveBody .bottom #batter .nm_box .nm span",
    "currentBatterDomainHand": "#liveBody .bottom #batter .dominantHand",
    "currentBatterRate": "#liveBody .bottom #batter .rate",
    "currentBatterPrevResult": "#liveBody .bottom #batter .anda",
    # 登板投手概要
    "currentPitcherName": "#liveBody .bottom #pit .nm_box .nm a",
    "currentPitcherPlayerNo": "#liveBody .bottom #pit .nm_box .nm span",
    "currentPitcherHand": "#liveBody .bottom #pit .dominantHand",
    "currentPitchCount": "#liveBody .bottom #pit .score td:nth-child(1)",
    "currentPitcherVSBatterCount": "#liveBody .bottom #pit .score td:nth-child(2)",
    "currentPitchERA": "#liveBody .bottom #pit .score td:nth-child(3)",
    "inningBatterCnt": "#replay dt",

    ## 投球詳細情報
    "pitchDetail": ".bb-splits__item:nth-child(2) table:nth-child(3) tbody tr",
    "pitchingCourse": ".bb-splits__item:nth-child(2) table:nth-child(1) tbody tr td div span.bb-icon__ballCircle",
    # 対戦相手
    "gameResultLeftTitle": "#gm_rslt thead tr th:nth-child(1)",
    "gameResultLeftName": "#gm_rslt tbody tr td:nth-child(1)",
    "gameResultLeftDomainHand": "#gm_rslt tbody tr td:nth-child(2)",
    "gameResultRightTitle": "#gm_rslt thead tr th:nth-child(2)",
    "gameResultRightName": "#gm_rslt tbody tr td:nth-child(3)",
    "gameResultRightDomainHand": "#gm_rslt tbody tr td:nth-child(4)",

    ## 各チーム情報
    "homeTeamElemId": "#gm_memh",
    "awayTeamElemId": "#gm_mema",
    # チーム情報
    "teamName": ".bb-head03__title",
    "teamOrder": "table:nth-child(2) tbody tr",
    "teamBattery": "table:nth-child(4) tbody:nth-child(1) tr:nth-child(2) td",
    "teamHomerun": "table:nth-child(4) tbody:nth-child(2) tr:nth-child(2) td",
    "benchPitcherInfo": "table:nth-child(5) tbody:nth-child(2) tr",
    "benchCatcherInfo": "table:nth-child(5) tbody:nth-child(3) tr",
    "benchInfielderInfo": "table:nth-child(5) tbody:nth-child(4) tr",
    "benchOutfielderInfo": "table:nth-child(5) tbody:nth-child(5) tr",
}

def getSelector(selector):    
    return selectorList[selector]
