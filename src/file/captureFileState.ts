import * as core from '@actions/core';
import * as fs from 'fs';
import { globSync } from 'glob';
import ignore from 'ignore';
import * as path from 'path';
import { calculateFileHash } from './calculateFileHash.js';

/**
 * Captures the state (path and hash) of files in the workspace, respecting .gitignore.
 * @param workspace The root directory of the workspace.
 * @returns A Map where keys are relative file paths and values are their SHA-256 hashes.
 * 
 * TODO: #8
 */
export function captureFileState(workspace: string): Map<string, string> {
  core.info('Capturing current file state (respecting .gitignore)...');
  const fileState = new Map<string, string>();
  const gitignorePath = path.join(workspace, '.gitignore');
  const ig = ignore();

  // Add default ignores - crucial for avoiding git metadata and sensitive files
  ig.add('.git/**');
  // Consider adding other common ignores if necessary, e.g., node_modules, build artifacts
  // ig.add('node_modules/**');
  if (fs.existsSync(gitignorePath)) {
    core.info(`Reading .gitignore rules from ${gitignorePath}`);
    try {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      ig.add(gitignoreContent);
    } catch (error) {
      core.warning(`Failed to read .gitignore at ${gitignorePath}: ${error}. Proceeding with default ignores.`);
    }
  } else {
    core.info('.gitignore not found in workspace root. Using default ignores.');
  }

  // Use glob to find all files, then filter using ignore rules
  // Ensure glob pattern covers hidden files (dotfiles) as well
  const allFiles = globSync('**/*', {
    cwd: workspace,
    nodir: true, // Only files, not directories
    dot: true, // Include dotfiles
    absolute: false, // Get relative paths
    ignore: ['.git/**'], // Explicitly ignore .git directory in glob for performance
  });

  // Filter the glob results using the ignore instance
  // Note: ignore() expects relative paths from the workspace root
  const filesToProcess = ig.filter(allFiles);

  core.info(`Found ${allFiles.length} total entries (files/dirs), processing ${filesToProcess.length} files after applying ignore rules.`);

  for (const relativeFilePath of filesToProcess) {
    const absoluteFilePath = path.join(workspace, relativeFilePath);
    try {
      // Ensure it's actually a file before hashing
      if (fs.statSync(absoluteFilePath).isFile()) {
        const hash = calculateFileHash(absoluteFilePath);
        fileState.set(relativeFilePath, hash); // Store relative path
      }
    } catch (error) {
      // Log specific file errors but continue processing others
      core.warning(`Could not process file ${relativeFilePath}: ${error}`);
    }
  }
  core.info(`Captured state of ${fileState.size} files.`);
  return fileState;
}
