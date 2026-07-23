'use strict';

const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');

const execAsync = util.promisify(cp.exec);

/**
 * Finds the exact browser process PID that owns a given profile directory.
 * @param {string} profileDir
 * @returns {Promise<number|null>} PID or null
 */
async function findBrowserProcessByProfile(profileDir) {
    try {
        if (process.platform === 'win32') {
            const { stdout } = await execAsync('wmic process where "name=\'chrome.exe\' or name=\'msedge.exe\'" get ProcessId,CommandLine /FORMAT:CSV');
            const lines = stdout.split('\n');
            for (let line of lines) {
                line = line.trim();
                if (!line) continue;
                const parts = line.split(',');
                if (parts.length >= 3) {
                    const pid = parts[parts.length - 1];
                    const cmdLine = parts.slice(1, parts.length - 1).join(',');
                    if (cmdLine.toLowerCase().includes('--user-data-dir')) {
                        const regex = /--user-data-dir=(?:"([^"]+)"|([^\s]+))/i;
                        const match = cmdLine.match(regex);
                        if (match) {
                            const dir = match[1] || match[2];
                            if (path.resolve(dir).toLowerCase() === path.resolve(profileDir).toLowerCase()) {
                                return parseInt(pid, 10);
                            }
                        }
                    }
                }
            }
        } else {
            const { stdout } = await execAsync('ps -e -o pid,command');
            const lines = stdout.split('\n');
            for (let line of lines) {
                line = line.trim();
                if (!line) continue;
                if (line.toLowerCase().includes('--user-data-dir')) {
                    const match = line.match(/^(\d+)\s+(.+)$/);
                    if (match) {
                        const pid = match[1];
                        const cmdLine = match[2];
                        const regex = /--user-data-dir=(?:"([^"]+)"|([^\s]+))/i;
                        const dirMatch = cmdLine.match(regex);
                        if (dirMatch) {
                            const dir = dirMatch[1] || dirMatch[2];
                            if (path.resolve(dir) === path.resolve(profileDir)) {
                                return parseInt(pid, 10);
                            }
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error('[ProcessManager] Error finding browser process:', err.message);
    }
    return null;
}

/**
 * Terminates the exact owned process tree.
 * @param {number} pid
 * @returns {Promise<void>}
 */
async function terminateProcessTree(pid) {
    try {
        if (process.platform === 'win32') {
            await execAsync(`taskkill /pid ${pid} /t /f`);
        } else {
            await execAsync(`kill -9 ${pid}`);
        }
        // Give OS time to release resources
        await new Promise(res => setTimeout(res, 2000));
    } catch (err) {
        console.error(`[ProcessManager] Error terminating process ${pid}:`, err.message);
        throw new Error('ORPHAN_PROCESS_RECOVERY_FAILED');
    }
}

/**
 * Cleans up known browser stale lock artifacts without deleting profile data.
 * @param {string} profileDir
 */
function cleanupStaleLocks(profileDir) {
    const lockDir = `${profileDir}.lock`;
    const singletonLock = path.join(profileDir, 'SingletonLock');
    const singletonCookie = path.join(profileDir, 'SingletonCookie');

    const removeFileOrDir = (target) => {
        try {
            if (fs.existsSync(target)) {
                fs.rmSync(target, { recursive: true, force: true });
            }
        } catch (err) {
            console.error(`[ProcessManager] Failed to remove ${target}:`, err.message);
        }
    };

    removeFileOrDir(lockDir);
    removeFileOrDir(singletonLock);
    removeFileOrDir(singletonCookie);
}

module.exports = {
    findBrowserProcessByProfile,
    terminateProcessTree,
    cleanupStaleLocks
};
