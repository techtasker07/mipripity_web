const express = require('express');
const { query } = require('../db');

const router = express.Router();

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM categories ORDER BY name');
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
