import * as core from '@actions/core';
import * as github from '@actions/github';
import { execaSync } from 'execa';
import { Octokit } from 'octokit';
import { RepoContext, GitHubEventIssuesOpened, GitHubEventIssueCommentCreated } from './types.js';
import { truncateOutput } from './truncateOutput.js';

/**
 * Creates a pull request with the changes.
 * 
 * @param workspace Workspace directory.
 * @param octokit Octokit instance.
 * @param repo Repository context.
 * @param event GitHub event.
 * @param commitMessage Commit message.
 * @param output Output from the AI service.
 * @param type Type of AI service used.
 */
export async function createPullRequest(
  workspace: string,
  octokit: Octokit,
  repo: RepoContext,
  event: GitHubEventIssuesOpened | GitHubEventIssueCommentCreated,
  commitMessage: string,
  output: string,
  type: "claude" | "codex"
): Promise<void> {
  const issueNumber = event.issue.number;
  let branchName = `${type}/${issueNumber}`;
  if (event.action == "created") {
    branchName = `${type}/${issueNumber}-${event.comment.id}`;
  }
  const baseBranch = github.context.payload.repository?.default_branch; // Get default branch for base

  if (!baseBranch) {
    throw new Error('Could not determine the default branch to use as base for the PR.');
  }

  try {
    core.info('Configuring Git user identity locally...');
    execaSync('git', ['config', 'user.name', 'github-actions[bot]'], { cwd: workspace, stdio: 'inherit' });
    execaSync('git', ['config', 'user.email', 'github-actions[bot]@users.noreply.github.com'], { cwd: workspace, stdio: 'inherit' });

    core.info(`Creating new branch: ${branchName}`);
    execaSync('git', ['checkout', '-b', branchName], { cwd: workspace, stdio: 'inherit' });

    core.info('Adding changed files to Git...');
    execaSync('git', ['add', '-A'], { cwd: workspace, stdio: 'inherit' });

    core.info('Committing changes...');
    execaSync('git', ['commit', '-m', commitMessage], { cwd: workspace, stdio: 'inherit' });

    core.info(`Pushing changes to origin/${branchName}...`);
    execaSync('git', ['push', 'origin', branchName, '--force'], { cwd: workspace, stdio: 'inherit' }); // Use force push for simplicity in case branch exists

    core.info('Creating pull request...');
    const pr = await octokit.rest.pulls.create({
      ...repo,
      title: `${commitMessage}`,
      head: branchName,
      base: baseBranch, // Use the default branch as base
      body: `_This pull request was created by the Code Agent and closes #${issueNumber}_.\n\n${truncateOutput(output)}`,
      maintainer_can_modify: true,
    });

    core.info(`Pull request created at ${pr.data.html_url}`);

    // Optionally, post a comment linking to the PR in the original issue
    await octokit.rest.issues.createComment({
      ...repo,
      issue_number: issueNumber,
      body: `Created pull request #${pr.data.number} that closes this issue on merge.`,
    });

  } catch (error) {
    core.error(`Error creating pull request: ${error}`);
    throw new Error(`Failed to create pull request: ${error instanceof Error ? error.message : error}`);
  }
}
