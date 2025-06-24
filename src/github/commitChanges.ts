import * as core from '@actions/core';
import { execaSync } from 'execa';
import { Octokit } from 'octokit';
import { RepoContext, GitHubEventPullRequestCommentCreated, GitHubEventPullRequestReviewCommentCreated } from './types.js';
import { postComment } from './postComment.js';

/**
 * Commits changes to the existing PR branch.
 */
export async function commitChanges(
  workspace: string,
  octokit: Octokit,
  repo: RepoContext,
  event: GitHubEventPullRequestCommentCreated | GitHubEventPullRequestReviewCommentCreated,
  commitMessage: string,
  output: string
): Promise<void> {
  // Get PR number from the event - different location based on event type
  const prNumber = 'issue' in event ? event.issue.number : event.pull_request.number;

  try {
    // Get current branch name from the PR context
    let currentBranch: string;
    try {
      const prData = await octokit.rest.pulls.get({ ...repo, pull_number: prNumber });
      currentBranch = prData.data.head.ref;
      core.info(`🔄 checked out pr branch: ${currentBranch}`);
      // Ensure we are on the correct branch
      execaSync('git', ['checkout', currentBranch], { cwd: workspace, stdio: 'inherit' });
    } catch (e) {
      // Fallback if PR data fetch fails (should ideally not happen in this context)
      core.warning(`⚠️ could not get pr branch from api, attempting to use current branch: ${e}`);
      const branchResult = execaSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: workspace });
      currentBranch = branchResult.stdout.trim();
      core.info(`🌳 using current branch from git: ${currentBranch}`);
      // Ensure we are on the correct branch if the checkout happened before the action ran
      execaSync('git', ['checkout', currentBranch], { cwd: workspace, stdio: 'inherit' });
    }

    core.info('⚙️ configuring git user identity locally...');
    execaSync('git', ['config', 'user.name', 'github-actions[bot]'], { cwd: workspace, stdio: 'inherit' });
    execaSync('git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com'], { cwd: workspace, stdio: 'inherit' });

    core.info('➕ adding changed files to git...');
    // Add all changed files (including deleted ones)
    execaSync('git', ['add', '-A'], { cwd: workspace, stdio: 'inherit' });

    // Check if there are changes to commit
    const statusResult = execaSync('git', ['status', '--porcelain'], { cwd: workspace });
    if (!statusResult.stdout.trim()) {
      core.info('⚠️ no changes to commit.');
      // Post a comment indicating no changes were made or output if relevant
      await postComment(octokit, repo, event, `${output}`);
      return; // Exit early if no changes
    }


    core.info('💾 committing changes...');
    execaSync('git', ['commit', '-m', commitMessage], { cwd: workspace, stdio: 'inherit' });

    core.info(`🚀 pushing changes to origin/${currentBranch}...`);
    execaSync('git', ['push', 'origin', currentBranch], { cwd: workspace, stdio: 'inherit' });

    core.info('✅ changes committed and pushed.');

    // Post a comment confirming the changes
    await postComment(octokit, repo, event, `${output}`);

  } catch (error) {
    core.error(`❌ error committing and pushing changes: ${error}`);
    // Attempt to post an error comment
    try {
      await postComment(octokit, repo, event, `Failed to apply changes to this PR: ${error instanceof Error ? error.message : String(error)}`);
    } catch (commentError) {
      core.error(`❌ failed to post error comment: ${commentError}`);
    }
    throw new Error(`Failed to commit and push changes: ${error instanceof Error ? error.message : error}`);
  }
}
