
require('dotenv').config();
const express = require('express');
const app = express();
const analyzeRoute = require('./src/routes/analyzeRoute');

app.use(express.json());
app.use('/api/analyze', analyzeRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
