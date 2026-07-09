const express = require('express');
const cors = require('cors');
const f13Routes = require('./src/routes/f13Routes');
const importRoutes = require('./src/routes/importRoutes');
const { startWatcher } = require('./src/services/importWatcher');

const app = express();
const PORT = 5050;

const logRuntimeBanner = () => {
    console.log('====================================');
    console.log('Backend Runtime Started');
    console.log(`PID: ${process.pid}`);
    console.log(`Node: ${process.version}`);
    console.log(`Port: ${PORT}`);
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

app.use('/api/f13', f13Routes);
app.use('/api/import', importRoutes);

app.listen(PORT, () => {
    logRuntimeBanner();
    console.log(`TTVH Backend running on port ${PORT}`);
    startWatcher();
});
