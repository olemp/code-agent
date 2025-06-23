/**
 * Extracts labels from the GitHub event payload.
 * @param eventPayload The GitHub event payload.
 * @returns Array of label names or empty array if no labels are found.
 */
export function extractLabels(eventPayload: any): string[] {
  // For issues and pull requests
  if (eventPayload.issue?.labels) {
    return eventPayload.issue.labels.map((label: any) => label.name.toLowerCase());
  }

  // For when labels are directly on pull request
  if (eventPayload.pull_request?.labels) {
    return eventPayload.pull_request.labels.map((label: any) => label.name.toLowerCase());
  }

  // For label events
  if (eventPayload.label) {
    return [eventPayload.label.name.toLowerCase()];
  }

  return [];
}
