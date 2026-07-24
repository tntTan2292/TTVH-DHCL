const fs = require('fs');
let code = fs.readFileSync('backend/src/services/dkclSessionPreflightService.js', 'utf8');

const lockClassificationCode = `
    async _classifyLockState(sourceConfig, entry, profileDir) {
        const inspection = await processManager.findBrowserProcessByProfile(profileDir);
        const lockDirExists = require('fs').existsSync(\`\${profileDir}.lock\`);
        
        if (inspection.inspectionStatus !== 'SUCCESS') {
            return { lockState: 'UNKNOWN', inspection };
        }

        const hasLiveProcess = inspection.matchingProcesses.length > 0;
        
        if (hasLiveProcess) {
            if (entry.client || entry.openingPromise) {
                return { lockState: 'LIVE_OWNED', inspection };
            }
            return { lockState: 'LIVE_UNVERIFIED', inspection };
        }

        if (!hasLiveProcess && lockDirExists && !entry.client && !entry.openingPromise) {
            return { lockState: 'STALE_CONFIRMED', inspection };
        }

        return { lockState: 'NONE', inspection };
    }
`;

code = code.replace('    async preflight(source) {', lockClassificationCode + '\n    async preflight(source) {');

const errorMessagesCode = `function safeMessage(error, sourceLabel) {
    if (error?.code === 'AUTHENTICATION_REQUIRED') {
        return \`Phiên đăng nhập DKCL \${sourceLabel} không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập/cập nhật phiên rồi thử lại.\`;
    }
    if (error?.code === 'PROFILE_OWNERSHIP_UNVERIFIED' || error?.code === 'PROFILE_LOCKED' || error?.code === 'PROFILE_LOCK_STALE') {
        return \`Không thể xác minh tiến trình đang sử dụng hồ sơ trình duyệt \${sourceLabel}. Hãy đóng đúng cửa sổ DKCL đang mở hoặc khởi động lại backend rồi thử lại.\`;
    }
    if (error?.code === 'PROCESS_INSPECTION_UNAVAILABLE') {
        return \`Không thể kiểm tra tiến trình trình duyệt \${sourceLabel} trên máy này. Hệ thống chưa thay đổi hồ sơ để bảo đảm an toàn.\`;
    }
    if (error?.code === 'PROFILE_IN_USE_OWNED') {
        return \`Trình duyệt đăng nhập \${sourceLabel} đang chạy. Vui lòng hoàn tất hoặc đóng cửa sổ hiện tại trước khi mở lại.\`;
    }
    if (error?.code === 'ORPHAN_PROCESS_RECOVERY_FAILED') {
        return \`Không thể khôi phục tiến trình đăng nhập \${sourceLabel}. Vui lòng khởi động lại backend và thử lại.\`;
    }
    return \`Không thể kiểm tra phiên DKCL \${sourceLabel}. Vui lòng thử lại hoặc mở đăng nhập thủ công nếu cần.\`;
}`;

code = code.replace(/function safeMessage[\s\S]*?const globalRegistry/m, errorMessagesCode + '\n\nconst globalRegistry');

// For interactiveAuthenticate
const targetAuth = `            // R4.1 Automatic Reconciliation
            const existingPid = await processManager.findBrowserProcessByProfile(profileDir);
            if (existingPid) {
                // Orphaned process unquestionably belongs to this profile. Terminate it to recover.
                try {
                    await processManager.terminateProcessTree(existingPid);
                } catch (err) {
                    const recErr = new Error('Failed to recover orphaned process');
                    recErr.code = 'ORPHAN_PROCESS_RECOVERY_FAILED';
                    throw recErr;
                }
            }
            // Always clean up any stale lock files before launching
            processManager.cleanupStaleLocks(profileDir);`;

