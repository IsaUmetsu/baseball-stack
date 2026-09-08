
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class TeamStarterInfo:
    team: str
    pitcher: Optional[str] = None

@dataclass
class StarterGameStats:
    start: str
    away: TeamStarterInfo
    home: TeamStarterInfo
