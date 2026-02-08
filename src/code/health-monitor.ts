import * as os from 'os';
import { log } from '../logs/logger';
import { HEALTH_CONFIG } from '../config/config';

const serverStartTime = Date.now();
let healthInterval: NodeJS.Timeout | null = null;

function formatBytes(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
}

function formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
}

function logHealthStats(): void {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const uptime = Date.now() - serverStartTime;

    const stats = {
        uptime: formatUptime(uptime),
        memory: {
            used: formatBytes(usedMem),
            free: formatBytes(freeMem),
            total: formatBytes(totalMem),
            usagePercent: `${((usedMem / totalMem) * 100).toFixed(1)}%`
        },
        process: {
            heapUsed: formatBytes(process.memoryUsage().heapUsed),
            heapTotal: formatBytes(process.memoryUsage().heapTotal),
            rss: formatBytes(process.memoryUsage().rss)
        },
        system: {
            loadAvg: os.loadavg().map(l => l.toFixed(2)).join(', '),
            cpus: os.cpus().length
        }
    };

    // Log to file
    log('[Health] Server stats:');
    log(stats);

    // Print to console for easy access
    console.log('[Health] Server stats:', JSON.stringify(stats, null, 2));
}

export function startHealthMonitor(): void {
    log('[Health] Starting health monitor');

    // Log initial stats
    logHealthStats();

    // Start periodic logging
    healthInterval = setInterval(() => {
        logHealthStats();
    }, HEALTH_CONFIG.intervalMs);
}

export function stopHealthMonitor(): void {
    if (healthInterval) {
        clearInterval(healthInterval);
        healthInterval = null;
        log('[Health] Health monitor stopped');
    }
}
