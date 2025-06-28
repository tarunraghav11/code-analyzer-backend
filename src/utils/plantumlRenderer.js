const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

exports.generatePlantUmlPng = async (plantUmlCode) => {
  const tempDir = os.tmpdir();
  const umlFilePath = path.join(tempDir, `diagram-${Date.now()}.puml`);
  const pngFilePath = umlFilePath.replace('.puml', '.png');

  fs.writeFileSync(umlFilePath, plantUmlCode, 'utf-8');

  return await new Promise((resolve, reject) => {
    const child = spawn('java', [
      '-jar',
      path.resolve('./plantuml.jar'),
      '-tpng', // ✅ use PNG
      umlFilePath,
    ]);

    child.stderr.on('data', (data) => {
      console.error('❗ PlantUML stderr:', data.toString());
    });

    child.on('close', (code) => {
      if (code === 0 && fs.existsSync(pngFilePath)) {
        const imageBuffer = fs.readFileSync(pngFilePath);
        fs.unlinkSync(umlFilePath);
        fs.unlinkSync(pngFilePath);
        resolve(imageBuffer);
      } else {
        reject(new Error('PlantUML PNG generation failed'));
      }
    });
  });
};
