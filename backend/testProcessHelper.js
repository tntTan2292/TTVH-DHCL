const { execSync } = require('child_process');
const path = require('path');

function findBrowserProcessByProfile(profileDir) {
    try {
        const platform = process.platform;
        if (platform === 'win32') {
            // Read wmic output as CSV
            const output = execSync('wmic process where "name=\'chrome.exe\' or name=\'msedge.exe\'" get ProcessId,CommandLine /FORMAT:CSV', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
            const lines = output.split('\n');
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
            // Linux/macOS
            const output = execSync('ps -e -o pid,command', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
            const lines = output.split('\n');
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
        // Ignored or logged
    }
    return null;
}

const profile = path.resolve(process.cwd(), '../Data DKCL/BrowserProfiles/HUE');
console.log('Testing find profile:', profile);
console.log('Found PID:', findBrowserProcessByProfile(profile));
