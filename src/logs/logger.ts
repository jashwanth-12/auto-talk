import * as fs from 'fs';
import * as path from 'path';
import { PATHS, isDebugMode } from '../config/config';

let logFilePath: string | null = null;

function getLogFilePath(): string {
    if (!logFilePath) {
        // Ensure logs directory exists
        if (!fs.existsSync(PATHS.LOGS_DIR)) {
            fs.mkdirSync(PATHS.LOGS_DIR, { recursive: true });
        }

        const now = new Date();
        const timestamp = now.toISOString()
            .replace(/[:-]/g, '')
            .replace('T', '_')
            .replace(/\..+/, '');
        const filename = `${timestamp}.log`;
        logFilePath = path.join(PATHS.LOGS_DIR, filename);
    }
    return logFilePath;
}

export function log(message: any): void {
    if (!isDebugMode()) {
        return;
    }

    const filepath = getLogFilePath();
    const content = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
    const logTimestamp = new Date().toISOString();
    fs.appendFileSync(filepath, `[${logTimestamp}] ${content}\n`);
}
