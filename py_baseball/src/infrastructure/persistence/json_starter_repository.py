
import json
import os
from datetime import date
from src.domain.models.starter import StarterGameStats, TeamStarterInfo
from src.domain.repositories.starter_repository import StarterRepository

class JsonStarterRepository(StarterRepository):
    def __init__(self, base_path: str):
        self._base_path = base_path

    def save(self, game_stats: StarterGameStats, game_date: date, game_no: int):
        date_dir = os.path.join(self._base_path, game_date.strftime("%Y%m%d"))
        if not os.path.exists(date_dir):
            os.makedirs(date_dir)

        file_path = os.path.join(date_dir, f"{game_no:02d}.json")

        data = {
            "start": game_stats.start,
            "away": {
                "team": game_stats.away.team,
            },
            "home": {
                "team": game_stats.home.team,
            },
        }
        if game_stats.away.pitcher:
            data["away"]["pitcher"] = game_stats.away.pitcher
        if game_stats.home.pitcher:
            data["home"]["pitcher"] = game_stats.home.pitcher
            
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
