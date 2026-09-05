import { EntityManager } from "typeorm";
import { Game } from "../../domain/models/game";
import { IGameRepository } from "../../domain/repositories/game-repository.interface";
import { GameInfo } from "../../entities/GameInfo";
import { AppDataSource } from "../../util/datasource";

export class TypeORMGameRepository implements IGameRepository {
  private getRepository(manager?: EntityManager) {
    const repo = manager ? manager.getRepository(GameInfo) : AppDataSource.getRepository(GameInfo);
    return repo;
  }

  public async find(date: string, awayTeamInitial: string, homeTeamInitial: string): Promise<Game | null> {
    const repo = this.getRepository();
    const entity = await repo.findOne({ where: { date, awayTeamInitial, homeTeamInitial } });
    if (!entity) return null;
    return new Game(
      entity.id,
      entity.date,
      entity.awayTeamInitial,
      entity.homeTeamInitial,
      entity.gameNo,
      Boolean(entity.noGame)
    );
  }

  public async save(game: Game, year: string, manager?: EntityManager): Promise<number> {
    const repo = this.getRepository(manager);
    let entity = await repo.findOne({
      where: { date: game.date, awayTeamInitial: game.awayTeamInitial, homeTeamInitial: game.homeTeamInitial },
    });

    if (!entity) {
      entity = new GameInfo();
      entity.date = game.date;
      entity.awayTeamInitial = game.awayTeamInitial;
      entity.homeTeamInitial = game.homeTeamInitial;
      entity.gameNo = game.gameNo;
    }

    entity.noGame = Number(game.isNoGame);
    entity.isOp = Number(game.isOpeningGame(year));
    entity.isRg = Number(game.isRegularSeason(year));
    entity.isIl = Number(game.isInterLeague(year));
    entity.isCs = Number(game.isClimaxSeries(year));
    entity.isJs = Number(game.isJapanSeries(year));

    if (manager) {
      await manager.save(entity);
    } else {
      await entity.save();
    }
    return entity.id;
  }
}
