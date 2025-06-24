import * as core from '@actions/core';
import { ActionConfig } from '../config/config.js';
import { ProcessedEvent } from './types.js';
import { extractLabels } from './extractLabels.js';
import { extractText } from './extractText.js';
import { extractConfigOverrides } from './extractConfigOverrides.js';
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
    core.info('🙅‍♂️ unsupported event type or payload structure.');
    return null; // Exit gracefully for unsupported events
  }
  core.info(`🔍 detected event type ${agentEvent.type}`);
  
  // Extract any configuration overrides from the issue body
  const issueBody = eventPayload.issue?.body || eventPayload.pull_request?.body || null;
  const configOverrides = extractConfigOverrides(issueBody);
  
  if (configOverrides) {
    core.info('⚙️ found configuration overrides in issue or pull request body');
    
    // Apply overrides to the config object
    for (const [key, value] of Object.entries(configOverrides)) {
      if (key in config) {
        core.info(`🔄 overriding config "${key}" with value from issue body`);
        (config as any)[key] = value;
      }
    }
  }

  let userPrompt = "";
  let type: "claude" | "codex" | null = null;

  const text = extractText(agentEvent.github);
  if (text) {
    if (text.startsWith('/claude')) {
      userPrompt = text.replace('/claude', '').trim();
      type = "claude";
    } else if (text.startsWith('/codex')) {
      userPrompt = text.replace('/codex', '').trim();
      type = "codex";
    }
  }

  if (!type && config?.triggerLabels && config.triggerLabels.length > 0) {
    const eventLabels = extractLabels(eventPayload);

    for (const label of eventLabels) {
      if (['claude'].includes(label)) {
        type = 'claude';
        core.info(`🏷️ triggered by 'claude' label`);
        break;
      } else if (['codex'].includes(label)) {
        type = 'codex';
        core.info(`🏷️ triggered by 'codex' label`);
        break;
      } else if (config.triggerLabels.includes(label)) {
        type = config.triggerType || 'claude';
        core.info(`🏷️ triggered by custom label '${label}'`);
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

  if (!type) {
    core.info('❌ no trigger command or configured label found.');
    return null;
  }

  if (!userPrompt) {
    core.info('❌ no prompt found after command or in default content.');
    return null;
  }

  return { type, agentEvent, userPrompt };
}
