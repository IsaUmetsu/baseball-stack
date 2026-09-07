import os
import json
from dataclasses import asdict, is_dataclass
from src.domain.repositories.game_stats_repository import GameStatsRepository
from src.domain.models.stats import GameStats

class EnhancedJSONEncoder(json.JSONEncoder):
    def default(self, o):
        if is_dataclass(o):
            return asdict(o)
        return super().default(o)

class JsonGameStatsRepository(GameStatsRepository):
    def __init__(self, pitch_stats_path: str, bat_stats_path: str, text_stats_path: str):
        self._pitch_stats_path = pitch_stats_path
        self._bat_stats_path = bat_stats_path
        self._text_stats_path = text_stats_path

    def save(self, game_stats: GameStats, date_str: str = "", file_name: str = "") -> None:
        if not date_str:
            date_str = "latest"

        if not file_name:
            file_name = f"{game_stats.game_id}.json"
        elif not file_name.endswith(".json"):
            file_name = f"{file_name}.json"

        pitch_dir = os.path.join(self._pitch_stats_path, date_str)
        bat_dir = os.path.join(self._bat_stats_path, date_str)
        text_dir = os.path.join(self._text_stats_path, date_str)

        os.makedirs(pitch_dir, exist_ok=True)
        os.makedirs(bat_dir, exist_ok=True)
        os.makedirs(text_dir, exist_ok=True)

        pitch_stats_to_save = {
            "isFinished": game_stats.is_finished,
            "home": asdict(game_stats.home_pitcher),
            "away": asdict(game_stats.away_pitcher)
        }
        bat_stats_to_save = {
            "isFinished": game_stats.is_finished,
            "home": asdict(game_batter := game_stats.home_batter),
            "away": asdict(game_stats.away_batter)
        }

        with open(os.path.join(pitch_dir, file_name), 'w', encoding='utf-8') as f:
            json.dump(pitch_stats_to_save, f, cls=EnhancedJSONEncoder, indent=2, ensure_ascii=False)

        with open(os.path.join(bat_dir, file_name), 'w', encoding='utf-8') as f:
            json.dump(bat_stats_to_save, f, cls=EnhancedJSONEncoder, indent=2, ensure_ascii=False)

        with open(os.path.join(text_dir, file_name), 'w', encoding='utf-8') as f:
            json.dump(game_stats.text_summary, f, cls=EnhancedJSONEncoder, indent=2, ensure_ascii=False)