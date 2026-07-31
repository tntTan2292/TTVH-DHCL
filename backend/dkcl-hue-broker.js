'use strict';

const { createBrokerApp } = require('./src/services/dkclHueBrokerServer');
const { DEFAULT_BROKER_PORT } = require('./src/services/dkclHueBrokerClient');

const PORT = Number(process.env.DKCL_HUE_BROKER_PORT || DEFAULT_BROKER_PORT);
const HOST = process.env.DKCL_HUE_BROKER_HOST || '127.0.0.1';

const { app } = createBrokerApp();

const server = app.listen(PORT, HOST, () => {
    console.log('====================================');
    console.log('DKCL HUE Browser Broker Started');
    console.log(`PID: ${process.pid}`);
    console.log(`Host: ${HOST}`);
    console.log(`Port: ${PORT}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('====================================');
});

server.on('error', (error) => {
    console.error('====================================');
    console.error('DKCL HUE BROKER START FAILED');
    console.error(`Error: ${error?.message || error}`);
    console.error(`Time: ${new Date().toISOString()}`);
    console.error('====================================');
    process.exit(1);
});
