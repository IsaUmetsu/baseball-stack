from abc import ABC, abstractmethod
from typing import Tuple, Optional, Dict, Any
from src.domain.models.game_scene import GameScene


class GameSceneRepository(ABC):
    @abstractmethod
    def save_scene(self, scene: GameScene, date_str: str, game_no: str, scene_no: int) -> None:
        """
        特定のシーンデータを保存する。
        """
        raise NotImplementedError

    @abstractmethod
    def save_initial_state(self, date_str: str, game_no: str, inning_state: str) -> None:
        """
        試合前・試合中止・ノーゲーム時の初期状態（1.json）を保存する。
        """
        raise NotImplementedError

    @abstractmethod
    def get_latest_saved_info(self, date_str: str, game_no: str) -> Tuple[int, Optional[Dict[str, Any]]]:
        """
        保存済みファイル数と、最後に保存されたJSONの内容を取得する。
        破損している場合や未保存の場合は (0, None) を返す。
        """
        raise NotImplementedError

    @abstractmethod
    def delete_scene(self, date_str: str, game_no: str, scene_no: int) -> None:
        """
        特定のシーンデータ（JSON）を削除する。
        """
        raise NotImplementedError

