import * as core from '@actions/core';
import Anthropic, { ClientOptions } from '@anthropic-ai/sdk';
import AnthropicBedrock from '@anthropic-ai/bedrock-sdk';
import { ActionConfig } from '../config/config.js';

const defaultSmallFastModel = 'claude-3-5-haiku-20241022';
const defaultSmallFastModelBedrock = 'anthropic.claude-3-5-haiku-20241022-v1:0';

function getAnthropicClient(config: ActionConfig): Anthropic {
  const anthropicOptions: ClientOptions = {
    apiKey: config.anthropicApiKey,
  };
  // Set base URL if provided
  if (config.anthropicBaseUrl) {
    anthropicOptions.baseURL = config.anthropicBaseUrl;
  }
  return new Anthropic(anthropicOptions);
}

function getAnthropicBedrockClient(config: ActionConfig): AnthropicBedrock {
  return new AnthropicBedrock({
    awsAccessKey: config.awsAccessKeyId,
    awsSecretKey: config.awsSecretAccessKey,
    awsRegion: config.awsRegion || 'us-east-1',
    baseURL: config.anthropicBedrockBaseUrl,
  });
}

/**
 * Function to generate Git commit messages using Anthropic API.
 * 
 * @param changedFiles List of changed files
 * @param userPrompt User's original prompt to Claude
 * @param context Context information (PR number, Issue number, etc.)
 * @param config Optional ActionConfig for additional settings
 * 
 * @returns Generated commit message
 */
export async function generateCommitMessage(
  changedFiles: string[],
  userPrompt: string,
  context: { prNumber?: number; issueNumber?: number; },
  config: ActionConfig
): Promise<string> {
  try {
    let userContent = `Based on the following file changed and User Request, generate a concise and clear git commit message in all lowercase.
The commit message should follow this format:
* Start with a tag for the type of change (e.g. "fix", "feat", "docs", "style", "refactor", "test", "chore"), example: "fix: remove unused code"
* Summary of changes (50 characters or less). Please do not include any other text.

User Request:
${userPrompt}

Files changed:
\`\`\`
${changedFiles.join('\n')}
\`\`\``;

    if (context.prNumber) {
      userContent += `\n\nThis change is related to PR #${context.prNumber}.`;
    }
    if (context.issueNumber) {
      userContent += `\n\nThis change is related to Issue #${context.issueNumber}.`;
    }

    const anthropic = config.claudeCodeUseBedrock ? getAnthropicBedrockClient(config) : getAnthropicClient(config);
    const model = config.claudeCodeUseBedrock
      ? config.anthropicSmallFastModel || defaultSmallFastModelBedrock
      : config.anthropicSmallFastModel || defaultSmallFastModel;

    const response = await anthropic.messages.create({
      model: model,
      max_tokens: 256,
      messages: [{ role: "user", content: userContent }],
    });

    // Extract commit message from response
    let commitMessage = '';
    if (response.content.length > 0 && response.content[0].type === 'text') {
      commitMessage = response.content[0].text;
    }
    commitMessage = commitMessage.trim().split('\n')[0]; // Take the first line

    // Fallback if the message is empty or too long
    if (!commitMessage || commitMessage.length > 100) {
      core.warning(`⚠️ generated commit message was empty or too long: "${commitMessage}". falling back.`);
      throw new Error("Generated commit message invalid."); // Trigger fallback
    }


    core.info(`✨ generated commit message: ${commitMessage}`);
    return commitMessage;
  } catch (error) {
    core.warning(`⚠️ error generating commit message: ${error instanceof Error ? error.message : String(error)}. using fallback.`);
    // Return default message in case of error
    if (context.prNumber) {
      return `Apply changes for PR #${context.prNumber}`;
    } else if (context.issueNumber) {
      return `Apply changes for Issue #${context.issueNumber}`;
    } else {
      // Generic fallback if no context number is available
      const fileCount = changedFiles.length;
      return `Apply changes to ${fileCount} file${fileCount !== 1 ? 's' : ''}`;
    }
  }
}
