import * as core from '@actions/core';
import { execa } from 'execa'; // Changed from execaSync
import _ from 'lodash';
import { ActionConfig } from '../config/config.js';
import { truncate } from '../utils/truncate.js';
import { estimateTokens, truncateToTokenLimit } from '../utils/tokenEstimator.js';

/**
 * Executes the Codex CLI command.
 * 
 * @param workspace The directory to run the command in.
 * @param config The ActionConfig object containing API keys and configuration.
 * @param prompt The user prompt
 * @param timeout Timeout in milliseconds.
 * 
 * @returns A promise resolving to a CodexResult object containing the response text and token usage metrics.
 */
export async function runCodex(workspace: string, config: ActionConfig, prompt: string, timeout: number): Promise<{ text: string, [key: string]: any }> { 
  if(!config.openaiApiKey) {
    throw new Error('An OpenAI API key is required to run Codex. Please check your workflow configuration.');
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
  
  core.info(`Executing Codex CLI in ${workspace} with timeout ${timeout}ms`);
  try {
    const cliArgs = [
      config.openaiModel && `-m ${config.openaiModel}`,
      '--full-auto',
      '--dangerously-auto-approve-everything',
      '--quiet',
      processedPrompt
    ].filter(Boolean)

    const envVars: Record<string, string> = {
      ...process.env,
      OPENAI_API_KEY: config.openaiApiKey,
      CODEX_QUIET_MODE: '0',
    };

    if (config.openaiBaseUrl) {
      envVars.OPENAI_API_BASE_URL = config.openaiBaseUrl;
    }

    core.info(`Run command: codex ${cliArgs.map(a => truncate(a, 50)).join(' ')}`);
    const result = await execa(
      'codex',
      cliArgs,
      {
        timeout,
        cwd: workspace,
        env: envVars,
        stdio: 'pipe',
        reject: false
      }
    );

    core.info(`Codex CLI exited with code ${result.exitCode}`);

    if (result.stderr) {
      if (result.exitCode !== 0) {
        core.error(`Codex command failed with stderr. Exit code: ${result.exitCode}, stderr: ${result.stderr}`);
        throw new Error(`Codex command failed with exit code ${result.exitCode}. Stderr: ${result.stderr}`);
      } else {
        core.warning(`Codex command exited successfully but produced stderr: ${result.stderr}`);
      }
    }

    if (result.failed || result.exitCode !== 0) {
      core.error(`Codex command failed. Exit code: ${result.exitCode}, stdout: ${result.stdout}`);
      const errorMessage = result.stderr ? `Stderr: ${result.stderr}` : `Stdout: ${result.stdout}`; 
      throw new Error(`Codex command failed with exit code ${result.exitCode}. ${errorMessage}`);
    }

    core.info(`Codex command executed successfully.\n\m: ${JSON.stringify(result.stdout)}`);

    const codeResult = `\`\`\`\n${result.stdout}\n\`\`\``;

    const lastLine = codeResult.split('\n').slice(-2, -1)[0];
    const jsonResult = JSON.parse(lastLine);
    return {
      text: _.get(jsonResult, 'content[0].text', ''),
      ..._.omit(jsonResult, 'content')
    }

  } catch (error) {
    core.error(`Error executing Codex command: ${error instanceof Error ? error.stack : String(error)}`);
    if (error instanceof Error && 'timedOut' in error && (error as any).timedOut) {
      throw new Error(`Codex command timed out after ${timeout}ms.`);
    }
    throw new Error(`Failed to execute Codex command: ${error instanceof Error ? error.message : String(error)}`);
  }
}
