import datetime
import os
import tempfile
import unittest
from unittest.mock import MagicMock

from src.application.use_cases.collect_game_scenes import CollectGameScenesUseCase
from src.domain.models.game_scene import GameScene, LiveBody, LiveCount, LiveHeader
from src.infrastructure.persistence.json_game_scene_repository import JsonGameSceneRepository
from src.infrastructure.scraper.scene_navigator import SceneStuckException


class TestJsonGameSceneRepositoryDelete(unittest.TestCase):
    def test_delete_existing_scene(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            repo = JsonGameSceneRepository(tmpdir)
            game_dir = os.path.join(tmpdir, "20260628", "02")
            os.makedirs(game_dir, exist_ok=True)
            scene_path = os.path.join(game_dir, "49.json")
            with open(scene_path, "w") as f:
                f.write("{}")

            self.assertTrue(os.path.exists(scene_path))
            repo.delete_scene("20260628", "02", 49)
            self.assertFalse(os.path.exists(scene_path))

    def test_delete_non_existing_scene_does_not_raise(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            repo = JsonGameSceneRepository(tmpdir)
            # Should not raise any exception
            repo.delete_scene("20260628", "02", 999)


class TestCollectGameScenesUseCaseRetry(unittest.TestCase):
    def test_scene_stuck_exception_deletes_scene_and_rewinds(self):
        mock_scraper = MagicMock()
        mock_repo = MagicMock()

        mock_scraper.open_game_score.return_value = True
        mock_scraper.get_game_initial_info.return_value = ("中", "ヤ", "D", "S", "試合終了")
        mock_repo.get_latest_saved_info.return_value = (48, {"liveHeader": {"inning": "6回表"}})
        mock_scraper.navigate_to_inning.return_value = True

        header = LiveHeader(inning="6回裏", away=None, home=None, count=LiveCount(b=0, s=0, o=0))
        body = LiveBody(
            battingResult="",
            pitchingResult="",
            onbaseInfo=[],
            currentBatterInfo=None,
            currentPicherInfo=None,
            nextBatter="",
            inningBatterCnt="",
        )
        scene = GameScene(liveHeader=header, liveBody=body, pitchInfo=None, homeTeamInfo=None, awayTeamInfo=None)
        mock_scraper.extract_current_scene.return_value = (scene, None, None, "6回裏")

        # First advance_to_next_scene raises SceneStuckException, second returns False (finish)
        mock_scraper.advance_to_next_scene.side_effect = [
            SceneStuckException("Scene signature did not change at 6回裏."),
            False,
        ]

        use_case = CollectGameScenesUseCase(scraper=mock_scraper, repository=mock_repo)
        cur = datetime.date(2026, 6, 28)
        use_case._process_single_game(cur, "20260628", "02", "dummy")

        # 49.json should have been deleted
        mock_repo.delete_scene.assert_called_once_with("20260628", "02", 49)
        # rewind_to_start_of_inning should be called on start and after stuck exception
        self.assertEqual(mock_scraper.rewind_to_start_of_inning.call_count, 2)
        mock_scraper.rewind_to_start_of_inning.assert_called_with(6, "裏")


if __name__ == "__main__":
    unittest.main()
