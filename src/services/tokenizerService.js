const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');

exports.tokenizeCode = async (files) => {
  const parser = new Parser();
  parser.setLanguage(JavaScript);

  const results = [];

  for (const file of files) {
    try {
      // Validate file content
      if (!file || !file.content || typeof file.content !== 'string') {
        console.warn(`Skipping file with invalid content: ${file?.path || 'unknown'}`);
        continue;
      }

      // Check if content is empty or too large
      if (file.content.length === 0) {
        console.warn(`Skipping empty file: ${file.path}`);
        continue;
      }

      if (file.content.length > 1000000) { // Skip files larger than 1MB
        console.warn(`Skipping large file: ${file.path} (${file.content.length} characters)`);
        continue;
      }

      // Try to parse the content
      const tree = parser.parse(file.content);
      
      if (!tree || !tree.rootNode) {
        console.warn(`Failed to parse file: ${file.path}`);
        continue;
      }

      results.push({
        content: file.content,
        path: file.path,
        tokens: tree.rootNode.toString()
      });

    } catch (error) {
      console.error(`Error tokenizing file ${file.path}:`, error.message);
      // Continue with other files instead of failing completely
      continue;
    }
  }

  if (results.length === 0) {
    throw new Error('No files could be successfully tokenized');
  }

  console.log(`Successfully tokenized ${results.length} out of ${files.length} files`);
  return results;
};
