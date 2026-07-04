const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const { executeImport, BASE_INCOMING } = require('./importPipeline');

// We can rely on BASE_INCOMING from importPipeline but chokidar needs the path
// so we will just use BASE_INCOMING directly for the watcher.
const INCOMING_DIR = BASE_INCOMING;

class ImportQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
    }

    add(filePath) {
        this.queue.push(filePath);
        this.processNext();
    }

    async processNext() {
        if (this.isProcessing || this.queue.length === 0) return;
        
        this.isProcessing = true;
        const filePath = this.queue.shift();
        
        try {
            console.log(`[ImportQueue] Bắt đầu xử lý: ${filePath}`);
            
            await executeImport({ filePath, forceReimport: true, source: 'AUTO' });
        } catch (error) {
            console.error(`[ImportQueue] Lỗi nghiêm trọng khi xử lý ${filePath}:`, error);
        } finally {
            this.isProcessing = false;
            // Xử lý TUẦN TỰ file tiếp theo
            this.processNext();
        }
    }
}

const importQueue = new ImportQueue();

function startWatcher() {
    console.log(`[ImportWatcher] Khởi động giám sát thư mục: ${INCOMING_DIR}`);
    
    const watcher = chokidar.watch(INCOMING_DIR, {
        persistent: true,
        ignoreInitial: false, // Quét cả file đã có sẵn khi khởi động
        awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 100
        }
    });

    watcher.on('add', (filePath) => {
        // Chỉ bắt file xlsx (các file rác, temp xlsx như ~$file.xlsx sẽ bị filter ở processor)
        if (filePath.endsWith('.xlsx') && !path.basename(filePath).startsWith('~$')) {
            console.log(`[ImportWatcher] Phát hiện file mới: ${filePath}`);
            importQueue.add(filePath);
        }
    });

    watcher.on('error', error => console.error(`[ImportWatcher] Lỗi: ${error}`));
}

module.exports = {
    startWatcher
};
