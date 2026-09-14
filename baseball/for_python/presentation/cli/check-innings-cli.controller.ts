import * as path from "path";
import * as fs from "fs";
import * as moment from "moment";
import { format } from "util";
import { checkArgDaySeasonEndSpecify } from "../../util/display";
import { getDayInfo } from "../../util/day";
import { GameFileDataSource } from "../../infrastructure/file/game-file.datasource";
import { CheckInningsProgressionUseCase } from "../../application/usecases/check-innings-progression.usecase";

export class CheckInningsCliController {
  private static readonly START_GAME_NO = 1;
  private static readonly END_GAME_NO = 6;

  private readonly fileDataSource: GameFileDataSource;
  private readonly checkUseCase: CheckInningsProgressionUseCase;
  private readonly rerunCommands: string[] = [];

  constructor() {
    this.fileDataSource = new GameFileDataSource();
    this.checkUseCase = new CheckInningsProgressionUseCase(this.fileDataSource);
  }

  public async run(): Promise<void> {
    const { D, SE, S, CLEAN } = process.env;
    const isCleanMode = CLEAN === "true" || CLEAN === "1";
    const { targetDay, seasonEndArg, specifyArg } = checkArgDaySeasonEndSpecify(D, SE, S);
    const { day, seasonStart, seasonEnd } = getDayInfo(targetDay, seasonEndArg);

    while (day.isSameOrAfter(seasonStart) && day.isSameOrBefore(seasonEnd)) {
      const dateStr = day.format("YYYYMMDD");
      const existDateDir = await this.fileDataSource.existDateDirectory(dateStr);
      if (!existDateDir) {
        day.add(1, "days");
        continue;
      }

      if (specifyArg) {
        await this.checkGame(Number(specifyArg), dateStr, isCleanMode);
      } else {
        for (let gameNo = CheckInningsCliController.START_GAME_NO; gameNo <= CheckInningsCliController.END_GAME_NO; gameNo++) {
          await this.checkGame(gameNo, dateStr, isCleanMode);
        }
      }
      day.add(1, "days");
    }

    this.outputRerunCommands();
    console.log("----- all check finished -----");
  }

  private async checkGame(gameNo: number, dateStr: string, isCleanMode: boolean): Promise<void> {
    const targetGameNo = format("0%d", gameNo);
    const result = await this.checkUseCase.execute(dateStr, targetGameNo, isCleanMode);
    if (!result) return;

    if (result.needRerun) {
      const rerunCmd = this.addRerunCommand(dateStr, targetGameNo);
      if (result.hasError) {
        console.log(`[RERUN CMD (エラー検知)] ${rerunCmd}`);
      } else if (!result.isFinished) {
        console.log(`[RERUN CMD (未終了)] ${rerunCmd}`);
      }
    }
  }

  private addRerunCommand(dateStr: string, targetGameNo: string): string {
    const mmdd = dateStr.slice(4);
    const gameNoNum = Number(targetGameNo);
    const rerunCmd = `docker compose exec py python3 src/main_scenes.py --date ${mmdd} -s ${gameNoNum}`;
    if (!this.rerunCommands.includes(rerunCmd)) {
      this.rerunCommands.push(rerunCmd);
    }
    return rerunCmd;
  }

  private outputRerunCommands(): void {
    if (this.rerunCommands.length === 0) return;

    console.log("\n----- RERUN COMMANDS LIST -----");
    this.rerunCommands.forEach((cmd) => console.log(cmd));

    if (this.rerunCommands.length >= 2) {
      const timestamp = moment().format("YYYYMMDDHHmmss");
      const filename = `rerun-${timestamp}.sh`;
      const filePath = path.join(process.cwd(), filename);
      const shContent = `#!/bin/bash\n\n${this.rerunCommands.join("\n")}\n\necho "===== RERUN COMPLETE =====\n"`;
      fs.writeFileSync(filePath, shContent, "utf8");
      fs.chmodSync(filePath, 0o755);
      console.log(`\n[INFO] 複数件の再取得コマンドがあるため、シェルスクリプトを自動生成しました: baseball/${filename}`);
      console.log(`実行方法: bash baseball/${filename}\n`);
    }
  }
}
