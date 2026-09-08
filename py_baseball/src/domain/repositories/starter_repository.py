
from abc import ABC, abstractmethod
from datetime import date
from src.domain.models.starter import StarterGameStats

class StarterRepository(ABC):
    @abstractmethod
    def save(self, game_stats: StarterGameStats, game_date: date, game_no: int):
        raise NotImplementedError
