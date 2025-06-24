import { execaSync } from 'execa';
import * as core from '@actions/core';
import { ActionConfig } from '../config/config.js';
import { estimateTokens, truncateToTokenLimit } from '../utils/tokenEstimator.js';

/**
 * Executes the Claude Code CLI command.
 * 
 * @param workspace The directory to run the command in.
 * @param config The ActionConfig object containing API keys and configuration.
 * @param prompt The user prompt for Claude Code.
 * @param timeout Timeout in milliseconds.
 * 
 * @returns The stdout from the Claude Code CLI.
 */
export function runClaudeCode(workspace: string, config: ActionConfig, prompt: string, timeout: number): string {
  if (!config.anthropicApiKey) {
    throw new Error('An Anthropic API key is required to run Claude Code. Please check your workflow configuration.');
  }
  
  // Apply additional token limiting at the client level if configured
  let processedPrompt = prompt;
  if (config.enableContextTruncation && config.maxContextTokens && config.maxContextTokens > 0) {
    const estimatedTokens = estimateTokens(prompt);
    if (estimatedTokens > config.maxContextTokens) {
      core.info(`Prompt estimated at ${estimatedTokens} tokens, truncating to ${config.maxContextTokens} tokens`);
      processedPrompt = truncateToTokenLimit(prompt, config.maxContextTokens);
    } else {
      core.info(`Prompt estimated at ${estimatedTokens} tokens (within ${config.maxContextTokens} token limit)`);
    }
  }
  
  core.info(`Executing Claude Code CLI in ${workspace} with timeout ${timeout}ms`);
  try {
    const cliArgs = ['-p', processedPrompt, '--allowedTools', 'Bash,Edit,Write,Replace'];

    const envVars: Record<string, string> = {
      ...process.env,
      ANTHROPIC_API_KEY: config.anthropicApiKey
    };

    if (config.anthropicBaseUrl) {
      envVars.ANTHROPIC_BASE_URL = config.anthropicBaseUrl;
    }

    if (config.anthropicModel) {
      envVars.ANTHROPIC_MODEL = config.anthropicModel;
    }

    if (config.anthropicSmallFastModel) {
      envVars.ANTHROPIC_SMALL_FAST_MODEL = config.anthropicSmallFastModel;
    }

    if (config.disablePromptCaching) {
      envVars.DISABLE_PROMPT_CACHING = '1';
    }

    if (config.claudeCodeUseBedrock) {
      envVars.CLAUDE_CODE_USE_BEDROCK = '1';

      if (config.anthropicBedrockBaseUrl) {
        envVars.ANTHROPIC_BEDROCK_BASE_URL = config.anthropicBedrockBaseUrl;
      }

      if (config.awsAccessKeyId) {
        envVars.AWS_ACCESS_KEY_ID = config.awsAccessKeyId;
      }

      if (config.awsSecretAccessKey) {
        envVars.AWS_SECRET_ACCESS_KEY = config.awsSecretAccessKey;
      }

      if (config.awsRegion) {
        envVars.AWS_REGION = config.awsRegion;
      }

      core.info('Running Claude Code with AWS Bedrock configuration');
    }

    const result = execaSync(
      'claude',
      cliArgs,
      {
        timeout: timeout,
        cwd: workspace,
        env: envVars,
        stdio: 'pipe', 
        reject: false 
      }
    );

    core.info(`Claude Code CLI exited with code ${result.exitCode}`);

    if (result.stderr) {
      core.warning(`Claude Code command stderr: ${result.stderr}`);
      if (result.stderr.includes('Credit balance is too low')) {
        throw new Error('Credit balance is too low');
      }
      throw new Error(`${result.stderr}`);
    }

    if (result.failed || result.exitCode !== 0) {
      core.error(`Claude Code command failed. Exit code: ${result.exitCode}, stdout: ${result.stdout}, stderr: ${result.stderr}`);
      throw new Error(`Claude Code command failed with exit code ${result.exitCode}. Check logs for details.`);
    }

    return result.stdout || '';

  } catch (error) {
    core.error(`Error executing Claude Code command: ${error instanceof Error ? error.stack : String(error)}`);
    if (error instanceof Error && error.message.includes('Credit balance is too low')) {
      throw error;
    } else {
      throw new Error(`Failed to execute Claude Code command: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
