from dataclasses import dataclass
from typing import List, Optional

@dataclass(frozen=True)
class PitcherStats:
    result: Optional[str]
    name: str
    era: str
    ip: str
    np: str
    bf: str
    ha: str
    hra: str
    so: str
    bb: str
    hbp: str
    balk: str
    ra: str
    er: str

@dataclass(frozen=True)
class BatterStats:
    position: str
    name: str
    avg: str
    at_bat: str
    runs: str
    hits: str
    rbi: str
    so: str
    bb: str
    hbp: str
    sh: str
    sb: str
    errors: str
    hr: str
    innings: List[str]

@dataclass(frozen=True)
class ScoreBoard:
    team: str
    runs_per_inning: List[str]
    total_runs: str
    total_hits: str
    total_errors: str

@dataclass(frozen=True)
class TextSummary:
    inning: str
    team: str
    play_number: str
    order: str
    batter: str
    detail: str

@dataclass(frozen=True)
class GameStats:
    game_id: str
    home_team: str
    away_team: str
    home_pitcher_stats: List[PitcherStats]
    away_pitcher_stats: List[PitcherStats]
    home_batter_stats: List[BatterStats]
    away_batter_stats: List[BatterStats]
    scoreboard: List[ScoreBoard]
    text_summary: List[TextSummary]
