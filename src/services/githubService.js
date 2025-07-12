const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const os = require('os');

exports.fetchRepoCode = async ({ repoUrl, localPath }) => {
  let repoPath = localPath;

  // Validate input
  if (!repoUrl && !localPath) {
    throw new Error('Either repoUrl or localPath must be provided');
  }

  if (repoUrl) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
    await simpleGit().clone(repoUrl, tmpDir, ['--depth', '1']);
    repoPath = tmpDir;
  }

  // Validate that repoPath exists
  if (!repoPath) {
    throw new Error('Repository path is undefined');
  }

  // Check if directory exists
  if (!fs.existsSync(repoPath)) {
    throw new Error(`Directory does not exist: ${repoPath}`);
  }

  const gatherFiles = (dir, files = []) => {
    try {
      for (const file of fs.readdirSync(dir)) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and other irrelevant directories
          if (!['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(file)) {
            gatherFiles(filePath, files);
          }
        } else {
          files.push(filePath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error.message);
    }
    return files;
  };

  const allFiles = gatherFiles(repoPath).filter(f => {
    const fileName = path.basename(f);
    const ext = path.extname(f).toLowerCase();
    
    // Skip unnecessary files
    const skipFiles = [
      'package-lock.json',
      'yarn.lock',
      '.gitignore',
      '.gitattributes',
      '.npmrc',
      '.yarnrc',
      'LICENSE',
      'CHANGELOG.md',
      'CONTRIBUTING.md'
    ];
    
    // Skip if it's in the skip list
    if (skipFiles.includes(fileName)) {
      return false;
    }
    
    // Only include relevant file types
    const allowedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.cs'];
    
    // Include package.json and README.md but not other json/md files
    if (fileName === 'package.json' || fileName.toLowerCase() === 'readme.md') {
      return true;
    }
    
    return allowedExtensions.includes(ext);
  });
  
  const results = [];
  for (const filePath of allFiles) {
    try {
      // Check file size before reading
      const stat = fs.statSync(filePath);
      if (stat.size > 2 * 1024 * 1024) { // Skip files larger than 2MB
        console.warn(`Skipping large file: ${filePath} (${stat.size} bytes)`);
        continue;
      }

      // Read file content with error handling
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Validate content
      if (typeof content === 'string' && content.length > 0) {
        results.push({ 
          path: filePath, 
          content: content.trim() 
        });
      } else {
        console.warn(`Skipping file with invalid content: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message);
      // Continue with other files
    }
  }

  console.log(`Successfully read ${results.length} out of ${allFiles.length} files`);
  return results;
};
