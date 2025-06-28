const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

class CodeAnalyzer {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    this.results = {};
    this.title = '';
  }
  
  async generate(prompt, context, sectionName, options = {}) {
    const { temperature = 0.6, maxRetries = 3 } = options;
    const fullPrompt = `${prompt}\n\nCode Context:\n${context}`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 [${sectionName}] Attempt ${attempt}`);
        const result = await this.model.generateContent(fullPrompt, {
          generationConfig: {
            temperature,
            maxOutputTokens: 2048,
            topP: 0.9,
            topK: 40
          }
        });
        const text = result.response.text().trim();
        console.log(`✅ [${sectionName}] Success`);
        return text;
      } catch (err) {
        console.error(`❌ [${sectionName}] Attempt ${attempt} failed:`, err.message);
        if (attempt === maxRetries) throw err;
        await new Promise(res => setTimeout(res, 1000 * attempt));
      }
    }
  }

  async generateAll(context) {
    console.log('🚀 Starting code analysis...');

    // Title
    this.title = await this.generate(
      `Task: Generate a concise, professional report title (max 6–8 words) that summarizes the application purpose.

Guidelines:
- Avoid mentioning technology stacks
- Use title case
- No extra commentary
- Output only the title
`, context, 'Report Title', { temperature: 0.4 });

    // Sections
    const tasks = [
      {
        key: 'summary',
        name: 'Codebase Summary',
        prompt: "Task: Provide a non-technical 3–4 sentence summary of the codebase's purpose. Avoid tech stack. No markdown.",
        temperature: 0.3
      },
      {
        key: 'frontend',
        name: 'Frontend Architecture',
        prompt: "Task: Analyze frontend structure and component relationships. Include state, routing, design pattern."
      },
      {
        key: 'backend',
        name: 'Backend Architecture',
        prompt: "Task: Analyze backend code focusing on APIs, database, authentication, and error handling."
      },
      {
        key: 'techStack',
        name: 'Tech Stack',
        prompt: "List technologies used in categories: frontend, backend, database, devtools, APIs. No markdown.",
        temperature: 0.3
      },
      {
        key: 'workflow',
        name: 'Workflow',
        prompt: `Generate 2 PlantUML diagrams for application flow.

Use:
- Swimlanes
- Conditions
- Notes
- @startuml blocks with color themes`,
        temperature: 0.4
      },
      {
        key: 'observations',
        name: 'Observations',
        prompt: "Highlight good and bad code practices. Include readability, patterns, and testing."
      },
      {
        key: 'recommendations',
        name: 'Recommendations',
        prompt: "Give 3 actionable recommendations for improvement. Include rationale. No markdown."
      },
      {
        key: 'enhancements',
        name: 'Future Enhancements',
        prompt: "Suggest 3 future enhancements aligned with scalability, usability or automation.",
        temperature: 0.7
      }
    ];

    for (const { key, prompt, name, temperature } of tasks) {
      const text = await this.generate(prompt, context, name, { temperature });
      this.results[key] = text;
    }

    return {
      title: this.title,
      analysisText: this.compileText(),
      umlBlocks: this.extractUML(this.results.workflow)
    };
  }

  extractUML(text) {
    return [...text.matchAll(/@startuml([\s\S]*?)@enduml/g)].map(
      match => `@startuml\n${match[1].trim()}\n@enduml`
    );
  }

  compileText() {
    const {
      summary,
      frontend,
      backend,
      techStack,
      workflow,
      observations,
      recommendations,
      enhancements
    } = this.results;

    return [
      "0. Codebase Summary",
      summary,
      "1. Frontend Architecture",
      frontend,
      "2. Backend Architecture",
      backend,
      "3. Tech Stack",
      techStack,
      "4. Workflow",
      workflow ? workflow.replace(/@startuml[\s\S]*?@enduml/g, '').trim() : '',
      "5. Observations",
      observations,
      "6. Recommendations",
      recommendations,
      "7. Future Enhancements",
      enhancements
    ].join('\n\n');
  }
}

exports.runRAG = async (context) => {
  const analyzer = new CodeAnalyzer();
  return await analyzer.generateAll(context);
};
