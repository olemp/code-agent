import * as core from '@actions/core';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Creates a temporary workspace with only the specified directories
 */
export function createTempWorkspace(originalWorkspace: string, workingDirectories: string[]): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-workspace-'));

  for (const dir of workingDirectories) {
    const srcPath = path.resolve(originalWorkspace, dir);
    const destPath = path.join(tempDir, dir);

    if (fs.existsSync(srcPath)) {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.cpSync(srcPath, destPath, { recursive: true });
      core.info(`📁 copied ${srcPath} to ${destPath}`);
    } else {
      core.warning(`⚠️ directory ${srcPath} does not exist, skipping`);
    }
  }

  return tempDir;
}
