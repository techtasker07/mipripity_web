const express = require('express');
const { query } = require('../db');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/votes
// @desc    Get all votes (can be filtered by user_id or property_id)
// @access  Private (only logged-in users can see votes)
router.get('/', protect, async (req, res) => {
  const { user_id, property_id } = req.query;
  let queryText = `
    SELECT
      v.*,
      u.first_name AS voter_first_name,
      u.last_name AS voter_last_name,
      p.title AS property_title,
      vo.name AS vote_option_name
    FROM votes v
    JOIN users u ON v.user_id = u.id
    JOIN properties p ON v.property_id = p.id
    JOIN vote_options vo ON v.vote_option_id = vo.id
  `;
  const queryParams = [];
  const conditions = [];

  if (user_id) {
    conditions.push(`v.user_id = $${conditions.length + 1}`);
    queryParams.push(user_id);
  }
  if (property_id) {
    conditions.push(`v.property_id = $${conditions.length + 1}`);
    queryParams.push(property_id);
  }

  if (conditions.length > 0) {
    queryText += ` WHERE ${conditions.join(' AND ')}`;
  }

  queryText += ` ORDER BY v.created_at DESC`;

  try {
    const result = await query(queryText, queryParams);
    const votes = result.rows.map(v => ({
      ...v,
      voter_name: `${v.voter_first_name} ${v.voter_last_name}`,
    }));
    res.json({ success: true, data: votes, count: votes.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET /api/votes/property/:propertyId
// @desc    Get votes for a specific property
// @access  Private (only logged-in users can see votes)
router.get('/property/:propertyId', protect, async (req, res) => {
  try {
    const result = await query(
      `SELECT
         v.*,
         u.first_name AS voter_first_name,
         u.last_name AS voter_last_name,
         p.title AS property_title,
         vo.name AS vote_option_name
       FROM votes v
       JOIN users u ON v.user_id = u.id
       JOIN properties p ON v.property_id = p.id
       JOIN vote_options vo ON v.vote_option_id = vo.id
       WHERE v.property_id = $1
       ORDER BY v.created_at DESC`,
      [req.params.propertyId]
    );
    const votes = result.rows.map(v => ({
      ...v,
      voter_name: `${v.voter_first_name} ${v.voter_last_name}`,
    }));
    res.json({ success: true, data: votes, count: votes.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   POST /api/votes
// @desc    Create a new vote
// @access  Private
router.post('/', protect, async (req, res) => {
  const { property_id, vote_option_id } = req.body;
  const user_id = req.user.id;

  if (!property_id || !vote_option_id) {
    return res.status(400).json({ success: false, error: 'Please provide property_id and vote_option_id' });
  }

  try {
    // Check if user has already voted for this property
    const existingVote = await query('SELECT * FROM votes WHERE user_id = $1 AND property_id = $2', [user_id, property_id]);
    if (existingVote.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'You have already voted for this property' });
    }

    const result = await query(
      'INSERT INTO votes (user_id, property_id, vote_option_id) VALUES ($1, $2, $3) RETURNING *',
      [user_id, property_id, vote_option_id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
