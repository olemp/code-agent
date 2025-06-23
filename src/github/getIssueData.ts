import * as core from '@actions/core';
import { Octokit } from 'octokit';
import { RepoContext, GithubContentsData } from './types.js';

/**
 * Retrieves the body and all comment bodies for a specific issue.
 */
export async function getIssueData(
  octokit: Octokit,
  repo: RepoContext,
  issueNumber: number
): Promise<GithubContentsData> {
  core.info(`Fetching data for issue #${issueNumber}...`);
  try {
    const issueResponse = await octokit.rest.issues.get({
      ...repo,
      issue_number: issueNumber,
    });
    const content = {
      number: issueResponse.data.number,
      title: issueResponse.data.title,
      body: issueResponse.data.body ?? '',
      login: issueResponse.data.user?.login ?? 'anonymous'
    };

    // Get all issue comments by using paginate
    const commentsData = await octokit.paginate(octokit.rest.issues.listComments, {
      ...repo,
      issue_number: issueNumber,
      per_page: 100, // Fetch 100 per page for efficiency
    });

    const comments = commentsData.map(comment => ({
      body: comment.body ?? '',
      login: comment.user?.login ?? 'anonymous'
    })); // Extract comment bodies and authors
    core.info(`Fetched ${commentsData.length} comments for issue #${issueNumber}.`);

    return { content, comments };
  } catch (error) {
    core.error(`Failed to get data for issue #${issueNumber}: ${error}`);
    throw new Error(`Could not retrieve data for issue #${issueNumber}: ${error instanceof Error ? error.message : error}`);
  }
}
