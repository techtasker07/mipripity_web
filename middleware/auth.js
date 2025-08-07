const jwt = require('jsonwebtoken');
const { query } = require('../db');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const result = await query('SELECT id, first_name, last_name, email, phone_number, firebase_uid, profile_picture, created_at, updated_at FROM users WHERE id = $1', [decoded.id]);
      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, error: 'Not authorized, user not found' });
      }
      req.user = result.rows[0];
      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ success: false, error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ success: false, error: 'Not authorized, no token' });
  }
};

module.exports = { protect };
