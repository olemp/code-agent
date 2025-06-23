import * as core from '@actions/core';
import * as fs from 'fs';
import { globSync } from 'glob';
import ignore from 'ignore';
import * as path from 'path';
import { calculateFileHash } from './calculateFileHash.js';

interface IFileCaptureOptions {
  includePatterns?: string[];
  excludePatterns?: string[];
  maxFileSizeBytes?: number;
  excludeFileTypes?: string[];
  prioritizePatterns?: string[];
}

const DEFAULT_MAX_FILE_SIZE = 1024 * 1024; // 1MB default size limit
const DEFAULT_EXCLUDED_FILE_TYPES = [
  // Binary and large file types
  '.exe', '.dll', '.so', '.dylib', '.obj', '.o',
  '.zip', '.tar', '.gz', '.7z', '.rar',
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.webp',
  '.mp3', '.mp4', '.avi', '.mov', '.wav',
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
  // Build artifacts and caches
  '.class', '.pyc', '.pyo', '.pyd',
  // Log files
  '.log'
];

/**
 * Captures the state (path and hash) of files in the workspace, respecting .gitignore and optimization options.
 * @param workspace The root directory of the workspace.
 * @param options Configuration options to optimize token usage by limiting captured files.
 * @returns A Map where keys are relative file paths and values are their SHA-256 hashes.
 */
export function captureFileState(
  workspace: string, 
  options: IFileCaptureOptions = {}
): Map<string, string> {
  core.info('Capturing current file state with optimization...');
  const fileState = new Map<string, string>();
  const gitignorePath = path.join(workspace, '.gitignore');
  const ig = ignore();

  // Apply default and custom ignores
  ig.add('.git/**');
  ig.add('node_modules/**');
  ig.add('**/dist/**');
  ig.add('**/build/**');
  ig.add('**/.cache/**');

  // Add user-provided exclude patterns
  if (options.excludePatterns?.length) {
    options.excludePatterns.forEach(pattern => ig.add(pattern));
    core.info(`Added ${options.excludePatterns.length} custom exclude patterns`);
  }

  // Process .gitignore if it exists
  if (fs.existsSync(gitignorePath)) {
    core.info(`Reading .gitignore rules from ${gitignorePath}`);
    try {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      ig.add(gitignoreContent);
    } catch (error) {
      core.warning(`Failed to read .gitignore at ${gitignorePath}: ${error}. Proceeding with current ignores.`);
    }
  }

  // Set up glob patterns - start with default pattern
  let globPatterns = ['**/*'];

  // If include patterns are specified, use those instead
  if (options.includePatterns?.length) {
    globPatterns = options.includePatterns;
    core.info(`Using custom include patterns: ${options.includePatterns.join(', ')}`);
  }

  // Find all candidate files based on glob patterns
  const allFiles: string[] = [];
  
  for (const pattern of globPatterns) {
    const matches = globSync(pattern, {
      cwd: workspace,
      nodir: true,
      dot: true,
      absolute: false,
      ignore: ['.git/**'], // Always ignore .git for performance
    });
    allFiles.push(...matches);
  }

  // Apply ignore rules and initial filtering
  let filesToProcess = ig.filter(allFiles);

  // Get file types to exclude (combine defaults with user options)
  const excludeFileTypes = [
    ...DEFAULT_EXCLUDED_FILE_TYPES,
    ...(options.excludeFileTypes || [])
  ];

  // Apply file type filtering
  if (excludeFileTypes.length) {
    filesToProcess = filesToProcess.filter(filePath => {
      const ext = path.extname(filePath).toLowerCase();
      return !excludeFileTypes.includes(ext);
    });
  }

  const maxFileSizeBytes = options.maxFileSizeBytes || DEFAULT_MAX_FILE_SIZE;

  // Prioritize specific files if patterns are provided
  const priorityFiles: string[] = [];
  const regularFiles: string[] = [];

  if (options.prioritizePatterns?.length) {
    const priorityPatternRegexes = options.prioritizePatterns.map(
      pattern => new RegExp(pattern.replace(/\*/g, '.*'))
    );

    filesToProcess.forEach(file => {
      const isPriority = priorityPatternRegexes.some(regex => regex.test(file));
      if (isPriority) {
        priorityFiles.push(file);
      } else {
        regularFiles.push(file);
      }
    });

    core.info(`Prioritized ${priorityFiles.length} files based on provided patterns`);
    
    // Reorder files to process priority files first
    filesToProcess = [...priorityFiles, ...regularFiles];
  }

  core.info(`Found ${allFiles.length} total files, processing ${filesToProcess.length} files after filtering`);

  for (const relativeFilePath of filesToProcess) {
    const absoluteFilePath = path.join(workspace, relativeFilePath);
    try {
      const stats = fs.statSync(absoluteFilePath);
      
      // Skip files larger than the size limit
      if (stats.size > maxFileSizeBytes) {
        core.info(`Skipping file exceeding size limit (${(stats.size / 1024).toFixed(2)}KB): ${relativeFilePath}`);
        continue;
      }
      
      // Process if it's a file
      if (stats.isFile()) {
        const hash = calculateFileHash(absoluteFilePath);
        fileState.set(relativeFilePath, hash);
      }
    } catch (error) {
      core.warning(`Could not process file ${relativeFilePath}: ${error}`);
    }
  }
  
  core.info(`Captured state of ${fileState.size} files after optimization.`);
  return fileState;
}
