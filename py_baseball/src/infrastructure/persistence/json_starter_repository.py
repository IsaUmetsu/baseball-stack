import json
import os
from src.domain.models.starter import StarterInfo
from src.domain.repositories.starter_repository import StarterRepository


class JsonStarterRepository(StarterRepository):
    def __init__(self, base_path: str):
        self._base_path = base_path

    def save(self, starter_info: StarterInfo, date_str: str, file_name: str) -> None:
        target_dir = os.path.join(self._base_path, date_str)
        os.makedirs(target_dir, exist_ok=True)

        if not file_name.endswith(".json"):
            file_name = f"{file_name}.json"

        file_path = os.path.join(target_dir, file_name)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(starter_info.to_dict(), f, indent=2, ensure_ascii=False)

