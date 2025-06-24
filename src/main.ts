import * as core from '@actions/core';
import { getConfig } from './config/config.js';
import { processEvent } from './github/processEvent.js';
import { runAction } from './github/runAction.js';
import { checkPermission } from './security/security.js';

/**
 * Main function for the GitHub Action.
 */
export async function run(): Promise<void> {
  try {
    const config = getConfig();
    const processedEvent = processEvent(config);

    if (!processedEvent) {
      return;
    }

    const hasPermission = await checkPermission(config);
    if (!hasPermission) {
      core.warning('Permission check failed. Exiting process.');
      return;
    }

    await runAction(config, processedEvent);

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed: ${error.message}\n${error.stack}`);
    } else {
      core.setFailed(`An unknown error occurred: ${error}`);
    }
  }
}
