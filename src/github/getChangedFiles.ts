import { Octokit } from 'octokit';
import { RepoContext, AgentEvent } from './types.js';



export async function getChangedFiles(
  octokit: Octokit,
  repo: RepoContext,
  event: AgentEvent
): Promise<string[]> {
  let prNumber: number;

  if (event.type === 'pullRequestCommentCreated') {
    prNumber = event.github.issue.number;
  } else if (event.type === 'pullRequestReviewCommentCreated') {
    prNumber = event.github.pull_request.number;
  } else {
    throw new Error(`Cannot get changed files for event type: ${event.type}`);
  }

  const prFilesResponse = await octokit.rest.pulls.listFiles({
    ...repo,
    pull_number: prNumber,
  });
  return prFilesResponse.data.map(file => file.filename);
}
