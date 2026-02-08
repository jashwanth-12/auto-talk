#!/usr/bin/env npx ts-node

import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import { PATHS } from '../src/config/config';
import { log } from '../src/logs/logger';
import { stopHealthMonitor } from '../src/code/health-monitor';

// Parse arguments
const args = process.argv.slice(2);
const command = args[0];
const debugMode = args.includes('--debug');

let hasEnded = false;

export function end(): void {
    if (hasEnded) {
        return; // Prevent multiple calls
    }
    hasEnded = true;

    console.log('\n[End] Shutting down...');
    log('[End] Shutting down');

    // If process is running, send SIGTERM
    if (fs.existsSync(PATHS.PID_FILE)) {
        const pid = fs.readFileSync(PATHS.PID_FILE, 'utf-8').trim();
        try {
            process.kill(Number(pid), 0); // Check if process exists
            process.kill(Number(pid), 'SIGTERM');
            console.log(`[End] Sent stop signal to process (PID: ${pid})`);
            log(`[End] Sent stop signal to process (PID: ${pid})`);
        } catch {
            // Process not running, continue with cleanup
        }
    }

    // Stop health monitor
    stopHealthMonitor();

    // Delete auth_info folder
    if (fs.existsSync(PATHS.AUTH_FOLDER)) {
        fs.rmSync(PATHS.AUTH_FOLDER, { recursive: true, force: true });
        console.log('[End] Deleted auth_info folder');
        log('[End] Deleted auth_info folder');
    }

    // Clean up PID file
    if (fs.existsSync(PATHS.PID_FILE)) {
        fs.unlinkSync(PATHS.PID_FILE);
        console.log('[End] Deleted PID file');
        log('[End] Deleted PID file');
    }

    console.log('[End] Cleanup complete');
    log('[End] Cleanup complete');
}

function start(): void {
    // Check if already running
    if (fs.existsSync(PATHS.PID_FILE)) {
        const pid = fs.readFileSync(PATHS.PID_FILE, 'utf-8').trim();
        try {
            process.kill(Number(pid), 0); // Check if process exists
            console.log(`auto-talk is already running (PID: ${pid})`);
            console.log('Run "auto-talk end" first to stop it');
            process.exit(1);
        } catch {
            // Process not running, clean up stale PID file
            fs.unlinkSync(PATHS.PID_FILE);
        }
    }

    // Clean up before starting fresh
    end();

    // Reset hasEnded flag so cleanup can run again later
    hasEnded = false;

    if (debugMode) {
        console.log('Starting auto-talk in DEBUG mode...');
    } else {
        console.log('Starting auto-talk...');
    }

    // Start the process with environment variables
    const env = { ...process.env };
    if (debugMode) {
        env.AUTO_TALK_DEBUG = 'true';
    }

    const child = spawn('node', ['index.js'], {
        cwd: PATHS.ROOT_DIR,
        stdio: 'inherit',
        detached: false,
        env
    });

    // Save PID
    fs.writeFileSync(PATHS.PID_FILE, String(child.pid));

    child.on('exit', (code) => {
        // Clean up PID file on exit
        if (fs.existsSync(PATHS.PID_FILE)) {
            fs.unlinkSync(PATHS.PID_FILE);
        }
        process.exit(code || 0);
    });

    // Handle signals - forward to child
    process.on('SIGINT', () => {
        child.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
        child.kill('SIGTERM');
    });
}

function cleanup(): void {
    console.log('Cleaning up local dev resources...');

    // Clean up log files
    if (fs.existsSync(PATHS.LOGS_DIR)) {
        fs.rmSync(PATHS.LOGS_DIR, { recursive: true, force: true });
        console.log('Deleted log files');
    }

    // Stop Ollama server if running
    try {
        execSync('pkill ollama', { stdio: 'ignore' });
        console.log('Stopped Ollama server');
    } catch {
        console.log('Ollama server was not running');
    }

    // End auto-talk
    end();
}

// Only run CLI commands if this file is executed directly (not imported)
if (require.main === module) {
    switch (command) {
        case 'start':
            start();
            break;
        case 'end':
            end();
            break;
        case 'cleanup':
            cleanup();
            break;
        default:
            console.log('Usage: auto-talk <command> [options]');
            console.log('');
            console.log('Commands:');
            console.log('  start     Delete auth_info and start auto-talk');
            console.log('  end       Stop auto-talk and delete auth_info');
            console.log('  cleanup   Stop Ollama server, auto-talk, and delete logs');
            console.log('');
            console.log('Options:');
            console.log('  --debug   Run in debug mode with verbose logging');
            process.exit(1);
    }
}
