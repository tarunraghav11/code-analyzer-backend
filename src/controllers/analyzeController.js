const { fetchRepoCode } = require('../services/githubService');
const { tokenizeCode } = require('../services/tokenizerService');
const { generateEmbeddings, retrieveRelevantChunks } = require('../services/embeddingService');
const { runRAG } = require('../services/ragService');
const { generateDiagrams } = require('../services/diagramService');
const { generatePdf } = require('../services/pdfService');

const { generateLatexPdf } = require('../services/latexService');

exports.analyzeRepo = async (req, res) => {
  try {
    const { repoUrl, localPath } = req.body;

    const rawCode = await fetchRepoCode({ repoUrl, localPath });
    const tokens = await tokenizeCode(rawCode);
    const vectorStore = await generateEmbeddings(tokens);
    const contextChunks = await retrieveRelevantChunks(vectorStore, 'analyze the codebase');

    const { analysisText, umlBlocks } = await runRAG(contextChunks);
    const diagrams = await generateDiagrams(umlBlocks);

    const pdfBuffer = await generateLatexPdf(analysisText, diagrams, repoUrl);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=analysis.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    res.status(500).json({ error: 'Internal analysis error' });
  }
};
