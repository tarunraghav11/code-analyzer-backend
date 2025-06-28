const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function escapeLatex(text) {
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control chars
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/_/g, '\\_')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\^/g, '\\^{}')
    .replace(/~/g, '\\~{}')
    .replace(/&/g, '\\&');
}

function toLatexPath(p) {
  return p.replace(/\\/g, '/');
}

function convertTextToLatex(text) {
  const sections = text.split(/\n\s*\n/);
  let result = '';
  let lastWasHeading = false;

  for (let section of sections) {
    section = section.trim();
    if (!section) continue;

    const isMainHeading = /^[0-9]+\.\s+/.test(section);
    const isSubHeading = /^[0-9]+\.[0-9]+\s+/.test(section);
    const isBulletPoint = /^[\*\-•]\s+/.test(section);
    const isNumberedList = /^[0-9]+\.\s+[^A-Z]/.test(section) && !isMainHeading;
    const isCodeBlock = section.includes('```') || section.includes('const ') || section.includes('function ');
    
    if (isMainHeading) {
      const title = section.replace(/^[0-9]+\.\s+/, '');
      result += `\\section{${escapeLatex(title)}}\n\\vspace{0.3em}\n`;
      lastWasHeading = true;
    } else if (isSubHeading) {
      const title = section.replace(/^[0-9]+\.[0-9]+\s+/, '');
      result += `\\subsection{${escapeLatex(title)}}\n\\vspace{0.2em}\n`;
      lastWasHeading = true;
    } else if (isBulletPoint) {
      const content = section.replace(/^[\*\-•]\s+/, '');
      result += `\\begin{itemize}[leftmargin=1.5em, itemsep=0.3em]\n\\item ${escapeLatex(content)}\n\\end{itemize}\n\\vspace{0.4em}\n`;
      lastWasHeading = false;
    } else if (isNumberedList) {
      const content = section.replace(/^[0-9]+\.\s+/, '');
      result += `\\begin{enumerate}[leftmargin=1.5em, itemsep=0.3em]\n\\item ${escapeLatex(content)}\n\\end{enumerate}\n\\vspace{0.4em}\n`;
      lastWasHeading = false;
    } else if (isCodeBlock) {
      // Handle code blocks with better formatting
      const cleanCode = section.replace(/```[\w]*\n?/g, '').replace(/```/g, '');
      result += `\\vspace{0.3em}\n\\begin{lstlisting}[backgroundcolor=\\color{codebg}, frame=single, rulecolor=\\color{codeborder}]\n${cleanCode}\n\\end{lstlisting}\n\\vspace{0.5em}\n`;
      lastWasHeading = false;
    } else {
      // Regular paragraph content
      const spacing = lastWasHeading ? '\\vspace{0.1em}' : '\\vspace{0.4em}';
      result += `${spacing}\n\\noindent ${escapeLatex(section)}\n\\vspace{0.3em}\n`;
      lastWasHeading = false;
    }
  }

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
\\subsection{${escapeLatex(title)}}
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
\\fancyhead[R]{\\textcolor{darkgray}{\\small ${escapeLatex(repoTitle)}}}
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
\\setcounter{tocdepth}{2}

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
  {\\LARGE\\color{darkgray}\\textit{${escapeLatex(repoTitle)}}\\par}
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
};