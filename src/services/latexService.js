const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Check if LaTeX is available
const checkLatexAvailable = () => {
  return new Promise((resolve) => {
    exec('pdflatex --version', (error) => {
      resolve(!error);
    });
  });
};

function escapeLatex(text) {
  if (!text) return '';
  
  return text
    // Remove control characters first
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Handle special LaTeX characters (but be careful with LaTeX commands)
    .replace(/(?<!\\)_/g, '\\_')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/&/g, '\\&')
    // Handle quotes
    .replace(/"/g, "''")
    .replace(/'/g, "'")
    // Clean up any remaining problematic characters
    .replace(/[<>]/g, '')
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

function toLatexPath(p) {
  return p.replace(/\\/g, '/');
}

function convertTextToLatex(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  console.log('🔄 Converting text to LaTeX...');
  console.log('📝 Original text length:', text.length);
  
  // Split into major sections by looking for numbered headings
  const sections = text.split(/(?=^\d+\.\s+[A-Z])/m).filter(section => section.trim());
  let result = '';
  
  console.log('📑 Found', sections.length, 'sections');
  
  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
    const section = sections[sectionIndex];
    const lines = section.trim().split('\n');
    if (lines.length === 0) continue;
    
    console.log(`🔍 Processing section ${sectionIndex + 1} with ${lines.length} lines`);
    
    // Process each section
    let sectionResult = '';
    let inList = false;
    let listItems = [];
    let sectionStarted = false;
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        // End any open lists
        if (inList) {
          sectionResult += generateList(listItems, true);
          inList = false;
          listItems = [];
        }
        continue;
      }
      
      // Check for main section headings (1. Section Name)
      const mainSectionMatch = trimmedLine.match(/^(\d+)\.\s+([A-Z][^.]*?)$/);
      if (mainSectionMatch && !trimmedLine.includes(':') && trimmedLine.length < 50) {
        if (inList) {
          sectionResult += generateList(listItems, true);
          inList = false;
          listItems = [];
        }
        
        const sectionTitle = cleanTextForLatex(mainSectionMatch[2]);
        
        // Add newpage only if not the first section
        if (sectionStarted || sectionIndex > 0) {
          sectionResult += `\\newpage\n`;
        }
        sectionResult += `\\section{${sectionTitle}}\n\\vspace{0.5em}\n`;
        sectionStarted = true;
        continue;
      }
      
      // Check for subsection headings (Category Name:)
      const subsectionMatch = trimmedLine.match(/^([A-Z][^:]*):$/);
      if (subsectionMatch && trimmedLine.length < 80) {
        if (inList) {
          sectionResult += generateList(listItems, true);
          inList = false;
          listItems = [];
        }
        
        const subsectionTitle = cleanTextForLatex(subsectionMatch[1]);
        sectionResult += `\\vspace{0.4em}\n\\subsection*{${subsectionTitle}}\n\\vspace{0.2em}\n`;
        continue;
      }
      
      // Check for bullet points starting with dash (- Item text)
      const dashItemMatch = trimmedLine.match(/^-\s+(.+)$/);
      if (dashItemMatch) {
        const content = cleanTextForLatex(dashItemMatch[1]);
        
        if (!inList) {
          inList = true;
          listItems = [];
        }
        
        // Check if the next few lines are part of this item (continuation without dash)
        let fullContent = content;
        let nextLineIndex = lineIndex + 1;
        
        while (nextLineIndex < lines.length) {
          const nextLine = lines[nextLineIndex].trim();
          if (!nextLine) {
            nextLineIndex++;
            break;
          }
          
          // If next line starts with a dash, it's a new item
          if (/^-\s+/.test(nextLine)) {
            break;
          }
          
          // If next line starts with a number, it's a new numbered item
          if (/^\d+\./.test(nextLine)) {
            break;
          }
          
          // If next line looks like a section header, break
          if (/^[A-Z][^:]*:$/.test(nextLine) || /^\d+\.\s+[A-Z][^.]*?$/.test(nextLine)) {
            break;
          }
          
          // Add continuation content
          fullContent += ' ' + cleanTextForLatex(nextLine);
          nextLineIndex++;
        }
        
        // Skip the lines we've consumed
        lineIndex = nextLineIndex - 1;
        listItems.push(fullContent);
        continue;
      }
      
      // Check for numbered recommendations/items (1. Some recommendation...)
      const numberedItemMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
      if (numberedItemMatch) {
        const content = cleanTextForLatex(numberedItemMatch[2]);
        
        if (!inList) {
          inList = true;
          listItems = [];
        }
        
        // Check if the next few lines are part of this item (indented or continuation)
        let fullContent = content;
        let nextLineIndex = lineIndex + 1;
        
        while (nextLineIndex < lines.length) {
          const nextLine = lines[nextLineIndex].trim();
          if (!nextLine) {
            nextLineIndex++;
            break;
          }
          
          // If next line starts with a number, it's a new item
          if (/^\d+\./.test(nextLine)) {
            break;
          }
          
          // If next line looks like a section header, break
          if (/^[A-Z][^:]*:$/.test(nextLine) || /^\d+\.\s+[A-Z][^.]*?$/.test(nextLine)) {
            break;
          }
          
          // Add continuation content
          fullContent += ' ' + cleanTextForLatex(nextLine);
          nextLineIndex++;
        }
        
        listItems.push(fullContent);
        lineIndex = nextLineIndex - 1; // Skip processed lines
        continue;
      }
      
      // Check for bullet points (- Item text)
      const bulletMatch = trimmedLine.match(/^-\s+(.+)$/);
      if (bulletMatch) {
        const content = cleanTextForLatex(bulletMatch[1]);
        
        if (!inList) {
          inList = true;
          listItems = [];
        }
        listItems.push(content);
        continue;
      }
      
      // Regular paragraph content
      if (inList) {
        sectionResult += generateList(listItems, true); // numbered list
        inList = false;
        listItems = [];
      }
      
      const cleanedLine = cleanTextForLatex(trimmedLine);
      if (cleanedLine) {
        sectionResult += `\\noindent ${cleanedLine}\n\\vspace{0.4em}\n`;
      }
    }
    
    // Close any remaining lists
    if (inList) {
      sectionResult += generateList(listItems, true);
    }
    
    // Add some spacing between sections
    if (sectionResult && sectionIndex < sections.length - 1) {
      sectionResult += `\\vspace{0.5em}\n`;
    }
    
    result += sectionResult;
  }
  
  console.log('✅ Text conversion completed');
  return result;
}

