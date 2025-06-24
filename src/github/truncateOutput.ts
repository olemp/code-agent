import * as core from '@actions/core';

// Truncate the output if it exceeds 60000 characters
// GitHub API has a limit of 65536 characters for the body of a PR
export function truncateOutput(output: string): string {
  if (output.length > 60000) {
    core.warning(`✂️ output exceeds 60000 characters, truncating...`);
    return output.substring(0, 60000);
  }
  return output;
}
