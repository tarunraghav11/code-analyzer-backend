const express = require('express');
const router = express.Router();
const analyzeController = require('../controllers/analyzeController');

router.post('/', analyzeController.analyzeRepo);

module.exports = router;
