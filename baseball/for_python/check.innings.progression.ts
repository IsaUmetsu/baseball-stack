import { CheckInningsCliController } from "./presentation/cli/check-innings-cli.controller";

/**
 * イニング整合性チェック メイン関数 (Refactored entrypoint delegation)
 */
export const execCheckInningsProgression = async (): Promise<void> => {
  const controller = new CheckInningsCliController();
  await controller.run();
};
