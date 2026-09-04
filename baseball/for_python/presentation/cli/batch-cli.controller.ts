import * as moment from "moment";
import { format } from "util";
import { AppDataSource } from "../../util/datasource";
import { checkArgDaySeasonEndSpecify, checkArgI } from "../../util/display";
import { getDayInfo } from "../../util/day";
import { executeUpdatePlusOutCount } from "../../util/db";
import { savePitchData, saveBatAndScoreData, saveText } from "../../util/process";
import { ImportGameUseCase } from "../../application/usecases/import-game.usecase";
import { TypeORMGameRepository } from "../../infrastructure/database/typeorm-game.repository";
import { TypeORMSceneRepository } from "../../infrastructure/database/typeorm-scene.repository";
import { GameFileDataSource } from "../../infrastructure/file/game-file.datasource";

export class BatchCliController {
  private readonly importGameUseCase: ImportGameUseCase;
  private readonly fileDataSource: GameFileDataSource;

  constructor() {
    this.fileDataSource = new GameFileDataSource();
    this.importGameUseCase = new ImportGameUseCase(
      new TypeORMGameRepository(),
      new TypeORMSceneRepository(),
      this.fileDataSource
    );
  }

  public async run(): Promise<void> {
    try {
      await AppDataSource.initialize();

      const { D, SE, S, I } = process.env;
      const { targetDay, seasonEndArg, specifyArg } = checkArgDaySeasonEndSpecify(D, SE, S);
      const { YEAR, seasonStart, seasonEnd } = getDayInfo(targetDay, seasonEndArg);
      const { importGame, importText, importPitch, importBat } = checkArgI(I);

      if (importGame) {
        await this.runGameImport(YEAR, targetDay, seasonStart, seasonEnd, specifyArg);
        await executeUpdatePlusOutCount(
          format("%s%s", YEAR, targetDay),
          format("%s%s", YEAR, seasonEndArg)
        );
      }

      if (importText) await saveText(YEAR, targetDay, seasonStart, seasonEnd, specifyArg);
      if (importPitch) await savePitchData(YEAR, targetDay, seasonStart, seasonEnd, specifyArg);
      if (importBat) await saveBatAndScoreData(YEAR, targetDay, seasonStart, seasonEnd, specifyArg);

    } catch (err) {
      console.error("Batch processing failed:", err);
    } finally {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
    }
  }

  private async runGameImport(
    YEAR: string,
    targetDay: string,
    seasonStart: moment.Moment,
    seasonEnd: moment.Moment,
    specifyArg: number
  ): Promise<void> {
    const day = moment(format("%s%s", YEAR, targetDay), "YYYYMMDD");

    while (day.isSameOrAfter(seasonStart) && day.isSameOrBefore(seasonEnd)) {
      const dateStr = day.format("YYYYMMDD");
      const existDateDir = await this.fileDataSource.existDateDirectory(dateStr);
      if (!existDateDir) {
        day.add(1, "days");
        continue;
      }

      if (specifyArg) {
        const gameNoStr = format("0%d", Number(specifyArg));
        try {
          await this.importGameUseCase.execute(dateStr, gameNoStr, YEAR);
        } catch (err) {
          console.error(format("Error importing game %s on date %s:", gameNoStr, dateStr), err);
        }
      } else {
        for (let gameNo = 1; gameNo <= 6; gameNo++) {
          const gameNoStr = format("0%d", gameNo);
          try {
            await this.importGameUseCase.execute(dateStr, gameNoStr, YEAR);
          } catch (err) {
            console.error(format("Error importing game %s on date %s:", gameNoStr, dateStr), err);
          }
        }
      }

      day.add(1, "days");
    }

    console.log("----- done!! [game] -----");
  }
}
