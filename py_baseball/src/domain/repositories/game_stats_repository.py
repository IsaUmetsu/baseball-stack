from abc import ABC, abstractmethod
from src.domain.models.stats import GameStats

class GameStatsRepository(ABC):
    @abstractmethod
    def save(self, game_stats: GameStats) -> None:
        """
        Saves the game statistics.
        """
        raise NotImplementedError
