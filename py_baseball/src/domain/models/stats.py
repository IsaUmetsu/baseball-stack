from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass(frozen=True)
class PitcherStatsData:
    away_team: str
    away_stats: List[Dict[str, str]]
    home_team: str
    home_stats: List[Dict[str, str]]
    is_finished: bool

    def to_dict(self) -> Dict[str, Any]:
        return {
            "away": {
                "team": self.away_team,
                "stats": self.away_stats,
            },
            "home": {
                "team": self.home_team,
                "stats": self.home_stats,
            },
            "isFinished": self.is_finished,
        }


@dataclass(frozen=True)
class BatterStatsData:
    away_team: str
    away_stats: List[Dict[str, str]]
    away_score_board: Dict[str, str]
    home_team: str
    home_stats: List[Dict[str, str]]
    home_score_board: Dict[str, str]
    is_finished: bool

    def to_dict(self) -> Dict[str, Any]:
        return {
            "away": {
                "team": self.away_team,
                "stats": self.away_stats,
                "scoreBoard": self.away_score_board,
            },
            "home": {
                "team": self.home_team,
                "stats": self.home_stats,
                "scoreBoard": self.home_score_board,
            },
            "isFinished": self.is_finished,
        }


@dataclass(frozen=True)
class TextPlayItem:
    inning: str
    team: str
    no: str
    order: str
    batter: str
    detail: str

    def to_dict(self) -> Dict[str, str]:
        return {
            "inning": self.inning,
            "team": self.team,
            "no": self.no,
            "order": self.order,
            "batter": self.batter,
            "detail": self.detail,
        }
