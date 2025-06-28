const puppeteer = require('puppeteer');

exports.generatePdf = async (analysisText, diagrams = [], repoUrl = '') => {
  const sections = analysisText.split(/\n\s*\n/);

  const repoTitle = repoUrl
    ? repoUrl.split('/').slice(-2).join('/').replace(/\.git$/, '')
    : 'Code Analyzer';

  let htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        font-family: 'Arial', sans-serif;
        margin: 50px;
        color: #222;
        line-height: 1.6;
        font-weight: normal;
      }

      h1 {
        font-size: 28px;
        text-align: center;
        margin-bottom: 5px;
      }

      .repo-title {
        text-align: center;
        font-size: 16px;
        color: #555;
        margin-bottom: 30px;
      }

      .date {
        text-align: center;
        font-size: 12px;
        color: #888;
        margin-bottom: 40px;
      }

      h2 {
        font-size: 20px;
        color: #111;
        font-weight: bold;
        margin-top: 40px;
        margin-bottom: 12px;
        border-bottom: 1px solid #eee;
        padding-bottom: 4px;
      }

      h3 {
        font-size: 16px;
        color: #333;
        font-weight: bold;
        margin-top: 20px;
        margin-bottom: 8px;
        padding-left: 10px;
      }

      p {
        font-size: 13px;
        color: #000;
        font-weight: normal;
        margin-left: 25px;
        margin-bottom: 12px;
        text-align: justify;
      }

      .diagram-page {
        page-break-before: always;
      }

      .diagram-title {
        font-size: 14px;
        font-weight: bold;
        margin-top: 20px;
        margin-bottom: 10px;
        text-align: center;
      }

      img {
        display: block;
        margin: 0 auto;
        max-width: 90%;
        height: auto;
      }
    </style>
  </head>
  <body>
    <h1>Code Analyzer</h1>
    <div class="repo-title">${repoTitle}</div>
    <div class="date">Generated on: ${new Date().toLocaleDateString()}</div>
  `;

  let mainHeadingNumber = 0;
  let subHeadingCounter = 0;

  for (const section of sections) {
    const clean = section.trim();
    if (!clean) continue;

    const isMainHeading = /^[0-9]+\.\s+/.test(clean);
    const isWorkflow = clean.toLowerCase().startsWith('4. workflow');
    const isLikelySubheading = /^[*-]?\s*[A-Z]/.test(clean) && clean.length < 180;

    if (isMainHeading || isWorkflow) {
      mainHeadingNumber++;
      subHeadingCounter = 0;
      htmlContent += `<h2>${clean}</h2>`;
    } else if (isLikelySubheading) {
      subHeadingCounter++;
      const numbered = `${mainHeadingNumber}.${subHeadingCounter} ${clean}`;
      htmlContent += `<h3>${numbered}</h3>`;
    } else {
      htmlContent += `<p>${clean}</p>`;
    }
  }

  // Diagrams on a new page
  if (diagrams.length) {
    htmlContent += `<div class="diagram-page"><h2>Workflow Diagrams</h2>`;
    for (const { title, png } of diagrams) {
      const base64 = png.toString('base64');
      htmlContent += `
        <div>
          <div class="diagram-title">${title}</div>
          <img src="data:image/png;base64,${base64}" alt="${title}" />
        </div>
      `;
    }
    htmlContent += `</div>`;
  }

  htmlContent += `</body></html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '50px',
      bottom: '60px',
      left: '40px',
      right: '40px',
    },
  });

  await browser.close();
  return pdfBuffer;
};
