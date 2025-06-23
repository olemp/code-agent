import * as core from '@actions/core';
import { generateCommitMessage as generateCommitMessageAnthropic } from '../api/claude.js';
import { generateCommitMessage as generateCommitMessageOpenAI } from '../api/openai.js';
import { ActionConfig } from '../config/config.js';
import { commitChanges } from './commitChanges.js';
import { createPullRequest } from './createPullRequest.js';
import { ProcessedEvent } from './types.js';
import { postComment } from './postComment.js';

/**
 * Handles the result of execution.
 * @param config Action configuration.
 * @param processedEvent Processed event data.
 * @param output
 * @param changedFiles Array of changed file paths.
 */

export async function handleResult(
  config: ActionConfig,
  processedEvent: ProcessedEvent,
  output: string,
  changedFiles: string[]
): Promise<void> {
  const { octokit, repo, workspace } = config;
  const { agentEvent, userPrompt } = processedEvent;

  if (changedFiles.length > 0) {
    core.info(`Detected changes in ${changedFiles.length} files:\n${changedFiles.join('\n')}`);

    const generateCommitMessage = processedEvent.type === 'codex'
      ? generateCommitMessageOpenAI
      : generateCommitMessageAnthropic;
    // Generate commit message
    const commitMessage = await generateCommitMessage(
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
      await commitChanges(
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
