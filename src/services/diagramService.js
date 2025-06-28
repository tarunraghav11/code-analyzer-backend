const { generatePlantUmlPng } = require('../utils/plantumlRenderer');

exports.generateDiagrams = async (umlBlocks = []) => {
  const diagrams = [];

  for (let i = 0; i < umlBlocks.length; i++) {
    const block = umlBlocks[i].trim();
    if (!block || !block.includes('@startuml')) continue;

    try {
      const lines = block.split('\n').map(line => line.trim());
      const contentLines = lines.slice(1, lines.indexOf('@enduml') || lines.length);

      const label = contentLines.find(line => /^[a-zA-Z0-9\s\-_:]+;$/.test(line));
      const title = label
        ? label.replace(/[:;]/g, '').trim()
        : `UML Diagram ${i + 1}`;

      const png = await generatePlantUmlPng(block);
      if (png && png.length > 500) {
        diagrams.push({ title, png });
      }
    } catch (err) {
      console.warn(`❌ Failed to generate diagram ${i + 1}:`, err.message);
    }
  }

  return diagrams;
};
