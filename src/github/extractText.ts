import { GitHubEvent } from './types.js';

/**
 * Extracts the relevant text (body or comment) from the event payload.
 */


export function extractText(event: GitHubEvent): string | null {
  if (event.action === 'opened' && 'issue' in event) {
    return event.issue.body;
  }
  // Ensure 'comment' exists before accessing 'body' for issue/PR comments
  if (event.action === 'created' && 'comment' in event && event.comment) {
    return event.comment.body;
  }
  return null;
}
