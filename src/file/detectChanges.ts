import * as core from '@actions/core';
import { captureFileState } from './captureFileState.js';
import { ActionConfig } from '../config/config.js';

/**
 * Detects file changes by comparing two file states.
 * 
 * @param workspace The root directory of the workspace.
 * @param originalState The initial state of files (Map<relativePath, hash>).
 * @param config Action configuration.
 *
 * @returns An array of relative file paths that have been added, modified, or deleted.
 */
export function detectChanges(workspace: string, originalState: Map<string, string>, config: ActionConfig): string[] {
  core.info('🔍 detecting file changes by comparing states...');
  const currentState = captureFileState(workspace, {
    excludePatterns: config.excludePatterns,
    includePatterns: config.includePatterns,
  });
  const changedFiles = new Set<string>();

  // Check for changed or added files by iterating through the current state
  for (const [file, currentHash] of currentState.entries()) {
    const originalHash = originalState.get(file);
    if (!originalHash) {
      changedFiles.add(file);
    } else if (originalHash !== currentHash) {
      changedFiles.add(file);
    }
  }

  for (const file of originalState.keys()) {
    if (!currentState.has(file)) {
      changedFiles.add(file);
    }
  }

  if (changedFiles.size > 0) {
    core.info(`📄 detected changes in ${changedFiles.size} files: ${Array.from(changedFiles).join(', ')}`);
  } else {
    core.info('✅ no file changes detected between states.');
  }

  return Array.from(changedFiles);
}
