import { Scene } from "../models/scene";

export interface ISceneRepository {
  saveAll(gameInfoId: number, scenes: Scene[], transactionManager?: any): Promise<void>;
}
