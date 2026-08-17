const chokidar = require('chokidar');
const path = require('path');
const { executeImport } = require('./importPipeline');
const { getWatchIncomingDirs } = require('./importIndicatorRegistry');

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
    const incomingDirs = getWatchIncomingDirs();
    console.log(`[ImportWatcher] Khởi động giám sát thư mục: ${incomingDirs.join(', ')}`);
    
    const watcher = chokidar.watch(incomingDirs, {
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
