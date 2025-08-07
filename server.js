const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const propertyRoutes = require('./routes/properties');
const voteRoutes = require('./routes/votes');
const categoryRoutes = require('./routes/categories');
const voteOptionRoutes = require('./routes/voteOptions');
const statsRoutes = require('./routes/stats');
const prospectPropertyRoutes = require('./routes/prospectProperties');

dotenv.config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'https://6894f278f150c2e983413c0b--mipripityapp.netlify.app/', // Allow your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

app.use(express.json()); // For parsing application/json

// Connect to Database
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/vote_options', voteOptionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/prospect_properties', prospectPropertyRoutes); // New prospect properties route

// Basic health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Backend is healthy!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Something went wrong!',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
