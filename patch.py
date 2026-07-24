import sys
import re

with open('backend/src/services/dkclSessionPreflightService.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace interactiveAuthenticate block
old_auth = r"            // R4\.1 Automatic Reconciliation\s*const existingPid = await processManager\.findBrowserProcessByProfile\(profileDir\);\s*if \(existingPid\) \{\s*// Orphaned process unquestionably belongs to this profile\. Terminate it to recover\.\s*try \{\s*await processManager\.terminateProcessTree\(existingPid\);\s*\} catch \(err\) \{\s*const recErr = new Error\('Failed to recover orphaned process'\);\s*recErr\.code = 'ORPHAN_PROCESS_RECOVERY_FAILED';\s*throw recErr;\s*\}\s*\}\s*// Always clean up any stale lock files before launching\s*processManager\.cleanupStaleLocks\(profileDir\);"

new_auth = """            // R4.1A Automatic Reconciliation
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
            }"""

content = re.sub(old_auth, new_auth, content)

# Replace recover block
old_recover = r"    async recover\(source\) \{\s*const sourceConfig = this\.normalizeSource\(source\);\s*const profileDir = process\.env\[sourceConfig\.profileDirEnv\] \|\| sourceConfig\.defaultProfileDir\(\);\s*let terminated = false;\s*const pid = await processManager\.findBrowserProcessByProfile\(profileDir\);\s*if \(pid\) \{\s*await processManager\.terminateProcessTree\(pid\);\s*terminated = true;\s*\}\s*processManager\.cleanupStaleLocks\(profileDir\);\s*const entry = getOrCreateRegistryEntry\(sourceConfig\.source\);\s*if \(entry\.client\) \{\s*await entry\.client\.close\(\)\.catch\(\(\) => \{\}\);\s*\}\s*entry\.state = 'NOT_AUTHENTICATED';\s*entry\.client = null;\s*entry\.openingPromise = null;\s*entry\.authenticated = false;\s*entry\.backgroundReady = false;\s*entry\.minimized = false;\s*entry\.lastError = null;\s*entry\.updatedAt = new Date\(\)\.toISOString\(\);\s*return \{\s*source: sourceConfig\.source,\s*status: 'RECOVERED',\s*details: \{\s*profile_dir_resolved: profileDir,\s*orphan_process_found: !!pid,\s*terminated_pid: pid \|\| null,\s*registry_cleared: true\s*\}\s*\};\s*\}"

new_recover = """    async recover(source) {
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

        if (action === 'PROCESS_INSPECTION_UNAVAILABLE' || action === 'PROFILE_OWNERSHIP_UNVERIFIED' || action === 'PROFILE_IN_USE_OWNED') {
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
    }"""

content = re.sub(old_recover, new_recover, content)

with open('backend/src/services/dkclSessionPreflightService.js', 'w', encoding='utf-8') as f:
    f.write(content)
