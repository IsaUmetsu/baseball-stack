from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass(frozen=True)
class TeamStarter:
    team: str
    pitcher: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {"team": self.team}
        if self.pitcher is not None:
            result["pitcher"] = self.pitcher
        return result


@dataclass(frozen=True)
class StarterInfo:
    start: str
    away: TeamStarter
    home: TeamStarter

    def to_dict(self) -> Dict[str, Any]:
        return {
            "start": self.start,
            "away": self.away.to_dict(),
            "home": self.home.to_dict(),
        }
