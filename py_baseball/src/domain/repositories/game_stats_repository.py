from abc import ABC, abstractmethod
from typing import List

from src.domain.models.stats import BatterStatsData, PitcherStatsData, TextPlayItem


class GameStatsRepository(ABC):
    @abstractmethod
    def save_pitcher_stats(self, date_str: str, file_name: str, data: PitcherStatsData) -> None:
        """Saves pitcher statistics."""
        raise NotImplementedError

    @abstractmethod
    def save_batter_stats(self, date_str: str, file_name: str, data: BatterStatsData) -> None:
        """Saves batter statistics."""
        raise NotImplementedError

    @abstractmethod
    def save_text_stats(self, date_str: str, file_name: str, data: List[TextPlayItem]) -> None:
        """Saves text summary statistics."""
        raise NotImplementedError

