import * as core from '@actions/core';
import * as github from '@actions/github';
import { execaSync } from 'execa';
import * as fs from 'fs';
import { Octokit } from 'octokit';
import { RepoContext, AgentEvent } from './types.js';
import { ActionContext } from './ActionContext.js';

/**
 * Clones the repository based on the event type.
 */
export async function cloneRepository(
  context: ActionContext
): Promise<void> {
  const event = context.event.agentEvent.github;
  const cloneUrl = context.repository?.clone_url;
  if (!cloneUrl) {
    throw new Error('Repository clone URL not found');
  }

  // Determine branch to clone
  let branchToClone: string;
  if (context.event.agentEvent.type === 'pullRequestCommentCreated' || context.event.agentEvent.type === 'pullRequestReviewCommentCreated') {
    // For PR comments, clone the PR's head branch
    const prNumber = event.pull_request?.number;
    try {
      const prData = await context.config.octokit.rest.pulls.get({ ...context.event.agentEvent.github, pull_number: prNumber });
      branchToClone = prData.data.head.ref;
      core.info(`🌳 cloning pr branch: ${branchToClone}`);
    } catch (e) {
      throw new Error(`Could not get PR branch from API: ${e}`);
    }
  } else {
    // For issues or other events, clone the default branch
    branchToClone = context.payload.repository?.default_branch;
    if (!branchToClone) {
      throw new Error('Default branch not found');
    }
    core.info(`🌳 cloning default branch ${branchToClone}`);
  }

  // Clone the repository
  core.info(`📋 cloning repository ${cloneUrl} branch ${branchToClone} into ${workspace}`);
  try {
    // Ensure the workspace directory exists and is empty or doesn't exist
    if (fs.existsSync(workspace)) {
      fs.rmSync(workspace, { recursive: true, force: true });
    }
    fs.mkdirSync(workspace, { recursive: true });

    // Use token for authentication with clone URL
    const authenticatedCloneUrl = cloneUrl.replace('https://', `https://x-access-token:${githubToken}@`);

    execaSync('git', ['clone', '--depth', '1', '--branch', branchToClone, authenticatedCloneUrl, '.'], { cwd: workspace, stdio: 'inherit' });
    core.info('✅ repository cloned successfully.');
  } catch (error) {
    throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : error}`);
  }
}
