import { Octokit } from 'octokit';
import { RepoContext, AgentEvent, GithubContentsData } from './types.js';
import { getPullRequestData } from './getPullRequestData.js';
import { getPullRequestReviewCommentsData } from './getPullRequestReviewCommentsData.js';
import { getIssueData } from './getIssueData.js';



export async function getContentsData(
  octokit: Octokit,
  repo: RepoContext,
  event: AgentEvent
): Promise<GithubContentsData> {

  if (event.type === 'issuesOpened' || event.type === 'issueCommentCreated') {
    return await getIssueData(octokit, repo, event.github.issue.number);
  } else if (event.type === 'pullRequestCommentCreated') {
    return await getPullRequestData(octokit, repo, event.github.issue.number);
  } else if (event.type === 'pullRequestReviewCommentCreated') {
    return await getPullRequestReviewCommentsData(octokit, repo, event.github.pull_request.number, event.github.comment.in_reply_to_id ?? event.github.comment.id);
  }
  throw new Error('Invalid event type for data retrieval');
}
