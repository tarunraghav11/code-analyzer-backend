const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

exports.analyzeCode = async (code) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `
You're a professional code reviewer. Analyze this codebase:
${code}

Provide a high-level summary, code structure, notable patterns, and any possible improvements.
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
};
