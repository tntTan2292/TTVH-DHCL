const express = require('express');
const cors = require('cors');
const { loadLocalEnv } = require('./src/config/env');
const { getViewerConfigStatus } = require('./src/services/auth/runtimeUsers');

const envLoadResult = loadLocalEnv();

const f13Routes = require('./src/routes/f13Routes');
const importRoutes = require('./src/routes/importRoutes');
const authRoutes = require('./src/routes/authRoutes');
const { startWatcher } = require('./src/services/importWatcher');

const app = express();
const PORT = Number(process.env.PORT || 5050);
const HOST = process.env.HOST || '0.0.0.0';

const logRuntimeBanner = () => {
    const viewerConfig = getViewerConfigStatus();
    const loadedEnvPath =
        envLoadResult.loadedFiles[0] ||
        envLoadResult.candidates.find(Boolean) ||
        'NO_LOCAL_ENV_FOUND';

    console.log('====================================');
    console.log('Backend Runtime Started');
    console.log(`PID: ${process.pid}`);
    console.log(`Node: ${process.version}`);
    console.log(`Host: ${HOST}`);
    console.log(`Port: ${PORT}`);
    console.log(`Loaded .env: ${loadedEnvPath}`);
    console.log(`Viewer username: ${viewerConfig.viewerUsername || 'N/A'}`);
    console.log(`Viewer enabled: ${viewerConfig.viewerEnabled ? 'yes' : 'no'}`);
    console.log(`Viewer hash valid: ${viewerConfig.hashFormatValid ? 'yes' : 'no'}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('====================================');
};

process.on('SIGINT', () => {
    console.log('====================================');
    console.log('SIGINT RECEIVED');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`PID: ${process.pid}`);
    console.log('====================================');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('====================================');
    console.log('SIGTERM RECEIVED');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`PID: ${process.pid}`);
    console.log('====================================');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    console.error('====================================');
    console.error('UNCAUGHT EXCEPTION');
    console.error(`Error: ${error?.message || error}`);
    console.error(`Stack: ${error?.stack || 'N/A'}`);
    console.error(`Time: ${new Date().toISOString()}`);
    console.error('====================================');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('====================================');
    console.error('UNHANDLED REJECTION');
    console.error(`Reason: ${reason instanceof Error ? reason.message : String(reason)}`);
    console.error(`Promise: ${promise}`);
    console.error(`Time: ${new Date().toISOString()}`);
    console.error('====================================');
});

process.on('exit', (code) => {
    console.log('====================================');
    console.log('PROCESS EXIT');
    console.log(`Exit Code: ${code}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`PID: ${process.pid}`);
    console.log('====================================');
});

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/f13', f13Routes);
app.use('/api/import', importRoutes);

const server = app.listen(PORT, HOST, () => {
    logRuntimeBanner();
    console.log(`TTVH Backend running on port ${PORT}`);
    startWatcher();
});

server.on('error', (error) => {
    if (error?.code === 'EADDRINUSE') {
        console.error('====================================');
        console.error(`PORT ${PORT} IS OCCUPIED`);
        console.error(`Host: ${HOST}`);
        console.error('Run the Windows port check first:');
        console.error('powershell -ExecutionPolicy Bypass -File .\\scripts\\check-qis-lan-ports.ps1');
        console.error('Then stop the owning process before restarting QIS V2.');
        console.error('====================================');
        process.exit(1);
    }

    throw error;
});
