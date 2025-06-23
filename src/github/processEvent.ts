import * as core from '@actions/core';
import { ActionConfig } from '../config/config.js';
import { ProcessedEvent } from './types.js';
import { extractLabels } from './extractLabels.js';
import { extractText } from './extractText.js';
import { getEventType } from './getEventType.js';
import { loadEventPayload } from './loadEventPayload.js';

/**
 * Processes the GitHub event to determine the type and extract the user prompt.
 * @param config Action configuration.
 * @returns ProcessedEvent
 */

export function processEvent(config: ActionConfig): ProcessedEvent | null {
  const eventPayload = loadEventPayload(config.eventPath);
  const agentEvent = getEventType(eventPayload);

  if (!agentEvent) {
    core.info('Unsupported event type or payload structure.');
    return null; // Exit gracefully for unsupported events
  }
  core.info(`Detected event type: ${agentEvent.type}`);

  let userPrompt = "";
  let type: "claude" | "codex" | null = null;

  // Check for /claude and /codex commands in text
  const text = extractText(agentEvent.github);
  if (text) {
    if (text.startsWith('/claude')) {
      userPrompt = text.replace('/claude', '').trim();
      type = "claude";
      core.info(`Found '/claude' command in text`);
    } else if (text.startsWith('/codex')) {
      userPrompt = text.replace('/codex', '').trim();
      type = "codex";
      core.info(`Found '/codex' command in text`);
    }
  }

  if (!type && config?.triggerLabels && config.triggerLabels.length > 0) {
    const eventLabels = extractLabels(eventPayload);

    for (const label of eventLabels) {
      if (['claude'].includes(label)) {
        type = 'claude';
        core.info(`Triggered by 'claude' label`);
        break;
      } else if (['codex'].includes(label)) {
        type = 'codex';
        core.info(`Triggered by 'codex' label`);
        break;
      } else if (config.triggerLabels.includes(label)) {
        type = config.triggerType || 'claude';
        core.info(`Triggered by custom label '${label}'`);
        break;
      }
    }

    if (type && !userPrompt) {
      if (eventPayload.issue?.title) {
        userPrompt = `Review and address this issue: ${eventPayload.issue.title}\n\n`;
        if (eventPayload.issue.body) {
          userPrompt += eventPayload.issue.body;
        }
      } else if (eventPayload.pull_request?.title) {
        userPrompt = `Review this pull request: ${eventPayload.pull_request.title}\n\n`;
        if (eventPayload.pull_request.body) {
          userPrompt += eventPayload.pull_request.body;
        }
      } else {
        userPrompt = "Please review the changes and provide feedback.";
      }
    }
  }

  // If no trigger type was detected, exit gracefully
  if (!type) {
    core.info('No trigger command or configured label found.');
    return null;
  }

  // If no prompt was found, exit gracefully
  if (!userPrompt) {
    core.info('No prompt found after command or in default content.');
    return null;
  }

  return { type, agentEvent, userPrompt };
}
