from dataclasses import dataclass, field
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
class TeamPitcherStats:
    team: str
    stats: List[PitcherStats] = field(default_factory=list)

@dataclass(frozen=True)
class TeamBatterStats:
    team: str
    stats: List[BatterStats] = field(default_factory=list)

@dataclass(frozen=True)
class GameStats:
    game_id: str
    is_finished: bool
    home_pitcher: TeamPitcherStats
    away_pitcher: TeamPitcherStats
    home_batter: TeamBatterStats
    away_batter: TeamBatterStats
    text_summary: List[TextSummary] = field(default_factory=list)
    scoreboard: List[ScoreBoard] = field(default_factory=list)