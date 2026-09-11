from abc import ABC, abstractmethod
from src.domain.models.starter import StarterInfo


class StarterRepository(ABC):
    @abstractmethod
    def save(self, starter_info: StarterInfo, date_str: str, file_name: str) -> None:
        """Saves the starter information."""
        raise NotImplementedError

