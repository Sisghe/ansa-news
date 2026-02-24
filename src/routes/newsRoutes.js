const express = require('express');
const { getNews, healthCheck } = require('../controllers/newsController');

const router = express.Router();

router.get('/health', healthCheck);
router.get('/news', getNews);

module.exports = router;
