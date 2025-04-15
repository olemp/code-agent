import * as core from '@actions/core';
import * as github from '@actions/github';
import { Octokit } from 'octokit';

export interface ActionConfig {
  // Required
  githubToken: string;
  anthropicApiKey: string;
  eventPath: string;
  timeoutSeconds: number;

  // Optional
  anthropicBaseUrl: string;
  anthropicModel: string;
  anthropicSmallFastModel: string;

  // Optional: Use Bedrock
  claudeCodeUseBedrock: string;
  anthropicBedrockBaseUrl: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  disablePromptCaching: string;

  // Optional: Use Claude Code Proxy
  useClaudeCodeProxy: string;
  claudeCodeProxyCwd: string;
  claudeCodePort: number;
  proxyOpenaiApiKey: string;
  proxyGeminiApiKey: string;
  proxyPreferredProvider: string;
  proxyBigModel: string;
  proxySmallModel: string;

  // Context and repo information
  workspace: string;
  octokit: Octokit;
  context: typeof github.context;
  repo: { owner: string; repo: string };
}

/**
 * Gets and validates the inputs for the GitHub Action.
 * @returns ActionConfig object
 * @throws Error if required inputs are missing
 */
export function getConfig(): ActionConfig {
  // Required
  const githubToken = core.getInput('github-token', { required: true });
  let anthropicApiKey = core.getInput('anthropic-api-key');
  const eventPath = core.getInput('event-path', { required: true });
  const timeoutSeconds = core.getInput('timeout') ? parseInt(core.getInput('timeout'), 10) : 300;
  
  // Optional
  let anthropicBaseUrl = core.getInput('anthropic-base-url') || '';
  const anthropicModel = core.getInput('anthropic-model') || '';
  const anthropicSmallFastModel = core.getInput('anthropic-small-fast-model') || '';
  
  // Optional: Use Bedrock
  const claudeCodeUseBedrock = core.getInput('claude-code-use-bedrock') || '';
  const anthropicBedrockBaseUrl = core.getInput('anthropic-bedrock-base-url') || '';
  const awsAccessKeyId = core.getInput('aws-access-key-id') || '';
  const awsSecretAccessKey = core.getInput('aws-secret-access-key') || '';
  const awsRegion = core.getInput('aws-region') || '';
  const disablePromptCaching = core.getInput('disable-prompt-caching') || '';

  // Optional: Use Claude Code Proxy
  const useClaudeCodeProxy = core.getInput('use-claude-code-proxy') || '';
  const claudeCodeProxyCwd = '/claude-code-proxy';
  const claudeCodePort = 8082;
  const proxyOpenaiApiKey = core.getInput('proxy-openai-api-key') || '';
  const proxyGeminiApiKey = core.getInput('proxy-gemini-api-key') || '';
  const proxyPreferredProvider = core.getInput('proxy-preferred-provider') || '';
  const proxyBigModel = core.getInput('proxy-big-model') || '';
  const proxySmallModel = core.getInput('proxy-small-model') || '';

  if (!anthropicApiKey && !useClaudeCodeProxy) {
    throw new Error('Anthropic API Key is required.');
  }
  if (!githubToken) {
    throw new Error('GitHub Token is required.');
  }
  if (!eventPath) {
    throw new Error('GitHub event path is missing.');
  }

  // use proxy overwrites base url
  if (useClaudeCodeProxy) {
    anthropicApiKey = 'dummy';
    anthropicBaseUrl = 'http://localhost:' + claudeCodePort;
  }

  // Context and repo information
  const workspace = '/workspace/app';
  const octokit = new Octokit({ auth: githubToken });
  const context = github.context;
  const repo = context.repo;

  return {
    githubToken,
    anthropicApiKey,
    eventPath,
    timeoutSeconds,
    anthropicBaseUrl,
    anthropicModel,
    anthropicSmallFastModel,
    claudeCodeUseBedrock,
    anthropicBedrockBaseUrl,
    awsAccessKeyId,
    awsSecretAccessKey,
    awsRegion,
    disablePromptCaching,
    useClaudeCodeProxy,
    claudeCodeProxyCwd,
    claudeCodePort,
    proxyOpenaiApiKey,
    proxyGeminiApiKey,
    proxyPreferredProvider,
    proxyBigModel,
    proxySmallModel,

    workspace,
    octokit,
    context,
    repo
  };
}
