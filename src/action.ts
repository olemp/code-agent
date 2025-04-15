import * as core from '@actions/core';
import {
  cloneRepository,
  addEyeReaction,
  createPullRequest,
  commitAndPush,
  postComment,
  generatePrompt,
} from './github.js';
import { generateCommitMessage } from './claude.js';
import { runClaudeCode } from './claudecode.js';
import { captureFileState, detectChanges } from './file.js';
import { ActionConfig } from './config.js';
import { ProcessedEvent } from './event.js';
import { maskSensitiveInfo } from './permission.js';
import { startClaudeCodeProxyServer } from './claudecodeproxy.js';

/**
 * Handles the result of execution.
 * @param config Action configuration.
 * @param processedEvent Processed event data.
 * @param output
 * @param changedFiles Array of changed file paths.
 */
async function handleResult(
  config: ActionConfig,
  processedEvent: ProcessedEvent,
  output: string,
  changedFiles: string[]
): Promise<void> {
  const { octokit, repo, workspace, anthropicApiKey } = config;
  const { agentEvent, userPrompt } = processedEvent;

  if (changedFiles.length > 0) {
    core.info(`Detected changes in ${changedFiles.length} files:\n${changedFiles.join('\n')}`);

    // Generate commit message
    const commitMessage = await generateCommitMessage(
      anthropicApiKey,
      changedFiles,
      userPrompt,
      {
        issueNumber: (agentEvent.type === 'issuesOpened' || agentEvent.type === 'issueCommentCreated') ? agentEvent.github.issue.number : undefined,
        prNumber: agentEvent.type === 'pullRequestCommentCreated' 
                  ? agentEvent.github.issue.number 
                  : agentEvent.type === 'pullRequestReviewCommentCreated'
                  ? agentEvent.github.pull_request.number
                  : undefined,
      },
      config
    );

    // Handle changes based on event type
    if (agentEvent.type === 'issuesOpened' || agentEvent.type === 'issueCommentCreated') {
      await createPullRequest(
        workspace,
        octokit,
        repo,
        agentEvent.github,
        commitMessage,
        output
      );
    } else if (agentEvent.type === 'pullRequestCommentCreated' || agentEvent.type === 'pullRequestReviewCommentCreated') {
      await commitAndPush(
        workspace,
        octokit,
        repo,
        agentEvent.github,
        commitMessage,
        output
      );
    }
  } else {
    // No files changed, post Claude's output as a comment
    await postComment(octokit, repo, agentEvent.github, `${output}`);
  }
}

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

  // Check if Claude Code proxy is enabled
  let proxyAbortController: AbortController | undefined;
  if (config.useClaudeCodeProxy) {
    core.info('Starting Claude Code proxy server...');
    proxyAbortController = startClaudeCodeProxyServer(config);
  }

  // Execute Claude CLI
  core.info('Executing Claude Code CLI...');
  core.info(`Prompt: \n${prompt}`);
  let output;
  try {
    const rawOutput = runClaudeCode(workspace, config, prompt, timeoutSeconds * 1000);
    output = maskSensitiveInfo(rawOutput, config);
  } catch (error) {
    await postComment(
      octokit,
      repo,
      agentEvent.github,
      `Claude Code CLI execution failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return;
  }
  core.info(`Output: \n${output}`);

  // Detect file changes
  const changedFiles = detectChanges(workspace, originalFileState);

  // Handle the results
  await handleResult(config, processedEvent, output, changedFiles);

  // Cancel the proxy server if it was started
  if (proxyAbortController) {
    proxyAbortController.abort();
  }

  core.info('Action completed successfully.');
}
