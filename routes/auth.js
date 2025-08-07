const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
  const { first_name, last_name, email, password, phone_number } = req.body;

  if (!first_name || !last_name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Please enter all required fields' });
  }

  try {
    const userExists = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await query(
      'INSERT INTO users (first_name, last_name, email, password_hash, phone_number) VALUES ($1, $2, $3, $4, $5) RETURNING id, first_name, last_name, email, phone_number, created_at, updated_at',
      [first_name, last_name, email, hashedPassword, phone_number]
    );

    const user = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone_number: user.phone_number,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
        token: generateToken(user.id),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Please enter all fields' });
  }

  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (user && (await bcrypt.compare(password, user.password_hash))) {
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone_number: user.phone_number,
            created_at: user.created_at,
            updated_at: user.updated_at,
          },
          token: generateToken(user.id),
        },
      });
    } else {
      res.status(400).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

module.exports = router;
