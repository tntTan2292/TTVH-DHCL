'use strict';

const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');

class BrowserProcessManager {
    constructor({ execAsync = util.promisify(cp.exec), existsSync = fs.existsSync, rmSync = fs.rmSync } = {}) {
        this.execAsync = execAsync;
        this.existsSync = existsSync;
        this.rmSync = rmSync;
    }

    async findBrowserProcessByProfile(profileDir) {
        const result = {
            inspectionStatus: 'FAILED',
            matchingProcesses: [],
            errorCode: null
        };

        try {
            if (process.platform === 'win32') {
                try {
                    // Try CIM/WMI first
                    const { stdout } = await this.execAsync('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name=\'chrome.exe\' OR Name=\'msedge.exe\'\\" | Select-Object ProcessId, CommandLine | ConvertTo-Json -Compress"');
                    if (stdout.trim()) {
                        let processes = [];
                        try {
                            const parsed = JSON.parse(stdout);
                            processes = Array.isArray(parsed) ? parsed : [parsed];
                        } catch (e) {
                            result.inspectionStatus = 'AMBIGUOUS';
                            result.errorCode = 'PARSE_ERROR';
                            return result;
                        }

                        for (const proc of processes) {
                            const cmdLine = proc.CommandLine || '';
                            if (cmdLine.toLowerCase().includes('--user-data-dir')) {
                                const match = cmdLine.match(/--user-data-dir=(?:"([^"]+)"|([^\s]+))/i);
                                if (match) {
                                    const dir = match[1] || match[2];
                                    if (path.resolve(dir).toLowerCase() === path.resolve(profileDir).toLowerCase()) {
                                        result.matchingProcesses.push({
                                            pid: parseInt(proc.ProcessId, 10),
                                            executable: 'chrome.exe',
                                            commandLine: cmdLine,
                                            exactProfileMatch: true,
                                            ownershipEvidence: true
                                        });
                                    }
                                }
                            }
                        }
                        result.inspectionStatus = 'SUCCESS';
                        return result;
                    } else {
                        result.inspectionStatus = 'SUCCESS';
                        return result; // No processes found
                    }
                } catch (cimErr) {
                    // Fallback to wmic
                    const { stdout } = await this.execAsync('wmic process where "name=\'chrome.exe\' or name=\'msedge.exe\'" get ProcessId,CommandLine /FORMAT:CSV');
                    const lines = stdout.split('\n');
                    for (let line of lines) {
                        line = line.trim();
                        if (!line) continue;
                        const parts = line.split(',');
                        if (parts.length >= 3) {
                            const pidStr = parts[parts.length - 1];
                            const cmdLine = parts.slice(1, parts.length - 1).join(',');
                            if (cmdLine.toLowerCase().includes('--user-data-dir')) {
                                const match = cmdLine.match(/--user-data-dir=(?:"([^"]+)"|([^\s]+))/i);
                                if (match) {
                                    const dir = match[1] || match[2];
                                    if (path.resolve(dir).toLowerCase() === path.resolve(profileDir).toLowerCase()) {
                                        result.matchingProcesses.push({
                                            pid: parseInt(pidStr, 10),
                                            executable: 'chrome.exe',
                                            commandLine: cmdLine,
                                            exactProfileMatch: true,
                                            ownershipEvidence: true
                                        });
                                    }
                                }
                            }
                        }
                    }
                    result.inspectionStatus = 'SUCCESS';
                    return result;
                }
            } else {
                const { stdout } = await this.execAsync('ps -e -o pid,command');
                const lines = stdout.split('\n');
                for (let line of lines) {
                    line = line.trim();
                    if (!line) continue;
                    if (line.toLowerCase().includes('--user-data-dir')) {
                        const match = line.match(/^(\d+)\s+(.+)$/);
                        if (match) {
                            const pidStr = match[1];
                            const cmdLine = match[2];
                            const dirMatch = cmdLine.match(/--user-data-dir=(?:"([^"]+)"|([^\s]+))/i);
                            if (dirMatch) {
                                const dir = dirMatch[1] || dirMatch[2];
                                if (path.resolve(dir) === path.resolve(profileDir)) {
                                    result.matchingProcesses.push({
                                        pid: parseInt(pidStr, 10),
                                        executable: 'browser',
                                        commandLine: cmdLine,
                                        exactProfileMatch: true,
                                        ownershipEvidence: true
                                    });
                                }
                            }
                        }
                    }
                }
                result.inspectionStatus = 'SUCCESS';
                return result;
            }
        } catch (err) {
            result.inspectionStatus = 'FAILED';
            result.errorCode = err.message;
        }
        return result;
    }

    async terminateProcessTree(pid) {
        try {
            if (process.platform === 'win32') {
                await this.execAsync(`taskkill /pid ${pid} /t /f`);
            } else {
                await this.execAsync(`kill -9 ${pid}`);
            }
            await new Promise(res => setTimeout(res, 2000));
        } catch (err) {
            throw new Error('ORPHAN_PROCESS_RECOVERY_FAILED');
        }
    }

    cleanupStaleLocks(profileDir) {
        const lockDir = `${profileDir}.lock`;
        const singletonLock = path.join(profileDir, 'SingletonLock');
        const singletonCookie = path.join(profileDir, 'SingletonCookie');

        const removeFileOrDir = (target) => {
            try {
                if (this.existsSync(target)) {
                    this.rmSync(target, { recursive: true, force: true });
                }
            } catch (err) {
                // ignore
            }
        };

        removeFileOrDir(lockDir);
        removeFileOrDir(singletonLock);
        removeFileOrDir(singletonCookie);
    }
}

// Export default instance for normal use, but allow creating new instances for tests
const defaultInstance = new BrowserProcessManager();

module.exports = {
    BrowserProcessManager,
    findBrowserProcessByProfile: defaultInstance.findBrowserProcessByProfile.bind(defaultInstance),
    terminateProcessTree: defaultInstance.terminateProcessTree.bind(defaultInstance),
    cleanupStaleLocks: defaultInstance.cleanupStaleLocks.bind(defaultInstance)
};
