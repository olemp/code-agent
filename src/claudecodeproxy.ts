import { execa } from 'execa';
import * as core from '@actions/core';
import { ActionConfig } from './config.js';

/**
 * Starts the Claude Code proxy server using the specified command.
 * @param workspace The directory to run the command in (optional, defaults to current dir if not needed).
 */
export async function startClaudeCodeProxyServer(config: ActionConfig): Promise<void> {
    const command = 'uv';
    const args = ['run', 'uvicorn', 'server:app', '--host', '0.0.0.0', '--port', config.claudeCodePort.toString()];

    // Set up environment variables
    const envVars: Record<string, string> = {
        ...process.env,
        ANTHROPIC_API_KEY: config.anthropicApiKey,
        OPENAI_API_KEY: config.proxyOpenaiApiKey,
        GEMINI_API_KEY: config.proxyGeminiApiKey,
        PREFERRED_PROVIDER: config.proxyPreferredProvider,
        BIG_MODEL: config.proxyBigModel,
        SMALL_MODEL: config.proxySmallModel,
    };

    try {
        // Run the server command asynchronously.
        // We pipe stdio so that server logs appear in the action's logs.
        await execa(command, args, {
            cwd: config.claudeCodeProxyCwd,
            env: envVars,
            stdio: 'inherit',
        });
    } catch (error) {
        core.error(`Error starting Claude Code proxy server: ${error instanceof Error ? error.stack : String(error)}`);
        throw new Error(`Failed to start Claude Code proxy server: ${error instanceof Error ? error.message : String(error)}`);
    }
}
