const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');
const os = require('os');

exports.fetchRepoCode = async ({ repoUrl, localPath }) => {
  let repoPath = localPath;

  if (repoUrl) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-'));
    await simpleGit().clone(repoUrl, tmpDir, ['--depth', '1']);
    repoPath = tmpDir;
  }

  const gatherFiles = (dir, files = []) => {
    for (const file of fs.readdirSync(dir)) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        gatherFiles(filePath, files);
      } else {
        files.push(filePath);
      }
    }
    return files;
  };

  const allFiles = gatherFiles(repoPath).filter(f => /\.(js|ts|py|java|cpp|cs)$/.test(f));
  return allFiles.map(f => ({ path: f, content: fs.readFileSync(f, 'utf-8') }));
};
