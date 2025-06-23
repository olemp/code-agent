import * as core from '@actions/core';
import { Octokit } from 'octokit';
import { RepoContext, GithubContentsData } from './types.js';

/**
 * Retrieves the body and all review comment bodies for a specific pull request.
 * Note: PR review comments are fetched via the pulls API endpoint.
 */


export async function getPullRequestReviewCommentsData(
  octokit: Octokit,
  repo: RepoContext,
  pullNumber: number,
  targetCommentId: number
): Promise<GithubContentsData> {
  core.info(`Fetching data for pull request review comments #${pullNumber}...`);
  try {
    // Get PR body
    const prResponse = await octokit.rest.pulls.get({
      ...repo,
      pull_number: pullNumber,
    });
    const content = {
      number: prResponse.data.number,
      title: prResponse.data.title,
      body: prResponse.data.body ?? '',
      login: prResponse.data.user?.login ?? 'anonymous'
    };

    // Get PR review comments
    const commentsData = await octokit.paginate(octokit.rest.pulls.listReviewComments, {
      ...repo,
      pull_number: pullNumber,
      per_page: 100, // Fetch 100 per page for efficiency
    });

    // Filter comments to include only those related to the target comment ID
    const comments = commentsData.filter(comment => comment.id === targetCommentId || comment.in_reply_to_id === targetCommentId).map(comment => ({
      body: comment.body ?? '',
      login: comment.user?.login ?? 'anonymous'
    }));
    core.info(`Fetched ${commentsData.length} review comments for PR #${pullNumber}.`);

    return { content, comments };
  } catch (error) {
    core.error(`Failed to get data for pull request review comments #${pullNumber}: ${error}`);
    throw new Error(`Could not retrieve data for pull request review comments #${pullNumber}: ${error instanceof Error ? error.message : error}`);
  }
}
