const express = require('express');
const { query } = require('../db');

const router = express.Router();

// @route   GET /api/stats/platform
// @desc    Get platform-wide statistics
// @access  Public
router.get('/platform', async (req, res) => {
  try {
    const totalUsersResult = await query('SELECT COUNT(*) FROM users');
    const totalPropertiesResult = await query('SELECT COUNT(*) FROM properties');
    const totalVotesResult = await query('SELECT COUNT(*) FROM votes');
    const totalImagesResult = await query('SELECT COUNT(*) FROM property_images');
    const totalProspectPropertiesResult = await query('SELECT COUNT(*) FROM prospect_properties');

    // Fetch recent activity (e.g., last 5 properties added)
    const recentActivityResult = await query(
      `SELECT
         p.id, p.title, p.created_at, 'property_added' as type,
         u.first_name, u.last_name
       FROM properties p
       JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC
       LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        total_users: parseInt(totalUsersResult.rows[0].count, 10),
        total_properties: parseInt(totalPropertiesResult.rows[0].count, 10),
        total_votes: parseInt(totalVotesResult.rows[0].count, 10),
        total_images: parseInt(totalImagesResult.rows[0].count, 10),
        total_prospect_properties: parseInt(totalProspectPropertiesResult.rows[0].count, 10),
        recent_activity: recentActivityResult.rows.map(row => ({
          ...row,
          user_name: `${row.first_name} ${row.last_name}`
        })),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
