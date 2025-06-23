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
  const { octokit, repo, workspace, githubToken, context, timeoutSeconds } = config;
  const { agentEvent, userPrompt } = processedEvent;

  // Add eyes reaction
  await addEyeReaction(octokit, repo, agentEvent.github);

  await postComment(octokit, repo, agentEvent.github, `I'm Beagle the Code Agent, I'll help you solve this issue!`);

  // Clone repository
  await cloneRepository(workspace, githubToken, repo, context, octokit, agentEvent);

  // Capture initial file state with optimization
  const originalFileState = captureFileState(workspace, {
    excludePatterns: config.excludePatterns,
    includePatterns: config.includePatterns,
  });

  // generate Propmt
  const prompt = await generatePrompt(octokit, repo, agentEvent, userPrompt);

  core.info(`Prompt (first 100 characters): \n${limit(prompt, 100)}`);
  let output;
  try {
    let rawOutput: string;
    if (processedEvent.type === 'codex') {
      const codexResult = await runCodex(workspace, config, prompt, timeoutSeconds * 1000);
      rawOutput = codexResult.text; 
    } else {
      rawOutput = runClaudeCode(workspace, config, prompt, timeoutSeconds * 1000);
    }
    output = maskSensitiveInfo(rawOutput, config);
  } catch (error) {
    await postComment(
      octokit,
      repo,
      agentEvent.github,
      `Hi! I'm Beagle the Code Agent. I'm sorry, I was unable to execute the CLI: ${error instanceof Error ? error.message : String(error)}`
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
