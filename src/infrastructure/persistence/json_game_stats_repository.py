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

    def save(self, game_stats: GameStats) -> None:
        '''
        Saves the game statistics into separate JSON files for pitch, bat, and text summary,
        mimicking the structure of the original script.
        '''
        game_id = game_stats.game_id
        if len(game_id) != 10:
            raise ValueError(f"Invalid game_id format: {game_id}. Expected 10 digits (YYYYMMDDNN).")

        date_str = game_id[:8]
        game_no = game_id[8:]

        # Create date-based directories
        pitch_dir = os.path.join(self._pitch_stats_path, date_str)
        bat_dir = os.path.join(self._bat_stats_path, date_str)
        text_dir = os.path.join(self._text_stats_path, date_str)
        os.makedirs(pitch_dir, exist_ok=True)
        os.makedirs(bat_dir, exist_ok=True)
        os.makedirs(text_dir, exist_ok=True)

        # Structure pitch and bat stats with 'home' and 'away' keys
        pitch_stats_to_save = {
            "home": game_stats.home_pitcher_stats,
            "away": game_stats.away_pitcher_stats
        }
        bat_stats_to_save = {
            "home": game_stats.home_batter_stats,
            "away": game_stats.away_batter_stats
        }

        # Save pitch stats
        pitch_file_path = os.path.join(pitch_dir, f"{game_no}.json")
        with open(pitch_file_path, 'w', encoding='utf-8') as f:
            json.dump(pitch_stats_to_save, f, cls=EnhancedJSONEncoder, indent=2, ensure_ascii=False)

        # Save bat stats
        bat_file_path = os.path.join(bat_dir, f"{game_no}.json")
        with open(bat_file_path, 'w', encoding='utf-8') as f:
            json.dump(bat_stats_to_save, f, cls=EnhancedJSONEncoder, indent=2, ensure_ascii=False)
            
        # Save text summary stats
        text_file_path = os.path.join(text_dir, f"{game_no}.json")
        with open(text_file_path, 'w', encoding='utf-8') as f:
            json.dump(game_stats.text_summary, f, cls=EnhancedJSONEncoder, indent=2, ensure_ascii=False)
