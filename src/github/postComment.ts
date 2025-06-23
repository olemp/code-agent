import * as core from '@actions/core';
import { Octokit } from 'octokit';
import { RepoContext, GitHubEvent } from './types.js';
import { truncateOutput } from './truncateOutput.js';

/**
 * Posts a comment to the issue or PR with retry mechanism for transient errors.
 */


export async function postComment(
  octokit: Octokit,
  repo: RepoContext,
  event: GitHubEvent,
  body: string,
  maxRetries = 3,
  retryDelay = 1000
): Promise<void> {
  let retries = 0;

  while (true) {
    try {
      if ('issue' in event) {
        // For regular issues and PR conversation comments
        const issueNumber = event.issue.number;
        await octokit.rest.issues.createComment({
          ...repo,
          issue_number: issueNumber,
          body: truncateOutput(body),
        });
        core.info(`Comment posted to Issue/PR #${issueNumber}`);
        return; // Success! Exit the retry loop
      } else if ('pull_request' in event) {
        // For PR review comments
        const prNumber = event.pull_request.number;
        const commentId = event.comment.id;
        const inReplyTo = event.comment.in_reply_to_id;

        try {
          await octokit.rest.pulls.createReplyForReviewComment({
            ...repo,
            pull_number: prNumber,
            comment_id: inReplyTo ?? commentId, // Use the original comment ID if no reply
            body: truncateOutput(body),
          });
          core.info(`Comment posted to PR #${prNumber} Reply to comment #${commentId}`);
          return; // Success! Exit the retry loop

        } catch (commentError) {
          // If we can't determine if it's a top-level comment, fall back to creating a regular PR comment
          core.warning(`Failed to check if comment is top-level: ${commentError instanceof Error ? commentError.message : commentError}`);
          core.info(`Falling back to creating a regular PR comment instead of a reply`);
          await octokit.rest.issues.createComment({
            ...repo,
            issue_number: prNumber,
            body: truncateOutput(body),
          });
          core.info(`Regular comment posted to PR #${prNumber}`);
          return; // Success! Exit the retry loop
        }
      }
      return; // If we get here without an event match, just return
    } catch (error) {
      // Check if we should retry
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isRetryableError = errorMessage.includes('EPIPE') ||
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('network');

      if (isRetryableError && retries < maxRetries) {
        retries++;
        const waitTime = retryDelay * retries; // Exponential backoff
        core.warning(`Network error when posting comment: ${errorMessage}. Retrying ${retries}/${maxRetries} in ${waitTime}ms...`);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue; // Try again
      }

      // Either not retryable or out of retries
      core.error(`Failed to post comment after ${retries} retries: ${errorMessage}`);
      // Don't re-throw here, as posting a comment failure might not be critical
      return;
    }
  }
}
