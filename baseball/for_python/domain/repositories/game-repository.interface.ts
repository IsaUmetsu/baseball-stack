import { Game } from "../models/game";

export interface IGameRepository {
  find(date: string, awayTeamInitial: string, homeTeamInitial: string): Promise<Game | null>;
  save(game: Game, year: string, transactionManager?: any): Promise<number>;
}

