const express = require('express');
const router = express.Router();
const { getComprehensiveReports } = require('../controllers/reportsController');

// GET /api/reports/analytics
router.get('/analytics', getComprehensiveReports);

module.exports = router;
