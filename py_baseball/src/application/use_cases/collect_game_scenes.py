import datetime
import hashlib
import json
import re
import time
import traceback
from typing import List, Optional

from src.domain.repositories.game_scene_repository import GameSceneRepository
from src.infrastructure.scraper.game_scene_scraper import SeleniumGameSceneScraper
from src.infrastructure.scraper.scene_navigator import SceneStuckException


class CollectGameScenesUseCase:
    def __init__(self, scraper: SeleniumGameSceneScraper, repository: GameSceneRepository):
        self._scraper = scraper
        self._repository = repository

    def execute(
        self,
        start_date: datetime.date,
        end_date: datetime.date,
        specify: Optional[List[str]] = None,
        exclude: Optional[List[str]] = None,
        **kwargs,
    ):
        cur = start_date
        while cur <= end_date:
            date_str = cur.strftime("%Y%m%d")
            print(f"----- date: {cur.strftime('%Y/%m/%d')} -----")

            game_nos = self._scraper.get_game_nos(cur)
            if not game_nos:
                print(f"No games found on {cur.strftime('%Y-%m-%d')}. Skipping...")
                cur += datetime.timedelta(days=1)
                continue

            for idx, g_str in enumerate(game_nos):
                seq, game_no = str(idx + 1), f"{idx + 1:02d}"
                if specify and seq not in specify:
                    continue
                if exclude and seq in exclude:
                    continue

                try:
                    self._process_single_game(cur, date_str, game_no, g_str)
                except Exception as e:
                    print(f"[ERROR] Game {game_no} ({g_str}) on {date_str}: {e}")
                    traceback.print_exc()

            cur += datetime.timedelta(days=1)

    def _determine_resume_point(self, date_str: str, game_no: str, away: str, home: str):
        file_cnt, loaded = self._repository.get_latest_saved_info(date_str, game_no)
        if file_cnt <= 0 or not loaded:
            return 1, "表", 0, False

        saved_ing = loaded.get("liveHeader", {}).get("inning", "")
        print(f"----- game: {game_no}, {away} vs {home}, saved: {saved_ing}, count: {file_cnt} -----")
        if saved_ing in ["試合終了", "試合中止", "ノーゲーム"]:
            return 1, "表", file_cnt, True
        if saved_ing == "試合前":
            return 1, "表", 0, False

        m = re.match(r'^(\d+)回(表|裏)$', saved_ing)
        if m:
            c_ing, c_tb = int(m.group(1)), m.group(2)
            return (c_ing, "裏", file_cnt, False) if c_tb == "表" else (c_ing + 1, "表", file_cnt, False)

        return 1, "表", 0, False

    def _process_single_game(self, cur: datetime.date, date_str: str, game_no: str, g_str: str):
        if not self._scraper.open_game_score(cur, g_str):
            print(f"----- date: {cur.strftime('%m/%d')}, not found {game_no}, page: {g_str} -----")
            return

        t_away, t_home, a_init, h_init, curr_ing = self._scraper.get_game_initial_info()
        print(f"----- date: {cur.strftime('%m/%d')}, game: {game_no}, {a_init} vs {h_init}, inning: {curr_ing} -----")

        if curr_ing in ["試合前", "試合中止", "ノーゲーム"]:
            self._repository.save_initial_state(date_str, game_no, curr_ing)
            return

        to_ing, to_tb = (0, "")
        if curr_ing != "試合終了" and "回" in curr_ing:
            parts = curr_ing.split("回")
            to_ing, to_tb = int(parts[0]), parts[1]

        from_ing, from_tb, file_cnt, skip = self._determine_resume_point(date_str, game_no, a_init, h_init)
        if skip:
            return

        if not self._scraper.navigate_to_inning(from_ing, from_tb):
            print(f"Inning tab {from_ing}回{from_tb} not found. Skipping game.")
            return

        self._scraper.ensure_replay_mode()
        self._scraper.rewind_to_start_of_inning(from_ing, from_tb)

        scene = file_cnt
        prev_hash = None
        c_home = c_away = c_ing = None
        inning_retries = {}
        MAX_RETRIES = 3

        while True:
            scene += 1
            t0 = time.time()
            data, c_home, c_away, c_ing = self._scraper.extract_current_scene(t_away, t_home, c_home, c_away, c_ing)

            bat_res = data.liveBody.battingResult if data.liveBody else ""
            if bat_res in ["試合中止", "試合前"]:
                self._repository.save_scene(data, date_str, game_no, scene)
                break

            if to_ing > 0 and to_tb and "回" in data.liveHeader.inning:
                ci, cb = data.liveHeader.inning.split("回")
                if int(ci) == to_ing and cb == to_tb:
                    break

            j_str = json.dumps(data.to_dict(), sort_keys=True)
            cur_hash = hashlib.md5(j_str.encode()).hexdigest()

            if prev_hash and prev_hash == cur_hash:
                print("[WARN] 直前のシーンと完全一致したためスキップ/待機します")
                time.sleep(1.0)
                scene -= 1
            else:
                prev_hash = cur_hash
                self._repository.save_scene(data, date_str, game_no, scene)
                o_cnt = data.liveHeader.count.o if data.liveHeader.count else 0
                print(f"----- [done] date: {cur.strftime('%m/%d')}, game: {game_no}, {a_init} vs {h_init}, scene: {scene:3d}, {data.liveHeader.inning}, {o_cnt}アウト, {time.time()-t0:3.1f}s -----")

            try:
                if not self._scraper.advance_to_next_scene(data.liveHeader.inning):
                    break
            except SceneStuckException as e:
                print(f"[WARN] {e}")
                print(f"[INFO] Deleting stuck scene {scene} ({data.liveHeader.inning}) and retrying inning...")
                self._repository.delete_scene(date_str, game_no, scene)
                scene -= 1
                prev_hash = None
                c_home = c_away = c_ing = None

                cur_inning_str = data.liveHeader.inning
                m = re.match(r'(\d+)回(表|裏)', cur_inning_str)
                if not m:
                    print(f"[ERROR] Could not parse inning '{cur_inning_str}' to rewind. Breaking loop.")
                    break

                retry_ing, retry_tb = int(m.group(1)), m.group(2)
                retry_key = (retry_ing, retry_tb)
                inning_retries[retry_key] = inning_retries.get(retry_key, 0) + 1

                if inning_retries[retry_key] > MAX_RETRIES:
                    print(f"[ERROR] Exceeded max retries ({MAX_RETRIES}) for {cur_inning_str}. Breaking loop.")
                    break

                print(f"[INFO] Rewinding to start of {retry_ing}回{retry_tb} (retry {inning_retries[retry_key]}/{MAX_RETRIES})...")
                if not self._scraper.navigate_to_inning(retry_ing, retry_tb):
                    print(f"[ERROR] Failed to navigate to {retry_ing}回{retry_tb}. Breaking loop.")
                    break

                self._scraper.ensure_replay_mode()
                self._scraper.rewind_to_start_of_inning(retry_ing, retry_tb)
                continue
