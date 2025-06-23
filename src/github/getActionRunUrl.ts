import * as github from '@actions/github';

/**
 * Get the URL for the current GitHub Action run.
 * This constructs the URL based on the repository information and run ID available in the GitHub context.
 * 
 * @returns The URL to the GitHub Action run
 */
export function getActionRunUrl(): string | null {
  try {
    const { repo, runId } = github.context;
    
    if (!repo || !runId) {
      return null;
    }

    return `https://github.com/${repo.owner}/${repo.repo}/actions/runs/${runId}`;
  } catch (error) {
    // Return null if we can't construct the URL for any reason
    return null;
  }
}
