const express = require('express');
const { query } = require('../db');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Helper function to get prospect property details with category name
const getProspectPropertyDetails = async (prospectId) => {
  const result = await query(
    `SELECT pp.*, c.name AS category_name
     FROM prospect_properties pp
     JOIN categories c ON pp.category_id = c.id
     WHERE pp.id = $1`,
    [prospectId]
  );
  return result.rows.length > 0 ? result.rows[0] : null;
};

// Mock AI analysis function
const mockAIAnalysis = (property) => {
  const insights = [
    "This property shows strong potential for capital appreciation due to its location.",
    "Consider this property for long-term rental income, as demand in this area is stable.",
    "The estimated worth aligns with market trends, suggesting a fair valuation.",
    "Further due diligence on local zoning laws is recommended for this land prospect.",
    "The year of construction indicates potential for renovation projects to increase value.",
    "This commercial property could benefit from a strategic marketing overhaul.",
    "AI suggests exploring alternative uses for this material property to maximize returns.",
    "The property's description highlights unique features that could attract niche buyers.",
    "Market analysis indicates a slight undervaluation, presenting a good buying opportunity.",
    "Environmental factors should be thoroughly assessed before development.",
    "This prospect is ideal for a quick flip given current market conditions.",
    "The property's proximity to amenities enhances its appeal for residential development.",
    "AI predicts a moderate risk due to fluctuating material costs in the region.",
    "Consider a mixed-use development approach for this commercial land.",
    "The property's historical significance might add to its value, but also to renovation costs.",
  ];

  const recommendations = [
    "Conduct a detailed feasibility study.",
    "Engage with local community planners.",
    "Obtain multiple appraisals.",
    "Explore financing options tailored to this property type.",
    "Develop a comprehensive marketing strategy.",
    "Assess environmental impact.",
    "Consider a joint venture for development.",
    "Review recent comparable sales in the area.",
    "Investigate potential tax incentives.",
    "Perform a structural integrity assessment.",
  ];

  const categorySpecificInsights = {
    'Residential': [
      "Excellent for family living due to nearby schools.",
      "Potential for high rental yield in student housing.",
      "Requires minor cosmetic updates for optimal market appeal.",
    ],
    'Commercial': [
      "High foot traffic area, suitable for retail.",
      "Good for office space, but parking might be a concern.",
      "Consider converting to a co-working space.",
    ],
    'Land': [
      "Prime location for agricultural development.",
      "Suitable for solar farm installation.",
      "Potential for subdivision into multiple plots.",
    ],
    'Material': [
      "High demand for this material in construction.",
      "Logistics for transport need careful planning.",
      "Consider processing this material further for higher value.",
    ]
  };

  const selectedInsights = random.sample(insights, random.randint(2, 4));
  if (property.category_name && categorySpecificInsights[property.category_name]) {
    selectedInsights.push(random.choice(categorySpecificInsights[property.category_name]));
  }
  
  const selectedRecommendations = random.sample(recommendations, random.randint(1, 3));

  return {
    overall_sentiment: random.choice(['Positive', 'Neutral', 'Negative']),
    confidence_score: parseFloat(random.uniform(0.6, 0.99).toFixed(2)),
    key_insights: selectedInsights,
    strategic_recommendations: selectedRecommendations,
    risk_factors: random.choice([
      "Market volatility",
      "Regulatory changes",
      "Environmental concerns",
      "Economic downturn",
      "Competition",
      "None identified"
    ]),
    estimated_roi: `${(random.uniform(5, 30)).toFixed(1)}%`,
    last_analyzed: new Date().toISOString(),
  };
};

// @route   GET /api/prospect_properties
// @desc    Get all prospect properties (accessible to logged-in users)
// @access  Private (for full details), Public (for preview)
router.get('/', async (req, res) => {
  const { limit, offset, category } = req.query;
  let queryText = `
    SELECT pp.*, c.name AS category_name
    FROM prospect_properties pp
    JOIN categories c ON pp.category_id = c.id
  `;
  const queryParams = [];
  const conditions = [];

  if (category) {
    conditions.push(`c.name ILIKE $${conditions.length + 1}`);
    queryParams.push(category);
  }

  if (conditions.length > 0) {
    queryText += ` WHERE ${conditions.join(' AND ')}`;
  }

  queryText += ` ORDER BY pp.created_at DESC`;

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
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   GET /api/prospect_properties/:id
// @desc    Get single prospect property by ID with AI analysis (accessible to logged-in users)
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const prospectProperty = await getProspectPropertyDetails(req.params.id);
    if (!prospectProperty) {
      return res.status(404).json({ success: false, error: 'Prospect property not found' });
    }

    // Perform mock AI analysis
    const aiAnalysis = mockAIAnalysis(prospectProperty);
    prospectProperty.ai_analysis = aiAnalysis;

    res.json({ success: true, data: prospectProperty });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// @route   POST /api/prospect_properties
// @desc    Create a new prospect property (accessible to logged-in users)
// @access  Private
router.post('/', protect, async (req, res) => {
  const { title, description, location, category_id, estimated_worth, year_of_construction, image_url } = req.body;

  if (!title || !description || !location || !category_id) {
    return res.status(400).json({ success: false, error: 'Please include all required fields' });
  }

  try {
    const result = await query(
      `INSERT INTO prospect_properties (title, description, location, category_id, estimated_worth, year_of_construction, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, description, location, category_id, estimated_worth, year_of_construction, image_url]
    );
    const newProspect = result.rows[0];
    res.status(201).json({ success: true, data: newProspect });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
