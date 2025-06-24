import { ActionConfig } from '../config/config.js';
import { ProcessedEvent } from './types.js';
import { processEvent } from './processEvent.js';

export class ActionContext {
  public readonly config: ActionConfig;
  public readonly event: ProcessedEvent;

  constructor(config: ActionConfig) {
    this.config = config;
    
    const processedEvent = processEvent(config);
    if (!processedEvent) {
      throw new Error('Failed to process event - no valid trigger found');
    }
    
    this.event = processedEvent;
  }
}