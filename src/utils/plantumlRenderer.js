const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Check if Java is available
const checkJavaAvailable = () => {
  return new Promise((resolve) => {
    const child = spawn('java', ['-version']);
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
  });
};

exports.generatePlantUmlPng = async (plantUmlCode) => {
  try {
    // Check if Java is available
    const javaAvailable = await checkJavaAvailable();
    if (!javaAvailable) {
      console.warn('⚠️ Java not found. Skipping diagram generation. Install Java to enable UML diagrams.');
      return null;
    }

    const tempDir = os.tmpdir();
    const umlFilePath = path.join(tempDir, `diagram-${Date.now()}.puml`);
    const pngFilePath = umlFilePath.replace('.puml', '.png');

    // Log the PlantUML code being processed
    console.log('🔍 Processing PlantUML code:');
    console.log(plantUmlCode);

    fs.writeFileSync(umlFilePath, plantUmlCode, 'utf-8');

    return await new Promise((resolve, reject) => {
      let stderrOutput = '';
      
      const child = spawn('java', [
        '-jar',
        path.resolve('./plantuml.jar'),
        '-tpng', // ✅ use PNG
        '-charset', 'UTF-8',
        '-failfast2', // Fail fast on syntax errors
        umlFilePath,
      ]);

      child.stderr.on('data', (data) => {
        const errorText = data.toString();
        stderrOutput += errorText;
        console.error('❗ PlantUML stderr:', errorText);
      });

      child.stdout.on('data', (data) => {
        console.log('📄 PlantUML stdout:', data.toString());
      });

      child.on('error', (error) => {
        console.error('❌ PlantUML execution error:', error.message);
        // Clean up temp file
        if (fs.existsSync(umlFilePath)) {
          fs.unlinkSync(umlFilePath);
        }
        resolve(null); // Return null instead of rejecting
      });

      child.on('close', (code) => {
        try {
          console.log(`🔧 PlantUML process finished with exit code: ${code}`);
          
          if (code === 0 && fs.existsSync(pngFilePath)) {
            const imageBuffer = fs.readFileSync(pngFilePath);
            
            // Validate the generated image
            if (imageBuffer && imageBuffer.length > 100) {
              console.log(`✅ Successfully generated PNG (${imageBuffer.length} bytes)`);
              // Clean up temp files
              if (fs.existsSync(umlFilePath)) fs.unlinkSync(umlFilePath);
              if (fs.existsSync(pngFilePath)) fs.unlinkSync(pngFilePath);
              resolve(imageBuffer);
            } else {
              console.warn('⚠️ Generated PNG is too small or corrupted');
              if (fs.existsSync(umlFilePath)) fs.unlinkSync(umlFilePath);
              if (fs.existsSync(pngFilePath)) fs.unlinkSync(pngFilePath);
              resolve(null);
            }
          } else {
            console.warn(`⚠️ PlantUML failed with code ${code}`);
            if (stderrOutput) {
              console.warn('❌ Error details:', stderrOutput);
            }
            // Clean up temp file
            if (fs.existsSync(umlFilePath)) fs.unlinkSync(umlFilePath);
            if (fs.existsSync(pngFilePath)) fs.unlinkSync(pngFilePath);
            resolve(null);
          }
        } catch (cleanupError) {
          console.error('Error during cleanup:', cleanupError.message);
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error('❌ PlantUML generation error:', error.message);
    return null;
  }
};
