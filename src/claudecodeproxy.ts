import { execa } from 'execa';
import * as core from '@actions/core';
import { ActionConfig } from './config.js';

/**
 * Starts the Claude Code proxy server using the specified command.
 * @param workspace The directory to run the command in (optional, defaults to current dir if not needed).
 */
export function startClaudeCodeProxyServer(config: ActionConfig): AbortController {
    const command = '/root/.local/bin/uv';
    const args = ['run', 'uvicorn', 'server:app', '--host', '0.0.0.0', '--port', config.claudeCodePort.toString()];

    // Set up environment variables
    const envVars: Record<string, string> = {
        ...process.env,
        ANTHROPIC_API_KEY: config.anthropicApiKey,
    };

    if (config.proxyOpenaiApiKey) {
        envVars.OPENAI_API_KEY = config.proxyOpenaiApiKey;
    }

    if (config.proxyGeminiApiKey) {
        envVars.GEMINI_API_KEY = config.proxyGeminiApiKey;
    }

    if (config.proxyPreferredProvider) {
        envVars.PREFERRED_PROVIDER = config.proxyPreferredProvider;
    }

    if (config.proxyBigModel) {
        envVars.BIG_MODEL = config.proxyBigModel;
    }

    if (config.proxySmallModel) {
        envVars.SMALL_MODEL = config.proxySmallModel;
    }

    try {
        const controller = new AbortController();
        const cancelSignal = controller.signal;
        const child = execa(command, args, {
            cwd: config.claudeCodeProxyCwd,
            env: envVars,
            stdio: 'inherit',
            cancelSignal,
        });

        child.catch((error) => {
            if (error.isCanceled) {
                core.info('Claude Code proxy server was canceled.');
                return;
            }
            core.error(`Claude Code proxy server exited with error: ${error instanceof Error ? error.stack : String(error)}`);
            throw error;
        });
        return controller;
    } catch (error) {
        core.error(`Error starting Claude Code proxy server: ${error instanceof Error ? error.stack : String(error)}`);
        throw new Error(`Failed to start Claude Code proxy server: ${error instanceof Error ? error.message : String(error)}`);
    }
}
