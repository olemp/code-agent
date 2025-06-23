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
 * 
 * @param config Action configuration.
 * @param processedEvent Processed event data.
 */

export async function runAction(config: ActionConfig, processedEvent: ProcessedEvent): Promise<void> {
  const { octokit, repo, workspace, githubToken, context, timeoutSeconds } = config;
  const { agentEvent, userPrompt } = processedEvent;

  // Add eyes reaction
  await addEyeReaction(octokit, repo, agentEvent.github);

  await postComment(octokit, repo, agentEvent.github, `Bork! It's Beagle, your furry Code Agent! Don't you worry, we'll get to the bottom of this issue... probably right after a nap.`);

  // Clone repository
  await cloneRepository(workspace, githubToken, repo, context, octokit, agentEvent);

  // Capture initial file state with optimization
  const originalFileState = captureFileState(workspace, {
    excludePatterns: config.excludePatterns,
    includePatterns: config.includePatterns,
  });

  if(originalFileState.size === 0) {
    await postComment(octokit, repo, agentEvent.github, `Woof! My nose tells me no files were captured. Are your include/exclude patterns playing hide-and-seek?`);
    return;
  }

  const prompt = await generatePrompt(octokit, repo, agentEvent, userPrompt);

  core.info(`Woof! Just sniffing out the first bit of that prompt (first 100 characters): \n${limit(prompt, 100)}`);
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
      `Bork! Drat! Beagle the Code Agent tried, but the CLI seems to be having a bad dog day: ${error instanceof Error ? error.message : String(error)}`
    );
    return;
  }

  const changedFiles = detectChanges(workspace, originalFileState, config);

  await handleResult(config, processedEvent, output, changedFiles);
}