const replaceAuth = `            // R4.1A Automatic Reconciliation
            const classification = await this._classifyLockState(sourceConfig, entry, profileDir);
            
            if (classification.lockState === 'UNKNOWN' || classification.lockState === 'LIVE_UNVERIFIED') {
                const errCode = classification.lockState === 'UNKNOWN' ? 'PROCESS_INSPECTION_UNAVAILABLE' : 'PROFILE_OWNERSHIP_UNVERIFIED';
                const recErr = new Error(errCode);
                recErr.code = errCode;
                throw recErr;
            }

            if (classification.lockState === 'LIVE_OWNED') {
                const recErr = new Error('PROFILE_IN_USE_OWNED');
                recErr.code = 'PROFILE_IN_USE_OWNED';
                throw recErr;
            }

            if (classification.lockState === 'STALE_CONFIRMED') {
                processManager.cleanupStaleLocks(profileDir);
            }`;
code = code.replace(targetAuth, replaceAuth);

// For recover
const targetRecover = `    async recover(source) {
        const sourceConfig = this.normalizeSource(source);
        const profileDir = process.env[sourceConfig.profileDirEnv] || sourceConfig.defaultProfileDir();
        
        let terminated = false;
        const pid = await processManager.findBrowserProcessByProfile(profileDir);
        
        if (pid) {
            await processManager.terminateProcessTree(pid);
            terminated = true;
        }
        
        processManager.cleanupStaleLocks(profileDir);
        
        const entry = getOrCreateRegistryEntry(sourceConfig.source);
        if (entry.client) {
            await entry.client.close().catch(() => {});
        }
        
        entry.state = 'NOT_AUTHENTICATED';
        entry.client = null;
        entry.openingPromise = null;
        entry.authenticated = false;
        entry.backgroundReady = false;
        entry.minimized = false;
        entry.lastError = null;
        entry.updatedAt = new Date().toISOString();

        return {
            source: sourceConfig.source,
            status: 'RECOVERED',
            details: {
                profile_dir_resolved: profileDir,
                orphan_process_found: !!pid,
                terminated_pid: pid || null,
                registry_cleared: true
            }
        };
    }`;

const replaceRecover = `    async recover(source) {
        const sourceConfig = this.normalizeSource(source);
        const profileDir = process.env[sourceConfig.profileDirEnv] || sourceConfig.defaultProfileDir();
        const entry = getOrCreateRegistryEntry(sourceConfig.source);
        
        const classification = await this._classifyLockState(sourceConfig, entry, profileDir);
        
        let action = 'NO_RECOVERY_NEEDED';
        
        if (classification.lockState === 'UNKNOWN') {
            action = 'PROCESS_INSPECTION_UNAVAILABLE';
        } else if (classification.lockState === 'LIVE_UNVERIFIED') {
            action = 'PROFILE_OWNERSHIP_UNVERIFIED';
        } else if (classification.lockState === 'LIVE_OWNED') {
            action = 'PROFILE_IN_USE_OWNED';
        } else if (classification.lockState === 'STALE_CONFIRMED') {
            processManager.cleanupStaleLocks(profileDir);
            action = 'STALE_LOCK_CLEANED';
            
            if (entry.client) {
                await entry.client.close().catch(() => {});
            }
            entry.state = 'NOT_AUTHENTICATED';
            entry.client = null;
            entry.openingPromise = null;
            entry.authenticated = false;
            entry.backgroundReady = false;
            entry.minimized = false;
            entry.lastError = null;
            entry.updatedAt = new Date().toISOString();
        }

        if (action === 'PROCESS_INSPECTION_UNAVAILABLE' || action === 'PROFILE_OWNERSHIP_UNVERIFIED') {
            const err = new Error(action);
            err.code = action;
            throw err;
        }

        return {
            source: sourceConfig.source,
            status: action,
            details: {
                classification: classification.lockState
            }
        };
    }`;

code = code.replace(targetRecover, replaceRecover);

fs.writeFileSync('backend/src/services/dkclSessionPreflightService.js', code);
