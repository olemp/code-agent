import { Octokit } from 'octokit';
import { genContentsString } from '../utils/contents.js';
import { RepoContext, AgentEvent } from './types.js';
import { getContentsData } from './getContentsData.js';
import { getChangedFiles } from './getChangedFiles.js';
import { ActionConfig } from '../config/config.js';
import { 
  estimateTokens, 
  truncateToTokenLimit, 
  truncateArrayToTokenLimit 
} from '../utils/tokenEstimator.js';



export async function generatePrompt(
  octokit: Octokit,
  repo: RepoContext,
  event: AgentEvent,
  userPrompt: string,
  config?: ActionConfig
): Promise<string> {
  if (event.type === 'issuesOpened') {
    return userPrompt;
  }

  const contents = await getContentsData(octokit, repo, event);

  let prFiles: string[] = [];
  let contextInfo: string = '';

  if (event.type === 'pullRequestCommentCreated' || event.type === 'pullRequestReviewCommentCreated') {
    // Get the changed files in the PR
    prFiles = await getChangedFiles(octokit, repo, event);
  }

  // For PR review comments, add information about the file path and line
  if (event.type === 'pullRequestReviewCommentCreated') {
    const comment = event.github.comment;
    contextInfo = `Comment on file: ${comment.path}`;
    if (comment.line) {
      contextInfo += `, line: ${comment.line}`;
    }
  }

  let historyPropmt = genContentsString(contents.content, userPrompt);
  let commentsToProcess = contents.comments;
  
  // Apply comment limiting if configured
  if (config?.maxHistoryComments && config.maxHistoryComments > 0) {
    commentsToProcess = contents.comments.slice(-config.maxHistoryComments); // Keep most recent comments
  }
  
  for (const comment of commentsToProcess) {
    historyPropmt += genContentsString(comment, userPrompt);
  }

  // Apply file limiting if configured
  let filesToInclude = prFiles;
  if (config?.maxChangedFilesInContext && config.maxChangedFilesInContext > 0) {
    filesToInclude = prFiles.slice(0, config.maxChangedFilesInContext);
  }

  let prompt = "";
  if (historyPropmt) {
    prompt += `[History]\n${historyPropmt}\n\n`;
  }
  if (contextInfo) {
    prompt += `[Context]\n${contextInfo}\n\n`;
  }
  if (filesToInclude.length > 0) {
    prompt += `[Changed Files]\n${filesToInclude.join('\n')}\n\n`;
  }

  if (prompt) {
    prompt += `---\n\n${userPrompt}`;
  } else {
    prompt = userPrompt;
  }

  // Apply overall token limiting if configured
  if (config?.enableContextTruncation && config?.maxContextTokens && config.maxContextTokens > 0) {
    const estimatedTokens = estimateTokens(prompt);
    if (estimatedTokens > config.maxContextTokens) {
      // Preserve the user prompt, truncate the context sections
      const maxContextTokens = config.maxContextTokens - estimateTokens(userPrompt) - 50; // Reserve tokens for separators
      
      let contextSections = "";
      if (historyPropmt) {
        contextSections += `[History]\n${historyPropmt}\n\n`;
      }
      if (contextInfo) {
        contextSections += `[Context]\n${contextInfo}\n\n`;
      }
      if (filesToInclude.length > 0) {
        contextSections += `[Changed Files]\n${filesToInclude.join('\n')}\n\n`;
      }
      
      if (contextSections) {
        const truncatedContext = truncateToTokenLimit(contextSections, maxContextTokens);
        prompt = `${truncatedContext}---\n\n${userPrompt}`;
      } else {
        prompt = userPrompt;
      }
    }
  }

  return prompt;
}
