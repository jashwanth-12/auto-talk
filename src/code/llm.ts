import { spawn } from 'child_process';
import { LLM_CONFIG } from '../config/config';
import { log } from '../logs/logger';

async function isOllamaServerRunning(): Promise<boolean> {
    try {
        const response = await fetch(`${LLM_CONFIG.ollamaHost}/api/tags`);
        return response.ok;
    } catch {
        return false;
    }
}

async function waitForServer(): Promise<boolean> {
    log('[LLM] Waiting for Ollama server to be ready...');

    for (let attempt = 0; attempt < LLM_CONFIG.serverCheckMaxAttempts; attempt++) {
        if (await isOllamaServerRunning()) {
            log('[LLM] Ollama server is ready');
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, LLM_CONFIG.serverCheckIntervalMs));
    }

    log('[LLM] Ollama server did not start in time');
    return false;
}

async function startLlmServerIfNeeded(): Promise<boolean> {
    log('[LLM] Checking if Ollama server is running...');

    if (await isOllamaServerRunning()) {
        log('[LLM] Ollama server is already running');
        return true;
    }

    log('[LLM] Starting Ollama server...');

    // Start ollama serve in background
    const ollamaProcess = spawn('ollama', ['serve'], {
        detached: true,
        stdio: 'ignore'
    });

    ollamaProcess.unref();

    // Wait for server to be ready
    const serverReady = await waitForServer();

    if (!serverReady) {
        return false;
    }

    // Pull/start the model
    log(`[LLM] Ensuring model ${LLM_CONFIG.ollamaModel} is available...`);

    return new Promise((resolve) => {
        const pullProcess = spawn('ollama', ['pull', LLM_CONFIG.ollamaModel], {
            stdio: 'inherit'
        });

        pullProcess.on('close', (code) => {
            if (code === 0) {
                log(`[LLM] Model ${LLM_CONFIG.ollamaModel} is ready`);
                resolve(true);
            } else {
                log(`[LLM] Failed to pull model ${LLM_CONFIG.ollamaModel}`);
                resolve(false);
            }
        });

        pullProcess.on('error', (err) => {
            log('[LLM] Error pulling model: ' + err.message);
            resolve(false);
        });
    });
}

export async function promptLlm(input: string): Promise<string> {
    // Ensure server is running
    const serverReady = await startLlmServerIfNeeded();

    if (!serverReady) {
        throw new Error('Ollama server is not available');
    }

    log('[LLM] Sending prompt to LLM...');

    try {
        const response = await fetch(`${LLM_CONFIG.ollamaHost}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: LLM_CONFIG.ollamaModel,
                prompt: input,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as { response: string };

        log('[LLM] Response received:');
        log(data.response);

        return data.response;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log('[LLM] Error prompting LLM: ' + errorMessage);
        throw error;
    }
}
