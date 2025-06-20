import * as core from '@actions/core';
import * as fs from 'fs';
import { AgentEvent, getEventType, extractText } from './github.js';
import { ActionConfig } from '../config/config.js';

export interface ProcessedEvent {
  type: "claude" | "codex";
  agentEvent: AgentEvent;
  userPrompt: string;
}

/**
 * Reads and parses the event payload from the specified path.
 * @param eventPath Path to the event payload file.
 * @returns Parsed event payload object.
 * @throws Error if the file cannot be read or parsed.
 */
function loadEventPayload(eventPath: string): any {
  try {
    return JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read or parse event payload at ${eventPath}: ${error}`);
  }
}

/**
 * Extracts labels from the GitHub event payload.
 * @param eventPayload The GitHub event payload.
 * @returns Array of label names or empty array if no labels are found.
 */
function extractLabels(eventPayload: any): string[] {
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
  
  // If no command was found in text, check for trigger labels
  if (!type && config.triggerLabels.length > 0) {
    const eventLabels = extractLabels(eventPayload);
    core.info(`Found labels: ${eventLabels.join(', ')}`);
    
    // Check if any of our trigger labels match
    for (const label of eventLabels) {
      if (label === 'claude') {
        type = 'claude';
        core.info(`Triggered by 'claude' label`);
        break;
      } else if (label === 'codex') {
        type = 'codex';
        core.info(`Triggered by 'codex' label`);
        break;
      } else if (config.triggerLabels.includes(label)) {
        // If it's a custom trigger label, default to claude unless specified
        type = config.triggerType || 'claude';
        core.info(`Triggered by custom label '${label}'`);
        break;
      }
    }
    
    // For label triggers, if there's no explicit prompt, use default
    if (type && !userPrompt) {
      // For label-triggered events without text, create a default prompt
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
