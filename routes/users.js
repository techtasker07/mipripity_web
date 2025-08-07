const express = require('express');
const { query } = require('../db');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (for profile viewing)
router.get('/:id', protect, async (req, res) => {
  try {
    const result = await query('SELECT id, first_name, last_name, email, phone_number, firebase_uid, profile_picture, created_at, updated_at FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user profile
// @access  Private (user can only update their own profile)
router.put('/:id', protect, async (req, res) => {
  const { first_name, last_name, email, phone_number, profile_picture } = req.body;
  const userId = req.params.id;

  if (parseInt(userId) !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Not authorized to update this user' });
  }

  try {
    const result = await query(
      `UPDATE users
       SET first_name = $1, last_name = $2, email = $3, phone_number = $4, profile_picture = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING id, first_name, last_name, email, phone_number, firebase_uid, profile_picture, created_at, updated_at`,
      [first_name, last_name, email, phone_number, profile_picture, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
