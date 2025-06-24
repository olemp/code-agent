import { execaSync } from 'execa';
import * as core from '@actions/core';
import { ActionConfig } from '../config/config.js';

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
  core.info(`🚀 executing claude code cli in ${workspace} with timeout ${timeout}ms`);
  try {
    const cliArgs = ['-p', prompt, '--allowedTools', 'Bash,Edit,Write,Replace'];
    
    // Add max turns configuration
    if (config.maxTurns) {
      cliArgs.push('--max-turns', config.maxTurns.toString());
    }
    
    // Add working directories to limit context scope
    if (config.workingDirectories && config.workingDirectories.length > 0) {
      config.workingDirectories.forEach(dir => {
        cliArgs.push('--add-dir', dir);
      });
    }

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

      core.info('☁️ running claude code with aws bedrock configuration');
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

    core.info(`✅ claude code cli exited with code ${result.exitCode}`);

    if (result.stderr) {
      core.warning(`⚠️ claude code command stderr: ${result.stderr}`);
      if (result.stderr.includes('Credit balance is too low')) {
        throw new Error('Credit balance is too low');
      }
      throw new Error(`${result.stderr}`);
    }

    if (result.failed || result.exitCode !== 0) {
      core.error(`❌ claude code command failed. exit code: ${result.exitCode}, stdout: ${result.stdout}, stderr: ${result.stderr}`);
      throw new Error(`Claude Code command failed with exit code ${result.exitCode}. Check logs for details.`);
    }

    return result.stdout || '';

  } catch (error) {
    core.error(`❌ error executing claude code command: ${error instanceof Error ? error.stack : String(error)}`);
    if (error instanceof Error && error.message.includes('Credit balance is too low')) {
      throw error;
    } else {
      throw new Error(`Failed to execute Claude Code command: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
