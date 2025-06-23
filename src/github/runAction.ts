import * as core from '@actions/core';
import { runClaudeCode } from '../client/claudecode.js';
import { runCodex } from '../client/codex.js';
import { ActionConfig } from '../config/config.js';
import { captureFileState } from '../file/captureFileState.js';
import { detectChanges } from '../file/detectChanges.js';
import { maskSensitiveInfo } from '../security/security.js';
import { limit } from '../utils/limit.js';
import { handleResult } from './handleResult.js';
import { addEyeReaction } from './addEyeReaction.js';
import { cloneRepository } from './cloneRepository.js';
import { ProcessedEvent } from './types.js';
import { generatePrompt } from './generatePrompt.js';
import { postComment } from './postComment.js';

/**
 * Executes the main logic of the GitHub Action.
 * @param config Action configuration.
 * @param processedEvent Processed event data.
 */

export async function runAction(config: ActionConfig, processedEvent: ProcessedEvent): Promise<void> {
  const { octokit, repo, workspace, githubToken, context, anthropicApiKey, timeoutSeconds } = config;
  const { agentEvent, userPrompt } = processedEvent;

  // Add eyes reaction
  await addEyeReaction(octokit, repo, agentEvent.github);

  // Clone repository
  await cloneRepository(workspace, githubToken, repo, context, octokit, agentEvent);

  // Capture initial file state
  const originalFileState = captureFileState(workspace);

  // generate Propmt
  const prompt = await generatePrompt(octokit, repo, agentEvent, userPrompt);

  core.info(`Prompt: \n${limit(prompt, 100)}`);
  let output;
  try {
    let rawOutput: string; // Explicitly type rawOutput as string
    if (processedEvent.type === 'codex') {
      // Handle the new ICodexResult type
      const codexResult = await runCodex(workspace, config, prompt, timeoutSeconds * 1000);
      core.info(`Codex Result: \n${JSON.stringify(codexResult)}`);
      rawOutput = codexResult.text; // Extract just the text property
    } else {
      // Add await here too for consistency and potential async nature
      rawOutput = runClaudeCode(workspace, config, prompt, timeoutSeconds * 1000);
    }
    // No change needed here as rawOutput will be a string after await
    output = maskSensitiveInfo(rawOutput, config);
  } catch (error) {
    await postComment(
      octokit,
      repo,
      agentEvent.github,
      `CLI execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return;
  }
  core.info(`Output: \n${output}`);

  // Detect file changes
  const changedFiles = detectChanges(workspace, originalFileState);

  // Handle the results
  await handleResult(config, processedEvent, output, changedFiles);

  core.info('Action completed successfully.');
}
