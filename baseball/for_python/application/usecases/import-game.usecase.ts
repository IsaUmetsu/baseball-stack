import { format } from "util";
import { IGameRepository } from "../../domain/repositories/game-repository.interface";
import { ISceneRepository } from "../../domain/repositories/scene-repository.interface";
import { GameFileDataSource } from "../../infrastructure/file/game-file.datasource";
import { Game } from "../../domain/models/game";
import { Scene } from "../../domain/models/scene";
import { AppDataSource } from "../../util/datasource";
import { teamArray as teams } from "../../constant";

export class ImportGameUseCase {
  constructor(
    private readonly gameRepository: IGameRepository,
    private readonly sceneRepository: ISceneRepository,
    private readonly fileDataSource: GameFileDataSource
  ) {}

  public async execute(dateStr: string, gameNoStr: string, year: string): Promise<void> {
    const existGameDir = await this.fileDataSource.existGameDirectory(dateStr, gameNoStr);
    if (!existGameDir) {
      return;
    }

    const sceneCnt = await this.fileDataSource.getSceneCount(dateStr, gameNoStr);
    let isNoGame = false;

    if (sceneCnt > 0) {
      const lastJson = this.fileDataSource.getSceneJson(dateStr, gameNoStr, sceneCnt);
      if (lastJson && lastJson.liveHeader) {
        isNoGame = ["試合中止", "ノーゲーム"].includes(lastJson.liveHeader.inning);
      }
    }

    const cards = this.fileDataSource.getCardsJson(dateStr, gameNoStr);
    const awayInitial = teams[cards.away.team];
    const homeInitial = teams[cards.home.team];

    // Transaction Boundary: 1 Game
    await AppDataSource.transaction(async (manager) => {
      const gameDomain = new Game(null, dateStr, awayInitial, homeInitial, gameNoStr, isNoGame);
      const gameInfoId = await this.gameRepository.save(gameDomain, year, manager);

      const sceneModels: Scene[] = [];
      for (let cnt = 1; cnt <= sceneCnt; cnt++) {
        const data = this.fileDataSource.getSceneJson(dateStr, gameNoStr, cnt);
        if (!data) continue;

        sceneModels.push(
          new Scene(cnt, data.liveHeader, data.liveBody, data.pitchInfo, data.homeTeamInfo, data.awayTeamInfo)
        );
      }

      if (sceneModels.length > 0) {
        await this.sceneRepository.saveAll(gameInfoId, sceneModels, manager);
      }

      console.log(
        format(
          "----- [game] finished: date: [%s], gameNo: [%s] %s -----",
          dateStr,
          gameNoStr,
          sceneCnt === 0 ? "but not imported [because not complete game]" : ""
        )
      );
    });
  }
}
