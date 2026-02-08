import { log } from '../logs/logger';
import { end } from '../../bin/cli';

export function registerShutdownHandlers(): void {
    // Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n[Shutdown] Received SIGINT (Ctrl+C)');
        end();
        process.exit(0);
    });

    // Kill command
    process.on('SIGTERM', () => {
        console.log('\n[Shutdown] Received SIGTERM');
        end();
        process.exit(0);
    });

    // Terminal closed
    process.on('SIGHUP', () => {
        log('[Shutdown] Received SIGHUP');
        end();
        process.exit(0);
    });

    // Uncaught exceptions
    process.on('uncaughtException', (err) => {
        console.error('[Shutdown] Uncaught exception:', err.message);
        log('[Shutdown] Uncaught exception: ' + err.message);
        end();
        process.exit(1);
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
        console.error('[Shutdown] Unhandled rejection:', reason);
        log('[Shutdown] Unhandled rejection: ' + String(reason));
        end();
        process.exit(1);
    });

    log('[Shutdown] Shutdown handlers registered');
}
