import * as core from '@actions/core';
import { ActionConfig } from '../config/config.js';
import { Octokit } from 'octokit';

/**
 * Checks if the user has appropriate permissions.
 * @param config Action configuration
 * @returns true if the user has permission, false otherwise
 */
export async function checkPermission(config: ActionConfig): Promise<boolean> {
  const { context, octokit, repo } = config;
  const actor = context.actor;

  if (!actor) {
    core.warning('Actor not found. Permission check failed.');
    return false;
  }

  try {
    return await checkUserPermissionGithub(octokit, repo, actor);
  } catch (error) {
    core.warning(`Exception occurred during permission check: ${error}`);
    return false;
  }
}

/**
 * Asynchronously checks if a user has appropriate permissions for a repository.
 * This function is used internally and primarily for logging permission information.
 * @param octokit GitHub API client
 * @param repo Repository information
 * @param username Username to check
 * @returns true if the user has permissions, false otherwise
 */
async function checkUserPermissionGithub(
  octokit: Octokit,
  repo: { owner: string; repo: string },
  username: string
): Promise<boolean> {
  try {
    const { data: collaboratorPermission } = await octokit.rest.repos.getCollaboratorPermissionLevel({
      ...repo,
      username,
    });

    const permission = collaboratorPermission.permission;

    return ['admin', 'write'].includes(permission);
  } catch (error) {
    core.warning(`Error checking user permission: ${error}`);
    return false;
  }
}

/**
 * Masks sensitive information (GitHub token and Anthropic API key) in a given string.
 * @param text The text to mask.
 * @param config Action configuration containing sensitive keys.
 * @returns The masked text.
 */
export function maskSensitiveInfo(text: string, config: ActionConfig): string {
  let maskedText = text;

  if (config.githubToken) {
    maskedText = maskedText.replaceAll(config.githubToken, '***');
  }
  if (config.anthropicApiKey) {
    maskedText = maskedText.replaceAll(config.anthropicApiKey, '***');
  }
  if (config.awsAccessKeyId) {
    maskedText = maskedText.replaceAll(config.awsAccessKeyId, '***');
  }
  if (config.awsSecretAccessKey) {
    maskedText = maskedText.replaceAll(config.awsSecretAccessKey, '***');
  }
  if (config.anthropicBaseUrl) {
    maskedText = maskedText.replaceAll(config.anthropicBaseUrl, '***');
  }
  if (config.anthropicBedrockBaseUrl) {
    maskedText = maskedText.replaceAll(config.anthropicBedrockBaseUrl, '***');
  }

  if (config.openaiApiKey) {
    maskedText = maskedText.replaceAll(config.openaiApiKey, '***');
  }
  if (config.openaiBaseUrl) {
    maskedText = maskedText.replaceAll(config.openaiBaseUrl, '***');
  }

  return maskedText;
}