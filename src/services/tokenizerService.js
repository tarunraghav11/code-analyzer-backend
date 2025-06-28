const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');

exports.tokenizeCode = async (files) => {
  const parser = new Parser();
  parser.setLanguage(JavaScript);

  return files.map(file => {
    const tree = parser.parse(file.content);
    return {
      content: file.content,
      path: file.path,
      tokens: tree.rootNode.toString()
    };
  });
};
