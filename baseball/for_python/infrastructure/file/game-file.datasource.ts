import * as path from "path";
import * as fs from "fs";
import { format } from "util";
import { BASEBALL_DATA_DIR, checkGameDir, countFiles, getJson, checkDateDir } from "../../util/fs";
import { OutputJson } from "../../type/jsonType";

export class GameFileDataSource {
  private readonly baseDir: string;
  private readonly cardsJsonPath: string;
  private readonly gamePath: string;
  private readonly jsonPath: string;

  constructor() {
    this.baseDir = BASEBALL_DATA_DIR ?? "/app/py_baseball";
    this.cardsJsonPath = path.join(this.baseDir, "starter", "%s", "%s.json");
    this.gamePath = path.join(this.baseDir, "output", "%s", "%s");
    this.jsonPath = path.join(this.baseDir, "output", "%s", "%s", "%s.json");
  }

  public async existDateDirectory(dateStr: string): Promise<boolean> {
    const datePath = path.join(this.baseDir, "output");
    return await checkDateDir(datePath, dateStr);
  }

  public async existGameDirectory(dateStr: string, gameNo: string): Promise<boolean> {
    const datePath = path.join(this.baseDir, "output");
    return await checkGameDir(datePath, dateStr, gameNo);
  }

  public async getSceneCount(dateStr: string, gameNo: string): Promise<number> {
    return await countFiles(format(this.gamePath, dateStr, gameNo));
  }

  public getCardsJson(dateStr: string, gameNo: string): { away: { team: string }; home: { team: string } } {
    const filePath = format(this.cardsJsonPath, dateStr, gameNo);
    return JSON.parse(getJson(filePath));
  }

  public getSceneJson(dateStr: string, gameNo: string, sceneNo: number): OutputJson | undefined {
    const filePath = format(this.jsonPath, dateStr, gameNo, sceneNo);
    try {
      return JSON.parse(getJson(filePath)) as OutputJson;
    } catch (err) {
      return undefined;
    }
  }
}
