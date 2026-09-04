import { BatchCliController } from "./presentation/cli/batch-cli.controller";

/**
 * メイン関数 (Refactored entrypoint delegation)
 */
export const execProcessJson = async () => {
  const controller = new BatchCliController();
  await controller.run();
};

