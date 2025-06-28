require('dotenv').config();

const envConfig = {
    PORT: process.env.PORT || 3000,
    GITHUB_API_KEY: process.env.GITHUB_API_KEY,
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
};

module.exports = envConfig;