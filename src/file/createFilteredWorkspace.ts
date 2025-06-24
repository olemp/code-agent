import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { globSync } from 'glob';
import ignore from 'ignore';
import { ActionConfig } from '../config/config.js';
import { estimateTokens } from '../utils/tokenEstimator.js';

interface FilteredFile {
  relativePath: string;
  absolutePath: string;
  size: number;
  mtime: Date;
  estimatedTokens: number;
}

/**
 * Creates a filtered temporary workspace containing only the files that should be accessible to CLIs.
 * This significantly reduces the codebase context and token usage.
 * 
 * @param sourceWorkspace The original workspace directory
 * @param config Action configuration with filtering options
 * @returns Path to the filtered temporary workspace
 */
export function createFilteredWorkspace(sourceWorkspace: string, config: ActionConfig): string {
  if (!config.enableCodebaseFiltering) {
    core.info('Codebase filtering disabled, using original workspace');
    return sourceWorkspace;
  }

  core.info('Creating filtered workspace to limit codebase context...');
  
  // Create temporary directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'filtered-workspace-'));
  core.info(`Created temporary filtered workspace: ${tempDir}`);

  try {
    // Get all files with filtering applied
    const filteredFiles = getFilteredFiles(sourceWorkspace, config);
    
    if (filteredFiles.length === 0) {
      core.warning('No files matched filtering criteria, using minimal workspace');
      return tempDir;
    }

    // Apply additional limits
    const finalFiles = applyCodebaseLimits(filteredFiles, config);
    
    // Copy files to temporary workspace
    copyFilesToWorkspace(finalFiles, sourceWorkspace, tempDir);
    
    // Copy essential repository files
    copyEssentialFiles(sourceWorkspace, tempDir);
    
    core.info(`Filtered workspace created with ${finalFiles.length} files (${Math.round(finalFiles.reduce((sum, f) => sum + f.size, 0) / 1024)} KB total)`);
    
    return tempDir;
    
  } catch (error) {
    core.error(`Failed to create filtered workspace: ${error}`);
    // Cleanup on error
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      core.warning(`Failed to cleanup temporary directory: ${cleanupError}`);
    }
    // Fallback to original workspace
    return sourceWorkspace;
  }
}

/**
 * Gets filtered files based on include/exclude patterns and file type filtering
 */
function getFilteredFiles(sourceWorkspace: string, config: ActionConfig): FilteredFile[] {
  const ig = ignore();
  
  // Add default excludes
  ig.add('.git/**');
  ig.add('node_modules/**');
  ig.add('**/dist/**');
  ig.add('**/build/**');
  ig.add('**/.cache/**');
  ig.add('**/.next/**');
  ig.add('**/coverage/**');
  ig.add('**/.nyc_output/**');

  // Add custom excludes
  if (config.excludePatterns?.length) {
    config.excludePatterns.forEach(pattern => ig.add(pattern));
  }

  // Read .gitignore if exists
  const gitignorePath = path.join(sourceWorkspace, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    try {
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      ig.add(gitignoreContent);
    } catch (error) {
      core.warning(`Failed to read .gitignore: ${error}`);
    }
  }

  // Get all files
  let globPatterns = ['**/*'];
  if (config.includePatterns?.length) {
    globPatterns = config.includePatterns;
  }

  const allFiles: string[] = [];
  for (const pattern of globPatterns) {
    const matches = globSync(pattern, {
      cwd: sourceWorkspace,
      nodir: true,
      dot: true,
      absolute: false,
      ignore: ['.git/**'],
    });
    allFiles.push(...matches);
  }

  // Apply ignore patterns
  const filteredPaths = ig.filter(allFiles);
  
  // Convert to FilteredFile objects with metadata
  const filteredFiles: FilteredFile[] = [];
  
  for (const relativePath of filteredPaths) {
    const absolutePath = path.join(sourceWorkspace, relativePath);
    
    try {
      const stats = fs.statSync(absolutePath);
      
      if (stats.isFile()) {
        // Skip files that are too large (1MB default)
        const maxFileSize = 1024 * 1024; // 1MB
        if (stats.size > maxFileSize) {
          core.debug(`Skipping large file: ${relativePath} (${Math.round(stats.size / 1024)} KB)`);
          continue;
        }

        // Skip binary files
        if (isBinaryFile(relativePath)) {
          continue;
        }

        // Estimate tokens for text files
        let estimatedTokens = 0;
        try {
          const content = fs.readFileSync(absolutePath, 'utf8');
          estimatedTokens = estimateTokens(content);
        } catch (error) {
          // If can't read as text, probably binary
          continue;
        }

        filteredFiles.push({
          relativePath,
          absolutePath,
          size: stats.size,
          mtime: stats.mtime,
          estimatedTokens
        });
      }
    } catch (error) {
      core.debug(`Failed to process file ${relativePath}: ${error}`);
    }
  }

  return filteredFiles;
}

