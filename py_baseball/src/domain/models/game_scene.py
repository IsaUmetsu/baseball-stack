from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any


@dataclass(frozen=True)
class LiveScore:
    teamInitial: str
    currentScore: str


@dataclass(frozen=True)
class LiveCount:
    b: int
    s: int
    o: int


@dataclass(frozen=True)
class LiveHeader:
    inning: str
    away: Optional[LiveScore] = None
    home: Optional[LiveScore] = None
    count: Optional[LiveCount] = None


@dataclass(frozen=True)
class OnbaseInfo:
    base: str
    player: str


@dataclass(frozen=True)
class CurrentBatterInfo:
    name: str
    playerNo: str
    domainHand: str
    average: str
    prevResult: str


@dataclass(frozen=True)
class CurrentPitcherInfo:
    name: str
    playerNo: str
    domainHand: str
    pitch: str
    vsBatterCount: str
    pitchERA: str


@dataclass(frozen=True)
class LiveBody:
    battingResult: str
    pitchingResult: str
    onbaseInfo: List[OnbaseInfo] = field(default_factory=list)
    currentBatterInfo: Optional[CurrentBatterInfo] = None
    currentPicherInfo: Optional[CurrentPitcherInfo] = None
    nextBatter: str = ""
    inningBatterCnt: str = ""


@dataclass(frozen=True)
class PitchDetail:
    judgeIcon: str
    pitchCnt: str
    pitchType: str
    pitchSpeed: str
    pitchJudgeDetail: str


@dataclass(frozen=True)
class PitchCourse:
    top: str
    left: str


@dataclass(frozen=True)
class GameResultPlayer:
    title: str
    name: str
    domainHand: str


@dataclass(frozen=True)
class PitchInfo:
    pitchDetails: List[PitchDetail] = field(default_factory=list)
    allPitchCourse: List[PitchCourse] = field(default_factory=list)
    gameResult: Dict[str, GameResultPlayer] = field(default_factory=dict)


@dataclass(frozen=True)
class OrderItem:
    no: str
    position: str
    name: str
    domainHand: str
    average: str


@dataclass(frozen=True)
class BenchMemberItem:
    name: str
    domainHand: str
    average: str


@dataclass(frozen=True)
class TeamDetailInfo:
    name: str
    order: List[OrderItem] = field(default_factory=list)
    batteryInfo: str = ""
    homerunInfo: str = ""
    benchPitcher: List[BenchMemberItem] = field(default_factory=list)
    benchCatcher: List[BenchMemberItem] = field(default_factory=list)
    benchInfielder: List[BenchMemberItem] = field(default_factory=list)
    benchOutfielder: List[BenchMemberItem] = field(default_factory=list)


@dataclass(frozen=True)
class GameScene:
    liveHeader: LiveHeader
    liveBody: Optional[LiveBody] = None
    pitchInfo: Optional[PitchInfo] = None
    homeTeamInfo: Optional[TeamDetailInfo] = None
    awayTeamInfo: Optional[TeamDetailInfo] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {}
        if self.liveHeader is not None:
            header_dict: Dict[str, Any] = {"inning": self.liveHeader.inning}
            if self.liveHeader.away is not None:
                header_dict["away"] = asdict(self.liveHeader.away)
            if self.liveHeader.home is not None:
                header_dict["home"] = asdict(self.liveHeader.home)
            if self.liveHeader.count is not None:
                header_dict["count"] = asdict(self.liveHeader.count)
            result["liveHeader"] = header_dict

        if self.liveBody is not None:
            body_dict: Dict[str, Any] = {
                "battingResult": self.liveBody.battingResult,
                "pitchingResult": self.liveBody.pitchingResult,
                "onbaseInfo": [asdict(item) for item in self.liveBody.onbaseInfo],
            }
            if self.liveBody.currentBatterInfo is not None:
                body_dict["currentBatterInfo"] = asdict(self.liveBody.currentBatterInfo)
            if self.liveBody.currentPicherInfo is not None:
                body_dict["currentPicherInfo"] = asdict(self.liveBody.currentPicherInfo)
            body_dict["nextBatter"] = self.liveBody.nextBatter
            body_dict["inningBatterCnt"] = self.liveBody.inningBatterCnt
            result["liveBody"] = body_dict

        if self.pitchInfo is not None:
            result["pitchInfo"] = {
                "pitchDetails": [asdict(item) for item in self.pitchInfo.pitchDetails],
                "allPitchCourse": [asdict(item) for item in self.pitchInfo.allPitchCourse],
                "gameResult": {k: asdict(v) for k, v in self.pitchInfo.gameResult.items()},
            }

        if self.homeTeamInfo is not None:
            result["homeTeamInfo"] = asdict(self.homeTeamInfo)

        if self.awayTeamInfo is not None:
            result["awayTeamInfo"] = asdict(self.awayTeamInfo)

        return result
