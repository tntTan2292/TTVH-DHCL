const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const adminUserController = require('../controllers/adminUserController');

const router = express.Router();
const adminOnly = [requireAuth, requireRole(['admin'])];

router.get('/', ...adminOnly, adminUserController.list);
router.post('/', ...adminOnly, adminUserController.create);
router.put('/:id', ...adminOnly, adminUserController.update);
router.post('/:id/reset-password', ...adminOnly, adminUserController.resetPassword);
router.post('/:id/unlock', ...adminOnly, adminUserController.unlock);

module.exports = router;
