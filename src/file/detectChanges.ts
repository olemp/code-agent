import * as core from '@actions/core';
import { captureFileState } from './captureFileState.js';

/**
 * Detects file changes by comparing two file states.
 * @param workspace The root directory of the workspace.
 * @param originalState The initial state of files (Map<relativePath, hash>).
 * @returns An array of relative file paths that have been added, modified, or deleted.
 */

export function detectChanges(workspace: string, originalState: Map<string, string>): string[] {
  core.info('Detecting file changes by comparing states...');
  const currentState = captureFileState(workspace, {}); // Recapture the current state
  const changedFiles = new Set<string>();

  // Check for changed or added files by iterating through the current state
  for (const [file, currentHash] of currentState.entries()) {
    const originalHash = originalState.get(file);
    if (!originalHash) {
      // File exists now but didn't before -> Added
      core.info(`File added: ${file}`);
      changedFiles.add(file);
    } else if (originalHash !== currentHash) {
      // File exists in both states but hash differs -> Modified
      core.info(`File changed: ${file}`);
      changedFiles.add(file);
    }
    // If hashes match, the file is unchanged, do nothing.
  }

  // Check for deleted files by iterating through the original state
  for (const file of originalState.keys()) {
    if (!currentState.has(file)) {
      // File existed before but doesn't now -> Deleted
      core.info(`File deleted: ${file}`);
      changedFiles.add(file);
    }
  }

  if (changedFiles.size > 0) {
    core.info(`Detected changes in ${changedFiles.size} files: ${Array.from(changedFiles).join(', ')}`);
  } else {
    core.info('No file changes detected between states.');
  }

  return Array.from(changedFiles);
}
