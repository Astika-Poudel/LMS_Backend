const express = require('express');
require('dotenv').config();
const path = require('path'); 
const connectDB = require('./config/db');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors()); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


connectDB();

app.get('/', (req, res) => {
  res.send('Hello, this is the backend server!');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
