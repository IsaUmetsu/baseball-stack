import datetime
import traceback
from typing import List, Optional, Dict

from src.domain.models.stats import GameStats, TeamPitcherStats, TeamBatterStats, PitcherStats, BatterStats, TextSummary
from src.domain.repositories.game_stats_repository import GameStatsRepository
from src.infrastructure.scraper.game_stats_scraper import SeleniumGameStatsScraper

def _map_pitcher_stats(raw_stats: List[Dict[str, str]]) -> List[PitcherStats]:
    return [PitcherStats(**s) for s in raw_stats]

def _map_batter_stats(raw_stats: List[Dict[str, str]]) -> List[BatterStats]:
    mapped_stats = []
    for r in raw_stats:
        item = dict(r)
        innings = [item.pop(k) for k in sorted(item.keys()) if k.startswith('ing')]
        mapped_stats.append(BatterStats(
            position=item.get("position", ""),
            name=item.get("name", ""),
            avg=item.get("ave", ""),
            at_bat=item.get("ab", ""),
            runs=item.get("run", ""),
            hits=item.get("hit", ""),
            rbi=item.get("rbi", ""),
            so=item.get("so", ""),
            bb=item.get("bb", ""),
            hbp=item.get("hbp", ""),
            sh=item.get("sh", ""),
            sb=item.get("sb", ""),
            errors=item.get("e", ""),
            hr=item.get("hr", ""),
            innings=innings
        ))
    return mapped_stats

def _map_text_stats(raw_stats: List[Dict[str, str]]) -> List[TextSummary]:
    return [
        TextSummary(
            inning=r.get("inning", ""),
            team=r.get("team", ""),
            play_number=r.get("no", ""),
            order=r.get("order", ""),
            batter=r.get("batter", ""),
            detail=r.get("detail", "")
        ) for r in raw_stats
    ]

class CollectGameStatsUseCase:
    def __init__(
        self,
        game_stats_repository: GameStatsRepository,
        game_stats_scraper: SeleniumGameStatsScraper,
    ):
        self._repository = game_stats_repository
        self._scraper = game_stats_scraper

    def execute(
        self,
        start_date: datetime.date,
        end_date: datetime.date,
        specify: Optional[List[str]] = None,
        exclude: Optional[List[str]] = None,
        **kwargs,
    ):
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime('%Y%m%d')
            print(f"--- Processing date: {current_date.strftime('%Y-%m-%d')} ---")
            game_nos = self._scraper.get_game_nos(current_date)

            for idx, date_game_no in enumerate(game_nos):
                game_seq = str(idx + 1)
                file_name = f"{idx + 1:02d}.json"

                if specify and game_seq not in specify:
                    print(f"  [SKIP] Game {date_game_no} (index: {game_seq}) is not in the specify list.")
                    continue
                if exclude and game_seq in exclude:
                    print(f"  [SKIP] Game {date_game_no} (index: {game_seq}) is in the exclude list.")
                    continue

                try:
                    print(f"  [INFO] Checking game status: {date_game_no}")
                    state_text, is_finished = self._scraper.fetch_game_state(date_game_no)

                    if "中止" in state_text:
                        print(f"  [INFO] Game {date_game_no} is cancelled (試合中止). Saving empty stats.")
                        empty_stats = GameStats(
                            game_id=date_game_no,
                            is_finished=False,
                            home_pitcher=TeamPitcherStats(team=""),
                            away_pitcher=TeamPitcherStats(team=""),
                            home_batter=TeamBatterStats(team=""),
                            away_batter=TeamBatterStats(team=""),
                            text_summary=[],
                            scoreboard=[]
                        )
                        self._repository.save(empty_stats, date_str=date_str, file_name=file_name)
                        print(f"  [DONE] Saved empty game: {date_game_no} as {file_name}")
                        continue

                    print(f"  [INFO] Scraping game: {date_game_no}")
                    away_pitch_raw, home_pitch_raw = self._scraper.fetch_pitch_stats(date_game_no, current_date)
                    
                    away_team_name = away_pitch_raw.get("team", "")
                    home_team_name = home_pitch_raw.get("team", "")

                    away_bat_raw, home_bat_raw = self._scraper.fetch_bat_stats(
                        date_game_no, current_date, away_team=away_team_name, home_team=home_team_name
                    )
                    text_raw = self._scraper.fetch_text_stats(date_game_no, current_date)

                    home_pitcher = TeamPitcherStats(team=home_team_name, stats=_map_pitcher_stats(home_pitch_raw.get("stats", [])))
                    away_pitcher = TeamPitcherStats(team=away_team_name, stats=_map_pitcher_stats(away_pitch_raw.get("stats", [])))
                    home_batter = TeamBatterStats(team=home_team_name, stats=_map_batter_stats(home_bat_raw.get("stats", [])))
                    away_batter = TeamBatterStats(team=away_team_name, stats=_map_batter_stats(away_bat_raw.get("stats", [])))
                    text_summary = _map_text_stats(text_raw)

                    game_stats = GameStats(
                        game_id=date_game_no,
                        is_finished=is_finished,
                        home_pitcher=home_pitcher,
                        away_pitcher=away_pitcher,
                        home_batter=home_batter,
                        away_batter=away_batter,
                        text_summary=text_summary,
                        scoreboard=[]
                    )

                    self._repository.save(game_stats, date_str=date_str, file_name=file_name)
                    print(f"  [DONE] Saved game: {date_game_no} as {file_name}")

                except Exception:
                    print(f"  [ERROR] Failed to process game {date_game_no}:")
                    traceback.print_exc()
                    continue

            current_date += datetime.timedelta(days=1)

        print("\nCollection process finished.")