function cleanTextForLatex(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // First remove any backticks and asterisks - we'll use plain text
  let cleaned = text
    .replace(/`([^`]+)`/g, '$1')  // Remove code backticks 
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold asterisks
    .replace(/\*([^*]+)\*/g, '$1')  // Remove italic asterisks
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')  // Remove control chars
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/_/g, '\\_')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/&/g, '\\&')
    .replace(/"/g, "''")
    .replace(/'/g, "'")
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
    
  return cleaned;
}

function cleanMarkdownFormatting(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    // Convert **bold** to \textbf{} - but escape the content first
    .replace(/\*\*(.*?)\*\*/g, (match, p1) => `\\textbf{${p1}}`)
    // Convert *italic* to \textit{} - but escape the content first  
    .replace(/\*(.*?)\*/g, (match, p1) => `\\textit{${p1}}`)
    // Convert `code` to \texttt{} - but escape the content first
    .replace(/`(.*?)`/g, (match, p1) => `\\texttt{${p1}}`)
    // Remove any remaining markdown artifacts
    .replace(/^\*+\s*/, '')
    .replace(/\*+$/, '')
    .trim();
}

function generateList(items, isNumbered = true) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return '';
  }
  
  const listType = isNumbered ? 'enumerate' : 'itemize';
  let result = `\\begin{${listType}}[leftmargin=1.5em, itemsep=0.4em, parsep=0.2em]\n`;
  
  for (const item of items) {
    if (item && typeof item === 'string' && item.trim()) {
      // Item is already cleaned by cleanTextForLatex
      result += `\\item ${item.trim()}\n`;
    }
  }
  
  result += `\\end{${listType}}\n\\vspace{0.5em}\n`;
  return result;
}

function generateDiagramSection(diagrams = []) {
  if (!diagrams.length) return '';
  const tempDir = path.join(__dirname, '../temp');
  let section = '\\newpage\n\\section{Workflow Diagrams}\n\\vspace{0.5em}\n';

  diagrams.forEach(({ title, png }, index) => {
    const filename = `diagram${index + 1}.png`;
    const filepath = path.join(tempDir, filename);
    fs.writeFileSync(filepath, png);
    const latexPath = toLatexPath(filepath);

    section += `
\\newpage
\\subsection{${cleanTextForLatex(title)}}
\\vspace{0.4em}
\\begin{center}
  \\fbox{\\includegraphics[width=0.9\\textwidth, height=0.8\\textheight, keepaspectratio]{${latexPath}}}
\\end{center}
\\vspace{0.5em}

