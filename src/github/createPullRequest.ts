import * as core from '@actions/core';
import * as github from '@actions/github';
import { execaSync } from 'execa';
import { Octokit } from 'octokit';
import { RepoContext, GitHubEventIssuesOpened, GitHubEventIssueCommentCreated } from './types.js';
import { truncateOutput } from './truncateOutput.js';

/**
 * Creates a Pull Request with the changes.
 */


export async function createPullRequest(
  workspace: string,
  octokit: Octokit,
  repo: RepoContext,
  event: GitHubEventIssuesOpened | GitHubEventIssueCommentCreated,
  commitMessage: string,
  output: string
): Promise<void> {
  const issueNumber = event.issue.number;
  let branchName = `code-agent-changes-${issueNumber}`;
  if (event.action == "created") {
    branchName = `code-agent-changes-${issueNumber}-${event.comment.id}`;
  }
  const baseBranch = github.context.payload.repository?.default_branch; // Get default branch for base

  if (!baseBranch) {
    throw new Error('Could not determine the default branch to use as base for the PR.');
  }

  try {
    // Set up Git and create a new branch
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

    core.info('Creating Pull Request...');
    const pr = await octokit.rest.pulls.create({
      ...repo,
      title: `${commitMessage}`,
      head: branchName,
      base: baseBranch, // Use the default branch as base
      body: `Applied changes based on Issue #${issueNumber}.\n\n${truncateOutput(output)}`,
      maintainer_can_modify: true,
    });

    core.info(`Pull Request created: ${pr.data.html_url}`);

    // Optionally, post a comment linking to the PR in the original issue
    await octokit.rest.issues.createComment({
      ...repo,
      issue_number: issueNumber,
      body: `Created Pull Request #${pr.data.number}`,
    });

  } catch (error) {
    core.error(`Error creating Pull Request: ${error}`);
    throw new Error(`Failed to create Pull Request: ${error instanceof Error ? error.message : error}`);
  }
}
