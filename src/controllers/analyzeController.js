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

    // Validate input
    if (!repoUrl && !localPath) {
      return res.status(400).json({ 
        error: 'Missing required parameter',
        message: 'Either repoUrl or localPath must be provided'
      });
    }

    console.log('Starting analysis for:', repoUrl || localPath);

    const rawCode = await fetchRepoCode({ repoUrl, localPath });
    
    if (!rawCode || rawCode.length === 0) {
      return res.status(400).json({ 
        error: 'No analyzable files found',
        message: 'The repository contains no supported file types'
      });
    }

    console.log(`Found ${rawCode.length} files to analyze`);

    const tokens = await tokenizeCode(rawCode);
    const vectorStore = await generateEmbeddings(tokens);
    const contextChunks = await retrieveRelevantChunks(vectorStore, 'analyze the codebase');

    const { analysisText, umlBlocks } = await runRAG(contextChunks);
    const diagrams = await generateDiagrams(umlBlocks);

    let pdfBuffer;
    
    try {
      // Try LaTeX first (better quality)
      console.log('📄 Attempting PDF generation with LaTeX...');
      pdfBuffer = await generateLatexPdf(analysisText, diagrams, repoUrl || localPath);
    } catch (latexError) {
      console.warn('⚠️ LaTeX PDF generation failed, falling back to Puppeteer...');
      console.warn('LaTeX error:', latexError.message);
      
      // Fallback to Puppeteer PDF
      const { generatePdf } = require('../services/pdfService');
      pdfBuffer = await generatePdf(analysisText, diagrams, repoUrl || localPath);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=analysis.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
