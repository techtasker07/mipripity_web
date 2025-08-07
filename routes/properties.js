const express = require('express');
const { query } = require('../db');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Helper function to fetch property details with owner info, category, and vote count
const getPropertyDetails = async (propertyId) => {
  const propertyResult = await query(
    `SELECT
      p.*,
      u.first_name AS owner_first_name,
      u.last_name AS owner_last_name,
      u.email AS owner_email,
      u.phone_number AS owner_phone,
      c.name AS category_name,
      (SELECT COUNT(*) FROM votes WHERE property_id = p.id) AS vote_count
    FROM properties p
    JOIN users u ON p.user_id = u.id
    JOIN categories c ON p.category_id = c.id
    WHERE p.id = $1`,
    [propertyId]
  );

  if (propertyResult.rows.length === 0) {
    return null;
  }

  const property = propertyResult.rows[0];

  // Fetch images
  const imagesResult = await query('SELECT id, image_url, is_primary FROM property_images WHERE property_id = $1 ORDER BY is_primary DESC, id ASC', [propertyId]);
  property.images = imagesResult.rows;

  // Fetch vote options for the property's category
  const voteOptionsResult = await query('SELECT id, name FROM vote_options WHERE category_id = $1', [property.category_id]);
  property.vote_options = voteOptionsResult.rows;

  // Combine owner name
  property.owner_name = `${property.owner_first_name} ${property.owner_last_name}`;
  delete property.owner_first_name;
  delete property.owner_last_name;

  return property;
};

// @route   GET /api/properties
// @desc    Get all properties (with optional filters)
// @access  Public
router.get('/', async (req, res) => {
  const { category, user_id, limit, offset } = req.query;
  let queryText = `
    SELECT
      p.*,
      u.first_name AS owner_first_name,
      u.last_name AS owner_last_name,
      u.email AS owner_email,
      u.phone_number AS owner_phone,
      c.name AS category_name,
      (SELECT COUNT(*) FROM votes WHERE property_id = p.id) AS vote_count,
      (SELECT image_url FROM property_images WHERE property_id = p.id AND is_primary = TRUE LIMIT 1) AS primary_image_url
    FROM properties p
    JOIN users u ON p.user_id = u.id
    JOIN categories c ON p.category_id = c.id
  `;
  const queryParams = [];
  const conditions = [];

  if (category) {
    conditions.push(`c.name ILIKE $${conditions.length + 1}`);
    queryParams.push(category);
  }
  if (user_id) {
    conditions.push(`p.user_id = $${conditions.length + 1}`);
    queryParams.push(user_id);
  }

  if (conditions.length > 0) {
    queryText += ` WHERE ${conditions.join(' AND ')}`;
  }

  queryText += ` ORDER BY p.created_at DESC`;

  if (limit) {
    queryText += ` LIMIT $${conditions.length + 1}`;
    queryParams.push(limit);
  }
  if (offset) {
    queryText += ` OFFSET $${conditions.length + 1}`;
    queryParams.push(offset);
  }

  try {
    const result = await query(queryText, queryParams);
    const properties = result.rows.map(p => ({
      ...p,
      owner_name: `${p.owner_first_name} ${p.owner_last_name}`,
      images: p.primary_image_url ? [{ image_url: p.primary_image_url, is_primary: true }] : [],
    }));
    res.json({ success: true, data: properties, count: properties.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET /api/properties/:id
// @desc    Get single property by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const property = await getPropertyDetails(req.params.id);
    if (!property) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    res.json({ success: true, data: property });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   POST /api/properties
// @desc    Create a new property
// @access  Private
router.post('/', protect, async (req, res) => {
  const { title, description, location, category_id, current_worth, year_of_construction } = req.body;
  const user_id = req.user.id;

  if (!title || !description || !location || !category_id) {
    return res.status(400).json({ success: false, error: 'Please include all required fields' });
  }

  try {
    const result = await query(
      `INSERT INTO properties (title, description, location, user_id, category_id, current_worth, year_of_construction)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description, location, user_id, category_id, current_worth, year_of_construction]
    );
    const newProperty = result.rows[0];
    res.status(201).json({ success: true, data: newProperty });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   PUT /api/properties/:id
// @desc    Update a property
// @access  Private (owner only)
router.put('/:id', protect, async (req, res) => {
  const { title, description, location, category_id, current_worth, year_of_construction } = req.body;
  const propertyId = req.params.id;
  const userId = req.user.id;

  try {
    const propertyResult = await query('SELECT user_id FROM properties WHERE id = $1', [propertyId]);
    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    if (propertyResult.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this property' });
    }

    const result = await query(
      `UPDATE properties
       SET title = $1, description = $2, location = $3, category_id = $4, current_worth = $5, year_of_construction = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [title, description, location, category_id, current_worth, year_of_construction, propertyId]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   DELETE /api/properties/:id
// @desc    Delete a property
// @access  Private (owner only)
router.delete('/:id', protect, async (req, res) => {
  const propertyId = req.params.id;
  const userId = req.user.id;

  try {
    const propertyResult = await query('SELECT user_id FROM properties WHERE id = $1', [propertyId]);
    if (propertyResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Property not found' });
    }
    if (propertyResult.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this property' });
    }

    await query('DELETE FROM properties WHERE id = $1', [propertyId]);
    res.json({ success: true, message: 'Property deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET /api/properties/:id/stats
// @desc    Get voting statistics for a property
// @access  Public
router.get('/:id/stats', async (req, res) => {
  const propertyId = req.params.id;
  try {
    const totalVotesResult = await query('SELECT COUNT(*) FROM votes WHERE property_id = $1', [propertyId]);
    const total_votes = parseInt(totalVotesResult.rows[0].count, 10);

    const statsResult = await query(
      `SELECT
         vo.name AS option_name,
         vo.id AS vote_option_id,
         COUNT(v.id) AS vote_count
       FROM votes v
       JOIN vote_options vo ON v.vote_option_id = vo.id
       WHERE v.property_id = $1
       GROUP BY vo.id, vo.name
       ORDER BY vote_count DESC`,
      [propertyId]
    );

    const statistics = statsResult.rows.map(row => ({
      option_name: row.option_name,
      vote_option_id: row.vote_option_id,
      vote_count: parseInt(row.vote_count, 10),
      percentage: total_votes > 0 ? parseFloat(((parseInt(row.vote_count, 10) / total_votes) * 100).toFixed(2)) : 0,
    }));

    res.json({ success: true, data: { statistics, total_votes } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
