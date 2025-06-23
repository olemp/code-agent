import { AgentEvent } from './types.js';

/**
 * Determines the type of GitHub event.
 */
export function getEventType(payload: any): AgentEvent | null {
  if (payload.action === 'opened' && payload.issue && !payload.issue.pull_request) {
    return { type: 'issuesOpened', github: payload };
  }
  if (payload.action === 'created' && payload.issue && !payload.issue.pull_request && payload.comment) {
    return { type: 'issueCommentCreated', github: payload };
  }
  if (payload.action === 'created' && payload.issue && payload.issue.pull_request && payload.comment) {
    return { type: 'pullRequestCommentCreated', github: payload };
  }
  if (payload.action === 'created' && payload.pull_request && payload.comment && payload.comment.path) {
    return { type: 'pullRequestReviewCommentCreated', github: payload };
  }
  return null;
}
