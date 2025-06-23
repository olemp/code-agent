import { Octokit } from 'octokit';
import { genContentsString } from '../utils/contents.js';
import { RepoContext, AgentEvent } from './types.js';
import { getContentsData } from './getContentsData.js';
import { getChangedFiles } from './getChangedFiles.js';



export async function generatePrompt(
  octokit: Octokit,
  repo: RepoContext,
  event: AgentEvent,
  userPrompt: string
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
  for (const comment of contents.comments) {
    historyPropmt += genContentsString(comment, userPrompt);
  }

  let prompt = "";
  if (historyPropmt) {
    prompt += `[History]\n${historyPropmt}\n\n`;
  }
  if (contextInfo) {
    prompt += `[Context]\n${contextInfo}\n\n`;
  }
  if (prFiles.length > 0) {
    prompt += `[Changed Files]\n${prFiles.join('\n')}\n\n`;
  }

  if (prompt) {
    prompt += `---\n\n${userPrompt}`;
  } else {
    prompt = userPrompt;
  }

  return prompt;
}