/**
 * Applies codebase limits (max files, max size, token limits)
 */
function applyCodebaseLimits(files: FilteredFile[], config: ActionConfig): FilteredFile[] {
  let filteredFiles = [...files];

  // Sort by priority
  if (config.prioritizeRecentFiles) {
    // Sort by modification time (most recent first)
    filteredFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  } else {
    // Sort by estimated importance (smaller files first, then by token count)
    filteredFiles.sort((a, b) => {
      const aImportance = a.size + (a.estimatedTokens * 10); // Weight tokens more heavily
      const bImportance = b.size + (b.estimatedTokens * 10);
      return aImportance - bImportance;
    });
  }

  // Apply file count limit
  if (config.maxCodebaseFiles && config.maxCodebaseFiles > 0) {
    filteredFiles = filteredFiles.slice(0, config.maxCodebaseFiles);
    core.info(`Limited to ${config.maxCodebaseFiles} files`);
  }

  // Apply size limit
  if (config.maxCodebaseSizeBytes && config.maxCodebaseSizeBytes > 0) {
    let totalSize = 0;
    const sizeLimitedFiles: FilteredFile[] = [];
    
    for (const file of filteredFiles) {
      if (totalSize + file.size <= config.maxCodebaseSizeBytes) {
        sizeLimitedFiles.push(file);
        totalSize += file.size;
      } else {
        break;
      }
    }
    
    filteredFiles = sizeLimitedFiles;
    core.info(`Limited to ${Math.round(totalSize / 1024 / 1024 * 100) / 100} MB of files`);
  }

  return filteredFiles;
}

/**
 * Copies filtered files to the temporary workspace
 */
function copyFilesToWorkspace(files: FilteredFile[], sourceWorkspace: string, tempDir: string): void {
  for (const file of files) {
    const sourceFile = file.absolutePath;
    const targetFile = path.join(tempDir, file.relativePath);
    const targetDir = path.dirname(targetFile);

    try {
      // Ensure directory exists
      fs.mkdirSync(targetDir, { recursive: true });
      
      // Copy file
      fs.copyFileSync(sourceFile, targetFile);
    } catch (error) {
      core.warning(`Failed to copy file ${file.relativePath}: ${error}`);
    }
  }
}

/**
 * Copies essential repository files that CLIs might need
 */
function copyEssentialFiles(sourceWorkspace: string, tempDir: string): void {
  const essentialFiles = [
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'tsconfig.json',
    'jsconfig.json',
    '.gitignore',
    'README.md',
    'LICENSE',
    'Makefile',
    'Dockerfile',
    'docker-compose.yml',
    'docker-compose.yaml'
  ];

  for (const filename of essentialFiles) {
    const sourcePath = path.join(sourceWorkspace, filename);
    const targetPath = path.join(tempDir, filename);

    if (fs.existsSync(sourcePath)) {
      try {
        fs.copyFileSync(sourcePath, targetPath);
        core.debug(`Copied essential file: ${filename}`);
      } catch (error) {
        core.debug(`Failed to copy essential file ${filename}: ${error}`);
      }
    }
  }
}

/**
 * Checks if a file is likely binary based on its extension
 */
function isBinaryFile(filePath: string): boolean {
  const binaryExtensions = [
    '.exe', '.dll', '.so', '.dylib', '.obj', '.o',
    '.zip', '.tar', '.gz', '.7z', '.rar',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.webp', '.svg',
    '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flv', '.wmv',
    '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
    '.class', '.pyc', '.pyo', '.pyd',
    '.woff', '.woff2', '.ttf', '.eot',
    '.min.js', '.min.css' // Often minified/compressed
  ];

  const ext = path.extname(filePath).toLowerCase();
  return binaryExtensions.includes(ext);
}

/**
 * Cleanup function to remove temporary workspace
 */
export function cleanupFilteredWorkspace(workspacePath: string, originalWorkspace: string): void {
  if (workspacePath !== originalWorkspace && workspacePath.includes('filtered-workspace-')) {
    try {
      fs.rmSync(workspacePath, { recursive: true, force: true });
      core.info(`Cleaned up filtered workspace: ${workspacePath}`);
    } catch (error) {
      core.warning(`Failed to cleanup filtered workspace: ${error}`);
    }
  }
}