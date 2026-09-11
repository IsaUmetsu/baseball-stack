import json
import os
from typing import List

from src.domain.models.stats import BatterStatsData, PitcherStatsData, TextPlayItem
from src.domain.repositories.game_stats_repository import GameStatsRepository


class JsonGameStatsRepository(GameStatsRepository):
    def __init__(self, pitch_stats_path: str, bat_stats_path: str, text_stats_path: str):
        self._pitch_stats_path = pitch_stats_path
        self._bat_stats_path = bat_stats_path
        self._text_stats_path = text_stats_path

    def _normalize_file_name(self, file_name: str) -> str:
        if not file_name.endswith(".json"):
            return f"{file_name}.json"
        return file_name

    def save_pitcher_stats(self, date_str: str, file_name: str, data: PitcherStatsData) -> None:
        target_dir = os.path.join(self._pitch_stats_path, date_str)
        os.makedirs(target_dir, exist_ok=True)
        file_path = os.path.join(target_dir, self._normalize_file_name(file_name))
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data.to_dict(), f, indent=2, ensure_ascii=False)

    def save_batter_stats(self, date_str: str, file_name: str, data: BatterStatsData) -> None:
        target_dir = os.path.join(self._bat_stats_path, date_str)
        os.makedirs(target_dir, exist_ok=True)
        file_path = os.path.join(target_dir, self._normalize_file_name(file_name))
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data.to_dict(), f, indent=2, ensure_ascii=False)

    def save_text_stats(self, date_str: str, file_name: str, data: List[TextPlayItem]) -> None:
        target_dir = os.path.join(self._text_stats_path, date_str)
        os.makedirs(target_dir, exist_ok=True)
        file_path = os.path.join(target_dir, self._normalize_file_name(file_name))
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump([item.to_dict() for item in data], f, indent=2, ensure_ascii=False)
