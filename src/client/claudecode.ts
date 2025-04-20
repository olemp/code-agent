import { execa } from 'execa';
import * as core from '@actions/core';
import { ActionConfig } from '../config/config.js';

/**
 * Executes the Claude Code CLI command.
 * @param workspace The directory to run the command in.
 * @param config The ActionConfig object containing API keys and configuration.
 * @param prompt The user prompt for Claude Code.
 * @param timeout Timeout in milliseconds.
 * @returns The stdout from the Claude Code CLI.
 */
export async function runClaudeCode(workspace: string, config: ActionConfig, prompt: string, timeout: number): Promise<string> {
  core.info(`Executing Claude Code CLI in ${workspace} with timeout ${timeout}ms`);
  try {
    const cliArgs = ['-p', prompt, '--allowedTools', 'Bash,Edit,Write,Replace'];

    // Set up environment variables
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

    const result = await execa(
      'claude',
      cliArgs,
      {
        timeout: timeout,
        cwd: workspace,
        env: envVars,
        stdio: 'pipe', // Capture stdout/stderr
        reject: false // Don't throw on non-zero exit code, handle it below
      }
    );

    core.info(`Claude Code CLI exited with code ${result.exitCode}`);

    // Adjusted error handling for async execa and stderr presence
    if (result.stderr) {
      // Log stderr even if exit code is 0, but only throw if non-zero
      if (result.exitCode !== 0) {
        core.error(`Claude Code command failed with stderr. Exit code: ${result.exitCode}, stderr: ${result.stderr}`);
        throw new Error(`Claude Code command failed with exit code ${result.exitCode}. Stderr: ${result.stderr}`);
      } else {
        core.warning(`Claude Code command exited successfully but produced stderr: ${result.stderr}`);
      }
    }

    if (result.failed || result.exitCode !== 0) {
      core.error(`Claude Code command failed. Exit code: ${result.exitCode}, stdout: ${result.stdout}`);
      const errorMessage = result.stderr ? `Stderr: ${result.stderr}` : `Stdout: ${result.stdout}`; // Use already captured stderr if available
      throw new Error(`Claude Code command failed with exit code ${result.exitCode}. ${errorMessage}`);
    }

    core.info('Claude Code command executed successfully.');
    return result.stdout || ''; // Return stdout, ensuring it's a string

  } catch (error) {
    // Log the full error for debugging
    core.error(`Error executing Claude Code command: ${error instanceof Error ? error.stack : String(error)}`);

    // Provide a clearer error message for the action failure
    if (error instanceof Error && error.message.includes('Credit balance is too low')) {
      // Already handled by setFailed above, just re-throw
      throw error;
    } else {
      throw new Error(`Failed to execute Claude Code command: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
