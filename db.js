const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DB_EXTERNAL_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: {
    rejectUnauthorized: false, // Required for Render's managed PostgreSQL
  },
});

const connectDB = async () => {
  try {
    await pool.connect();
    console.log('PostgreSQL connected...');
  } catch (err) {
    console.error(err.message);
    process.exit(1); // Exit process with failure
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  connectDB,
};
