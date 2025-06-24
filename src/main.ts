import * as core from '@actions/core';
import { getConfig } from './config/config.js';
import { runAction } from './github/runAction.js';
import { checkPermission } from './security/security.js';
import { ActionContext } from './github/ActionContext.js';

/**
 * Main function for the GitHub Action.
 */
export async function run(): Promise<void> {
  try {
    const config = getConfig();
    
    let context: ActionContext;
    try {
      context = new ActionContext(config);
    } catch (error) {
      // ActionContext constructor handles processEvent internally
      // If it fails, it means no valid trigger was found
      return;
    }

    const hasPermission = await checkPermission(config);
    if (!hasPermission) {
      core.warning('⚠️ permission check failed. exiting process.');
      return;
    }

    await runAction(context);

  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed: ${error.message}\n${error.stack}`);
    } else {
      core.setFailed(`An unknown error occurred: ${error}`);
    }
  }
}
