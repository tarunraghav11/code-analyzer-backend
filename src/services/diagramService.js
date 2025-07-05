const { generatePlantUmlPng } = require('../utils/plantumlRenderer');

exports.generateDiagrams = async (umlBlocks = []) => {
  const diagrams = [];

  console.log(`🎨 Starting diagram generation for ${umlBlocks.length} blocks...`);

  for (let i = 0; i < umlBlocks.length; i++) {
    const block = umlBlocks[i].trim();
    if (!block || !block.includes('@startuml')) {
      console.warn(`⚠️ Skipping invalid UML block ${i + 1}`);
      continue;
    }

    try {
      console.log(`🔄 Processing diagram ${i + 1}...`);
      
      // Extract title from the block
      const lines = block.split('\n').map(line => line.trim());
      const titleMatch = lines.find(line => /^title\s+["\']?([^"\']+)["\']?/i.test(line));
      
      let title = `UML Diagram ${i + 1}`;
      if (titleMatch) {
        const match = titleMatch.match(/^title\s+["\']?([^"\']+)["\']?/i);
        if (match) {
          title = match[1].trim();
        }
      }

      console.log(`📋 Diagram title: "${title}"`);
      console.log(`📝 Block content:\n${block}`);

      // Attempt to generate PNG
      const png = await generatePlantUmlPng(block);
      
      if (png && png.length > 500) {
        console.log(`✅ Successfully generated diagram ${i + 1}: "${title}" (${png.length} bytes)`);
        diagrams.push({ title, png });
      } else {
        console.warn(`❌ Failed to generate diagram ${i + 1}: "${title}" - PNG too small or null`);
        
        // Log the block that failed for debugging
        console.log(`🔍 Failed block content:\n${block}`);
      }
    } catch (err) {
      console.error(`❌ Error generating diagram ${i + 1}:`, err.message);
      console.error(`🔍 Block that caused error:\n${block}`);
    }
  }

  console.log(`🎨 Diagram generation complete: ${diagrams.length}/${umlBlocks.length} successful`);
  return diagrams;
};
