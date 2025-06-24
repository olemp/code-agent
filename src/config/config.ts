import * as core from '@actions/core';
import * as github from '@actions/github';
import { Octokit } from 'octokit';
import { getStrArray } from './getStrArray.js';

export interface ActionConfig {
  // Trigger settings
  triggerLabels: string[] | null;
  triggerType: 'claude' | 'codex' | null;

  // Common settings
  githubToken: string;
  eventPath: string;
  workspace: string;
  timeoutSeconds: number;
  octokit: Octokit;
  context: typeof github.context;
  repo: { owner: string; repo: string };

  // Claude Code
  anthropicApiKey: string;
  anthropicBaseUrl: string;
  anthropicModel: string;
  anthropicSmallFastModel: string;

  // Claude Code specific
  claudeCodeUseBedrock: string;
  anthropicBedrockBaseUrl: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  disablePromptCaching: string;

  // Codex
  openaiApiKey: string;
  openaiBaseUrl: string;
  openaiModel: string;

  excludePatterns?: string[] | null;
  includePatterns?: string[] | null;

  // Claude Code context control
  maxTurns?: number;
  workingDirectories?: string[] | null;

  // Disabled flag
  disabled: boolean;
}

/**
 * Gets and validates the inputs for the GitHub Action.
 * @returns ActionConfig object
 * @throws Error if required inputs are missing
 */
export function getConfig(): ActionConfig {
  const triggerLabels = getStrArray('trigger-labels');
  const githubToken = core.getInput('github-token', { required: true });
  const eventPath = core.getInput('event-path');
  const workspace = '/workspace/app';
  const timeoutSeconds = core.getInput('timeout') ? parseInt(core.getInput('timeout'), 10) : 600;
  const octokit = new Octokit({ auth: githubToken });
  const context = github.context;
  const repo = context.repo;

  // Claude Code
  const anthropicApiKey = core.getInput('anthropic-api-key');
  const anthropicBaseUrl = core.getInput('anthropic-base-url') || '';
  const anthropicModel = core.getInput('anthropic-model') || '';
  const anthropicSmallFastModel = core.getInput('anthropic-small-fast-model') || '';

  // Claude Code specific inputs
  const claudeCodeUseBedrock = core.getInput('claude-code-use-bedrock') || '';
  const anthropicBedrockBaseUrl = core.getInput('anthropic-bedrock-base-url') || '';
  const awsAccessKeyId = core.getInput('aws-access-key-id') || '';
  const awsSecretAccessKey = core.getInput('aws-secret-access-key') || '';
  const awsRegion = core.getInput('aws-region') || '';
  const disablePromptCaching = core.getInput('disable-prompt-caching') || '';

  // Codex / OpenAI
  const openaiApiKey = core.getInput('openai-api-key') || '';
  const openaiBaseUrl = core.getInput('openai-base-url') || '';
  const openaiModel = core.getInput('openai-model') || '';

  const excludePatterns = getStrArray('exclude-patterns');
  const includePatterns = getStrArray('include-patterns');

  // Claude Code context control
  const maxTurns = core.getInput('anthropic-max-turns') ? parseInt(core.getInput('anthropic-max-turns'), 10) : undefined;
  const workingDirectories = getStrArray('anthropic-include-directories');

  const disabled = (core.getInput('disabled') || '') === '1' || (core.getInput('disabled') || '') === 'true';

  if (!anthropicApiKey && !openaiApiKey) {
    throw new Error('API Key is required.');
  }
  if (!githubToken) {
    throw new Error('GitHub Token is required.');
  }
  if (!eventPath) {
    throw new Error('GitHub event path is missing.');
  }
  if (!workspace) {
    throw new Error('GitHub workspace path is missing.');
  }

  return {
    triggerLabels,
    triggerType: null, // Will be set during event processing

    githubToken,
    eventPath,
    workspace,
    timeoutSeconds,
    octokit,
    context,
    repo,

    anthropicApiKey,
    anthropicBaseUrl,
    anthropicModel,
    anthropicSmallFastModel,
    claudeCodeUseBedrock,
    anthropicBedrockBaseUrl,
    awsAccessKeyId,
    awsSecretAccessKey,
    awsRegion,
    disablePromptCaching,

    openaiApiKey,
    openaiBaseUrl,
    openaiModel,

    excludePatterns,
    includePatterns,

    maxTurns,
    workingDirectories,
    
    disabled,
  };
}
