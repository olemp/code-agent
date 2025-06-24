import * as core from '@actions/core';
import { Octokit } from 'octokit';
import { RepoContext, GitHubEvent } from './types.js';

/**
 * Adds an 'eyes' reaction to the event source (issue or comment).
 */


export async function addEyeReaction(
  octokit: Octokit,
  repo: RepoContext,
  event: GitHubEvent
): Promise<void> {
  try {
    if (event.action === 'opened' && 'issue' in event) {
      // Add eye reaction to issue
      await octokit.rest.reactions.createForIssue({
        ...repo,
        issue_number: event.issue.number,
        content: 'eyes'
      });
      core.info(`👁️ added eye reaction to issue #${event.issue.number}`);
    } else if (event.action === 'created' && 'comment' in event && 'issue' in event) {
      // Add eye reaction to comment on issue or PR conversation
      await octokit.rest.reactions.createForIssueComment({
        ...repo,
        comment_id: event.comment.id,
        content: 'eyes'
      });
      core.info(`👁️ added eye reaction to comment on issue/pr #${event.issue.number}`);
    } else if (event.action === 'created' && 'comment' in event && 'pull_request' in event) {
      // Add eye reaction to PR review comment
      await octokit.rest.reactions.createForPullRequestReviewComment({
        ...repo,
        comment_id: event.comment.id,
        content: 'eyes'
      });
      core.info(`👁️ added eye reaction to review comment on pr #${event.pull_request.number}`);
    }
  } catch (error) {
    core.warning(`⚠️ failed to add reaction: ${error instanceof Error ? error.message : error}`);
  }
}
