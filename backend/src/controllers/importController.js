const { processImport } = require('../services/importService');
const fs = require('fs');

async function handleImport(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded' });
        }

        const filename = req.file.originalname;
        const fileBuffer = fs.readFileSync(req.file.path);

        const result = await processImport(filename, fileBuffer);

        // Clean up the uploaded file to save space (since we stored it in DB)
        // In a real scenario we might keep it, but for now we clean up.
        fs.unlinkSync(req.file.path);

        res.json(result);
    } catch (error) {
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = {
    handleImport
};
