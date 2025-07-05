# Code Analyzer Backend Setup Guide

## Prerequisites

### 1. Install Java (Required for UML Diagrams)

The application requires Java to generate UML diagrams using PlantUML.

#### On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install default-jdk -y
```

#### On CentOS/RHEL/Fedora:
```bash
sudo dnf install java-17-openjdk -y
# or on older systems:
sudo yum install java-17-openjdk -y
```

#### On macOS:
```bash
brew install openjdk
```

#### On Windows:
Download and install from: https://adoptopenjdk.net/

#### Verify Java Installation:
```bash
java -version
```

### 2. Install LaTeX (Recommended for High-Quality PDFs)

LaTeX provides better PDF formatting. If not installed, the system will fallback to Puppeteer.

#### On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install texlive-latex-base texlive-latex-recommended texlive-latex-extra -y
```

#### On CentOS/RHEL/Fedora:
```bash
sudo dnf install texlive-scheme-medium -y
```

#### On macOS:
```bash
brew install --cask mactex
# or smaller installation:
brew install basictex
```

#### On Windows:
Download and install from: https://miktex.org/

#### Verify LaTeX Installation:
```bash
pdflatex --version
```

### 3. Install Node.js Dependencies
```bash
npm install
```

### 4. Environment Configuration

Create a `.env` file in the root directory:
```env
GOOGLE_API_KEY=your_google_ai_api_key_here
PORT=3000
NODE_ENV=development
```

### 5. Run the Application

#### Development Mode:
```bash
npm run dev
```

#### Production Mode:
```bash
npm start
```

## Usage

Send a POST request to `http://localhost:3000/api/analyze`:

```json
{
  "repoUrl": "https://github.com/username/repo.git"
}
```

or

```json
{
  "localPath": "/path/to/local/project"
}
```

## Fallback Behavior

- **No Java**: UML diagrams will be skipped, analysis continues
- **No LaTeX**: System automatically falls back to Puppeteer for PDF generation
- **Both missing**: Analysis works with text-only PDF output

## Notes

- Large files (>2MB) are automatically excluded from analysis
- Only relevant file types are analyzed (js, jsx, ts, tsx, py, java, cpp, cs, package.json, README.md)
- The analysis result is returned as a PDF file