`;
  });

  return section;
}

exports.generateLatexPdf = async (analysisText, diagrams = [], repoUrl = '') => {
  try {
    // Check if LaTeX is available
    const latexAvailable = await checkLatexAvailable();
    if (!latexAvailable) {
      throw new Error('LaTeX (pdflatex) not found. Please install LaTeX or the system will fallback to Puppeteer PDF generation.');
    }

    // Validate inputs
    if (!analysisText || typeof analysisText !== 'string') {
      throw new Error('Analysis text is required and must be a string');
    }

    console.log('📄 LaTeX generation started...');
    console.log(`📊 Analysis text length: ${analysisText.length} characters`);
    console.log(`🎨 Number of diagrams: ${diagrams ? diagrams.length : 0}`);

    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const texPath = path.join(tempDir, 'analysis.tex');
  const pdfPath = path.join(tempDir, 'analysis.pdf');

  const repoTitle = repoUrl
    ? repoUrl.split('/').slice(-2).join('/').replace(/\.git$/, '')
    : 'Code Analysis Report';

  const latexBody = convertTextToLatex(analysisText);
  const latexDiagrams = generateDiagramSection(diagrams);

  const latexDoc = `
\\documentclass[11pt, a4paper]{article}

% Essential packages
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{graphicx}
\\usepackage{geometry}
\\usepackage{titlesec}
\\usepackage[hidelinks]{hyperref}
\\usepackage{xcolor}
\\usepackage{fancyhdr}
\\usepackage{parskip}
\\usepackage{enumitem}
\\usepackage{listings}
\\usepackage{tcolorbox}
\\usepackage{multicol}
\\usepackage{booktabs}
\\usepackage{array}
\\usepackage[final,expansion=false]{microtype}

% Page geometry with better margins
\\geometry{
  top=1.2in,
  bottom=1.2in,
  left=1in,
  right=1in,
  headheight=15pt,
  headsep=25pt,
  footskip=30pt
}

% Color definitions
\\definecolor{primaryblue}{RGB}{25, 118, 210}
\\definecolor{secondaryblue}{RGB}{66, 165, 245}
\\definecolor{darkgray}{RGB}{55, 71, 79}
\\definecolor{lightgray}{RGB}{245, 245, 245}
\\definecolor{codebg}{RGB}{248, 249, 250}
\\definecolor{codeborder}{RGB}{218, 220, 224}
\\definecolor{accentcolor}{RGB}{255, 87, 34}

% Advanced section formatting
\\titleformat{\\section}[block]
  {\\LARGE\\bfseries\\color{primaryblue}}
  {\\thesection}
  {1em}
  {}
  [\\vspace{0.2em}{\\color{primaryblue}\\titlerule[1.5pt]}\\vspace{0.5em}]

\\titleformat{\\subsection}[block]
  {\\Large\\bfseries\\color{darkgray}}
  {\\thesubsection}
  {0.8em}
  {}
  [\\vspace{0.1em}{\\color{secondaryblue}\\titlerule[0.8pt]}\\vspace{0.3em}]

\\titleformat{\\subsubsection}[block]
  {\\large\\bfseries\\color{darkgray}}
  {\\thesubsubsection}
  {0.5em}
  {}

% Spacing adjustments
\\titlespacing*{\\section}{0pt}{2.5ex plus 1ex minus .2ex}{1.8ex plus .2ex}
\\titlespacing*{\\subsection}{0pt}{2ex plus 1ex minus .2ex}{1.2ex plus .2ex}
\\titlespacing*{\\subsubsection}{0pt}{1.5ex plus 1ex minus .2ex}{0.8ex plus .2ex}

% Enhanced header and footer
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{\\textcolor{darkgray}{\\small Code Analysis Report}}
\\fancyhead[R]{\\textcolor{darkgray}{\\small ${cleanTextForLatex(repoTitle)}}}
\\fancyfoot[C]{\\textcolor{darkgray}{\\thepage}}
\\renewcommand{\\headrulewidth}{0.4pt}
\\renewcommand{\\footrulewidth}{0pt}

% List styling
\\setlist[itemize]{
  leftmargin=1.2em,
  itemsep=0.3em,
  parsep=0.1em,
  topsep=0.4em,
  partopsep=0.2em
}

\\setlist[enumerate]{
  leftmargin=1.2em,
  itemsep=0.3em,
  parsep=0.1em,
  topsep=0.4em,
  partopsep=0.2em
}

