const { GoogleGenerativeAIEmbeddings } = require ("@langchain/google-genai");
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const { Document } = require('langchain/document');

const embedder = new GoogleGenerativeAIEmbeddings({ apiKey: process.env.GOOGLE_API_KEY });

exports.generateEmbeddings = async (tokenizedDocs) => {
  const docs = tokenizedDocs.map(f =>
    new Document({ pageContent: f.content, metadata: { source: f.path } })
  );
  return await MemoryVectorStore.fromDocuments(docs, embedder);
};

exports.retrieveRelevantChunks = async (vectorStore, query) => {
  const results = await vectorStore.similaritySearch(query, 5);
  return results.map(r => r.pageContent).join('\n\n');
};
