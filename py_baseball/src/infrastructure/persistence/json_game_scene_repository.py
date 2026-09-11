import os
import json
from typing import Tuple, Optional, Dict, Any

from src.domain.models.game_scene import GameScene
from src.domain.repositories.game_scene_repository import GameSceneRepository


class JsonGameSceneRepository(GameSceneRepository):
    def __init__(self, base_path: str):
        self._base_path = base_path

    def _get_game_dir(self, date_str: str, game_no: str) -> str:
        return os.path.join(self._base_path, date_str, game_no)

    def save_scene(self, scene: GameScene, date_str: str, game_no: str, scene_no: int) -> None:
        game_dir = self._get_game_dir(date_str, game_no)
        os.makedirs(game_dir, exist_ok=True)
        file_path = os.path.join(game_dir, f"{scene_no}.json")
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(scene.to_dict(), f, indent=2, ensure_ascii=False)

    def save_initial_state(self, date_str: str, game_no: str, inning_state: str) -> None:
        game_dir = self._get_game_dir(date_str, game_no)
        os.makedirs(game_dir, exist_ok=True)
        file_path = os.path.join(game_dir, "1.json")
        data = {"liveHeader": {"inning": inning_state}}
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    def get_latest_saved_info(self, date_str: str, game_no: str) -> Tuple[int, Optional[Dict[str, Any]]]:
        game_dir = self._get_game_dir(date_str, game_no)
        if not os.path.exists(game_dir):
            return 0, None

        files = [f for f in os.listdir(game_dir) if f.endswith(".json")]
        if not files:
            return 0, None

        file_count = len(files)
        latest_file_path = os.path.join(game_dir, f"{file_count}.json")

        if not os.path.exists(latest_file_path):
            # 連番で存在しない場合は最大の数値を探索
            numbers = []
            for f in files:
                name, _ = os.path.splitext(f)
                if name.isdigit():
                    numbers.append(int(name))
            if numbers:
                file_count = max(numbers)
                latest_file_path = os.path.join(game_dir, f"{file_count}.json")
            else:
                return 0, None

        try:
            with open(latest_file_path, "r", encoding="utf-8") as f:
                loaded_json = json.load(f)
            return file_count, loaded_json
        except Exception as e:
            print(f"[WARN] Error reading latest saved json {latest_file_path}: {e}")
            return 0, None
