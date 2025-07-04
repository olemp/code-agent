import * as core from '@actions/core';
import * as fs from 'fs';
import { globSync } from 'glob';
import ignore from 'ignore';
import * as path from 'path';
import { calculateFileHash } from './calculateFileHash.js';

interface IFileCaptureOptions  {
  maxFileSizeBytes?: number;
  excludeFileTypes?: string[];
  prioritizePatterns?: string[];
  excludePatterns?: string[] | null;
  includePatterns?: string[] | null;
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
  core.info('📷 capturing current file state with optimization...');
  const fileState = new Map<string, string>();
  const gitignorePath = path.join(workspace, '.gitignore');
  const ig = ignore();

  ig.add('.git/**');
  ig.add('node_modules/**');
  ig.add('**/dist/**');
  ig.add('**/build/**');
  ig.add('**/.cache/**');

  if (options.excludePatterns?.length) {
    options.excludePatterns.forEach(pattern => ig.add(pattern));
    core.info(`➕ added ${options.excludePatterns.length} custom exclude patterns`);
  }

  if (fs.existsSync(gitignorePath)) {
    core.info(`📄 reading .gitignore rules from ${gitignorePath}`);
    try {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      ig.add(gitignoreContent);
    } catch (error) {
      core.warning(`⚠️ failed to read .gitignore at ${gitignorePath}: ${error}. proceeding with current ignores.`);
    }
  }

  let globPatterns = ['**/*'];

  if (options.includePatterns?.length) {
    globPatterns = options.includePatterns;
    core.info(`🎯 using custom include patterns: ${options.includePatterns.join(', ')}`);
  }

  const allFiles: string[] = [];
  
  for (const pattern of globPatterns) {
    const matches = globSync(pattern, {
      cwd: workspace,
      nodir: true,
      dot: true,
      absolute: false,
      ignore: ['.git/**'],
    });
    allFiles.push(...matches);
  }

  let filesToProcess = ig.filter(allFiles);

  const excludeFileTypes = [
    ...DEFAULT_EXCLUDED_FILE_TYPES,
    ...(options.excludeFileTypes || [])
  ];

  if (excludeFileTypes.length) {
    filesToProcess = filesToProcess.filter(filePath => {
      const ext = path.extname(filePath).toLowerCase();
      return !excludeFileTypes.includes(ext);
    });
  }

  const maxFileSizeBytes = options.maxFileSizeBytes || DEFAULT_MAX_FILE_SIZE;

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

    core.info(`⬆️ prioritized ${priorityFiles.length} files based on provided patterns`);
    
    // Reorder files to process priority files first
    filesToProcess = [...priorityFiles, ...regularFiles];
  }

  core.info(`🔍 found ${allFiles.length} total files, processing ${filesToProcess.length} files after filtering`);

  for (const relativeFilePath of filesToProcess) {
    const absoluteFilePath = path.join(workspace, relativeFilePath);
    try {
      const stats = fs.statSync(absoluteFilePath);
      
      // Skip files larger than the size limit
      if (stats.size > maxFileSizeBytes) {
        core.info(`⏭️ skipping file exceeding size limit (${(stats.size / 1024).toFixed(2)}kb): ${relativeFilePath}`);
        continue;
      }
      
      // Process if it's a file
      if (stats.isFile()) {
        const hash = calculateFileHash(absoluteFilePath);
        fileState.set(relativeFilePath, hash);
      }
    } catch (error) {
      core.warning(`⚠️ could not process file ${relativeFilePath}: ${error}`);
    }
  }

  if(fileState.size === 0) {
    core.warning(`⚠️ no files were captured after optimization.`);
    return new Map<string, string>();
  }
  
  core.info(`✅ captured state of ${fileState.size} files after optimization.`);
  return fileState;
}
