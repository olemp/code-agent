import * as core from '@actions/core';
import { runClaudeCode } from '../client/claudecode.js';
import { runCodex } from '../client/codex.js';
import { ActionConfig } from '../config/config.js';
import { captureFileState } from '../file/captureFileState.js';
import { detectChanges } from '../file/detectChanges.js';
import { maskSensitiveInfo } from '../security/security.js';
import { truncate } from '../utils/truncate.js';
import { handleResult } from './handleResult.js';
import { addEyeReaction } from './addEyeReaction.js';
import { cloneRepository } from './cloneRepository.js';
import { ProcessedEvent } from './types.js';
import { generatePrompt } from './generatePrompt.js';
import { postComment } from './postComment.js';
import { getActionRunUrl } from './getActionRunUrl.js';

/**
 * Executes the main logic of the GitHub Action.
 * 
 * @param config Action configuration.
 * @param processedEvent Processed event data.
 */
export async function runAction(config: ActionConfig, processedEvent: ProcessedEvent): Promise<void> {
  const { octokit, repo, workspace, githubToken, context, timeoutSeconds } = config;
  const { agentEvent, userPrompt } = processedEvent;

  await addEyeReaction(octokit, repo, agentEvent.github);
  const actionRunUrl = getActionRunUrl()
    
  if (config.disabled) {
    await postComment(octokit, repo, agentEvent.github, `Bork! It's Beagle, your furry Code Agent! You disabled me, so I'm not doing anything.`);
    return;
  }

  await postComment(octokit, repo, agentEvent.github, `Bork! It's Beagle, your furry Code Agent! Don't you worry, we'll get to the bottom of this issue... probably right after a nap. Follow the progress [here](${actionRunUrl}) anyway...`);

  await cloneRepository(workspace, githubToken, repo, context, octokit, agentEvent);

  const originalFileState = captureFileState(workspace, {
    excludePatterns: config.excludePatterns,
    includePatterns: config.includePatterns,
  });

  if(originalFileState.size === 0) {
    await postComment(octokit, repo, agentEvent.github, `Woof! My nose tells me no files were captured. Are your include/exclude patterns playing hide-and-seek?`);
    return;
  }

  const prompt = await generatePrompt(octokit, repo, agentEvent, userPrompt);

  core.info(`Woof! Just sniffing out the first bit of that prompt (first 50 characters): ${truncate(prompt, 50)}`);
  let output;
  try {
    let rawOutput: string;
    switch (processedEvent.type) {
      case 'codex':
        const codexResult = await runCodex(workspace, config, prompt, timeoutSeconds * 1000);
        rawOutput = codexResult.text; 
        break;
      case 'claude':
        rawOutput = runClaudeCode(workspace, config, prompt, timeoutSeconds * 1000);
        break;
      default:
        throw new Error(`Unknown event type: ${processedEvent.type}`);
    }
    output = maskSensitiveInfo(rawOutput, config);
  } catch (error) {
    await postComment(
      octokit,
      repo,
      agentEvent.github,
      `Bork! Drat! Beagle the Code Agent tried, but I seem to be having a bad dog day: ${error instanceof Error ? error.message : String(error)}`
    );
    return;
  }

  const changedFiles = detectChanges(workspace, originalFileState, config);

  await handleResult(config, processedEvent, output, changedFiles);
}
