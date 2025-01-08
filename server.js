const express = require('express');
require('dotenv').config();
const connectDB = require('./config/db');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Connect to database
connectDB();

// Test Route
app.get('/', (req, res) => {
  res.send('Hello, this is the backend server!');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
