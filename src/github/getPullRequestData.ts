import * as core from '@actions/core';
import { Octokit } from 'octokit';
import { RepoContext, GithubContentsData } from './types.js';

/**
 * Retrieves the body and all comment bodies for a specific pull request.
 * Note: PR comments are fetched via the issues API endpoint.
 */


export async function getPullRequestData(
  octokit: Octokit,
  repo: RepoContext,
  pullNumber: number
): Promise<GithubContentsData> {
  core.info(`📊 fetching data for pull request #${pullNumber}...`);
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

    // Get all PR comments by using paginate (using the issues API endpoint for the corresponding issue number)
    const commentsData = await octokit.paginate(octokit.rest.issues.listComments, {
      ...repo,
      issue_number: pullNumber, // Use pullNumber as issue_number for comments
      per_page: 100, // Fetch 100 per page for efficiency
    });
    const comments = commentsData.map(comment => ({
      body: comment.body ?? '',
      login: comment.user?.login ?? 'unknown'
    }));
    core.info(`✅ fetched ${commentsData.length} comments for pr #${pullNumber}.`);

    // Note: This fetches *issue comments* on the PR. To get *review comments* (comments on specific lines of code),
    // you would use `octokit.paginate(octokit.rest.pulls.listReviewComments, { ... })`.
    // The current request asks for "all comments written on the PR", which typically refers to the main conversation thread (issue comments).
    return { content, comments };
  } catch (error) {
    core.error(`❌ failed to get data for pull request #${pullNumber}: ${error}`);
    throw new Error(`Could not retrieve data for pull request #${pullNumber}: ${error instanceof Error ? error.message : error}`);
  }
}
