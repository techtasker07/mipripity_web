const express = require('express');
const { query } = require('../db');

const router = express.Router();

// @route   GET /api/vote_options
// @desc    Get all vote options
// @access  Public
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT vo.*, c.name AS category_name FROM vote_options vo JOIN categories c ON vo.category_id = c.id ORDER BY vo.name');
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET /api/vote_options/category/:categoryId
// @desc    Get vote options by category ID
// @access  Public
router.get('/category/:categoryId', async (req, res) => {
  try {
    const result = await query('SELECT id, name FROM vote_options WHERE category_id = $1 ORDER BY name', [req.params.categoryId]);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
