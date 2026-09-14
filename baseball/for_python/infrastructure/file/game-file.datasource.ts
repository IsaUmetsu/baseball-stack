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

  public deleteScenes(dateStr: string, gameNo: string, fromScene: number, toScene: number): number {
    let deletedCount = 0;
    for (let s = fromScene; s <= toScene; s++) {
      const filePath = format(this.jsonPath, dateStr, gameNo, s);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  public removeDuplicateAndRenumber(dateStr: string, gameNo: string, duplicateSceneNo: number, totalSceneCnt: number): void {
    const dupFilePath = format(this.jsonPath, dateStr, gameNo, duplicateSceneNo);
    if (fs.existsSync(dupFilePath)) {
      fs.unlinkSync(dupFilePath);
    }

    for (let s = duplicateSceneNo + 1; s <= totalSceneCnt; s++) {
      const oldPath = format(this.jsonPath, dateStr, gameNo, s);
      const newPath = format(this.jsonPath, dateStr, gameNo, s - 1);
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
      }
    }
  }
}

