import * as core from '@actions/core';
import * as crypto from 'crypto';
import * as fs from 'fs';

/**
 * Calculates the SHA-256 hash of a file.
 * @param filePath Absolute path to the file.
 * @returns The SHA-256 hash of the file content.
 */
export function calculateFileHash(filePath: string): string {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (error) {
    // Log error but rethrow to be handled by caller, as hash calculation is critical
    core.error(`Failed to calculate hash for ${filePath}: ${error}`);
    throw error;
  }
}
