import yaml from 'js-yaml';
import * as core from '@actions/core';

// Define regex patterns for config blocks
const YAML_PATTERN = /```yaml\s*?config\s*?\n([\s\S]*?)```/i;
const JSON_PATTERN = /```json\s*?config\s*?\n([\s\S]*?)```/i;

interface ConfigOverrides {
    [key: string]: any;
}

/**
 * Extract configuration overrides from the issue body
 * Supports both YAML and JSON formats
 * 
 * @param body The issue or PR body text
 * @returns Configuration overrides object or null if none found
 */
export function extractConfigOverrides(body: string | null): ConfigOverrides | null {
    if (!body) return null;

    let configContent = null;
    let isYaml = false;

    // Try to match YAML config
    const yamlMatch = body.match(YAML_PATTERN);
    if (yamlMatch && yamlMatch[1]) {
        configContent = yamlMatch[1].trim();
        isYaml = true;
    } else {
        // Try to match JSON config
        const jsonMatch = body.match(JSON_PATTERN);
        if (jsonMatch && jsonMatch[1]) {
            configContent = jsonMatch[1].trim();
            isYaml = false;
        }
    }

    // If no config block found, return null
    if (!configContent) return null;

    try {
        const config = isYaml
            ? yaml.load(configContent) as ConfigOverrides
            : JSON.parse(configContent) as ConfigOverrides;

        core.debug(`⚙️ extracted config overrides: ${JSON.stringify(config)}`);
        return config;
    } catch (error) {
        core.warning(`⚠️ failed to parse config overrides: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}
