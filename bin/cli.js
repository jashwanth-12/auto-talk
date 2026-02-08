#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Register ts-node to load TypeScript config
require('ts-node/register');
const { PATHS } = require('../src/config/config');

// Parse arguments
const args = process.argv.slice(2);
const command = args[0];
const debugMode = args.includes('--debug');

function deleteAuthInfo() {
    if (fs.existsSync(PATHS.AUTH_FOLDER)) {
        fs.rmSync(PATHS.AUTH_FOLDER, { recursive: true, force: true });
        console.log('Deleted auth_info folder');
    }
}

function start() {
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

    // Delete auth_info folder
    deleteAuthInfo();

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

    // Handle signals
    process.on('SIGINT', () => {
        child.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
        child.kill('SIGTERM');
    });
}

function end() {
    if (!fs.existsSync(PATHS.PID_FILE)) {
        console.log('auto-talk is not running');
        deleteAuthInfo();
        return;
    }

    const pid = fs.readFileSync(PATHS.PID_FILE, 'utf-8').trim();

    try {
        process.kill(Number(pid), 'SIGTERM');
        console.log(`Stopped auto-talk (PID: ${pid})`);
    } catch (err) {
        console.log('Process was not running');
    }

    // Clean up PID file
    fs.unlinkSync(PATHS.PID_FILE);

    // Delete auth_info folder
    deleteAuthInfo();

    console.log('auto-talk ended');
}

switch (command) {
    case 'start':
        start();
        break;
    case 'end':
        end();
        break;
    default:
        console.log('Usage: auto-talk <command> [options]');
        console.log('');
        console.log('Commands:');
        console.log('  start   Delete auth_info and start auto-talk');
        console.log('  end     Stop auto-talk and delete auth_info');
        console.log('');
        console.log('Options:');
        console.log('  --debug   Run in debug mode with verbose logging');
        process.exit(1);
}