% Code listing configuration
\\lstset{
  basicstyle=\\ttfamily\\footnotesize,
  backgroundcolor=\\color{codebg},
  frame=single,
  rulecolor=\\color{codeborder},
  framerule=0.8pt,
  framexleftmargin=3pt,
  framexrightmargin=3pt,
  framextopmargin=3pt,
  framexbottommargin=3pt,
  breaklines=true,
  breakatwhitespace=true,
  showstringspaces=false,
  tabsize=2,
  captionpos=b,
  aboveskip=0.8em,
  belowskip=0.8em
}

% Enhanced paragraph spacing
\\setlength{\\parskip}{0.6em}
\\setlength{\\parindent}{0pt}

% Table of contents styling
\\renewcommand{\\contentsname}{\\color{primaryblue}\\Large Table of Contents}
\\setcounter{tocdepth}{1}  % Only show sections, not subsections
\\setcounter{secnumdepth}{2}  % Number sections and subsections

\\begin{document}

% Professional title page
\\begin{titlepage}
  \\centering
  
  % Header with accent
  \\vspace*{1.5cm}
  {\\color{accentcolor}\\rule{\\textwidth}{3pt}}
  \\vspace{0.5cm}
  
  % Main title
  {\\Huge\\bfseries\\color{primaryblue}Code Analysis Report\\par}
  \\vspace{0.3cm}
  {\\color{accentcolor}\\rule{0.6\\textwidth}{1pt}}
  \\vspace{1.5cm}
  
  % Subtitle
  {\\LARGE\\color{darkgray}\\textit{${cleanTextForLatex(repoTitle)}}\\par}
  \\vspace{0.8cm}
  
  % Description box
  \\begin{tcolorbox}[
    colback=lightgray,
    colframe=primaryblue,
    boxrule=1pt,
    arc=3pt,
    width=0.85\\textwidth,
    center
  ]
    \\large\\textbf{Comprehensive Code Analysis \\\\ Architecture Review \\& Recommendations}
  \\end{tcolorbox}
  
  \\vfill
  
  % Bottom section
  \\begin{minipage}{0.8\\textwidth}
    \\centering
    \\large
    \\textbf{Generated on:} \\today \\\\[0.3cm]
    \\textcolor{darkgray}{Automated Code Analysis System}
  \\end{minipage}
  
  \\vspace{1cm}
  {\\color{accentcolor}\\rule{\\textwidth}{3pt}}
\\end{titlepage}

% Table of contents with better spacing
\\tableofcontents
\\vspace{1em}
\\newpage

% Main content
${latexBody}

% Diagrams section
${latexDiagrams}

% Footer page
\\newpage
\\thispagestyle{empty}
\\vspace*{\\fill}
\\begin{center}
  \\begin{tcolorbox}[
    colback=lightgray,
    colframe=primaryblue,
    boxrule=2pt,
    arc=5pt,
    width=0.8\\textwidth
  ]
    \\centering
    \\Large\\textbf{End of Report} \\\\[0.5cm]
    \\large\\textcolor{darkgray}{Thank you for using our Code Analysis System} \\\\[0.3cm]
    \\textcolor{primaryblue}{\\textbf{Generated on \\today}}
  \\end{tcolorbox}
\\end{center}
\\vspace*{\\fill}

\\end{document}
`;

  fs.writeFileSync(texPath, latexDoc);

  return new Promise((resolve, reject) => {
    // Run pdflatex twice for proper references and TOC
    exec(`pdflatex -interaction=nonstopmode -output-directory="${tempDir}" "${texPath}"`, (err1, stdout1, stderr1) => {
      exec(`pdflatex -interaction=nonstopmode -output-directory="${tempDir}" "${texPath}"`, (err2, stdout2, stderr2) => {
        if (!fs.existsSync(pdfPath)) {
          console.error('❌ LaTeX stdout:', stdout2);
          console.error('❌ LaTeX stderr:', stderr2);
          return reject('PDF generation failed.');
        }

        if (err2) {
          console.warn('⚠ LaTeX finished with warnings:', err2.message);
        }

        const pdfBuffer = fs.readFileSync(pdfPath);

        // Clean up temporary files
        ['.aux', '.log', '.out', '.tex', '.toc', '.fls', '.fdb_latexmk'].forEach(ext => {
          const file = path.join(tempDir, `analysis${ext}`);
          if (fs.existsSync(file)) fs.unlinkSync(file);
        });

        // Clean up diagram files
        diagrams.forEach((_, index) => {
          const diagramFile = path.join(tempDir, `diagram${index + 1}.png`);
          if (fs.existsSync(diagramFile)) fs.unlinkSync(diagramFile);
        });

        resolve(pdfBuffer);
      });
    });
  });
  } catch (error) {
    console.error('❌ LaTeX PDF generation error:', error.message);
    throw error;
  }
};