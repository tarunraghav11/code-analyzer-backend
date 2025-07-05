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
        prompt: `TASK: Analyze the codebase and provide a focused summary of its purpose and core architecture.

STRICT REQUIREMENTS:
- Focus ONLY on application purpose, core functionality, and high-level architecture
- NO frontend or backend implementation details (save those for dedicated sections)
- Structure as clear subsections with headings
- Use structured format, not paragraphs

FORMAT EXACTLY LIKE THIS:

Application Purpose:
Brief explanation of what this application does and its business domain.

Primary Features:
- Feature 1: Technical description
- Feature 2: Technical description
- Feature 3: Technical description

Architecture Overview:
High-level system design approach and architectural patterns used.

Key Components:
- Component 1: Role and responsibility
- Component 2: Role and responsibility
- Component 3: Role and responsibility

Data Flow:
Brief explanation of how data moves through the system.

NO markdown formatting. NO asterisks. Use plain text with clear headings and bullet points with dashes only.`,
        temperature: 0.3
      },
      {
        key: 'frontend',
        name: 'Frontend Architecture',
        prompt: `TASK: Analyze ONLY the frontend/client-side architecture and implementation.

STRICT REQUIREMENTS:
- Focus EXCLUSIVELY on frontend technologies, components, UI/UX
- NO backend, API, or server-side details
- Structure as clear technical subsections
- Provide specific implementation details

FORMAT EXACTLY LIKE THIS:

Component Architecture:
Analysis of component structure, hierarchy, and organization patterns.

State Management:
Details about state handling, data flow, and state management patterns.

UI/UX Implementation:
- Styling approach and CSS framework usage
- Responsive design implementation
- Component design patterns

Routing & Navigation:
Frontend routing implementation and navigation patterns.

Build & Development:
- Build tools and bundling approach
- Development workflow and tooling
- Code organization and structure

Performance Optimizations:
Frontend-specific performance techniques and optimizations.

User Experience Features:
- Form handling and validation
- Loading states and error handling
- Interactive features and animations

NO markdown formatting. NO asterisks. Use plain text with clear headings and bullet points with dashes only.`,
        temperature: 0.4
      },
      {
        key: 'backend',
        name: 'Backend Architecture',
        prompt: `TASK: Analyze ONLY the backend/server-side architecture and implementation.

STRICT REQUIREMENTS:
- Focus EXCLUSIVELY on server-side code, APIs, databases, and backend services
- NO frontend or client-side details
- Structure as clear technical subsections
- Provide specific implementation details

FORMAT EXACTLY LIKE THIS:

API Design:
Analysis of endpoint structure, HTTP methods, and API patterns.

Data Architecture:
- Database design and schema structure
- Data models and relationships
- Persistence and storage strategies

Authentication & Security:
Server-side authentication, authorization, and security implementations.

Service Layer:
- Business logic organization
- Service architecture patterns
- Dependency management

Middleware & Processing:
Request/response processing pipeline and middleware implementations.

Database Integration:
- ORM/ODM usage and patterns
- Query optimization and database access
- Connection management

Error Handling:
Backend error handling strategies and logging implementations.

Performance & Scalability:
- Caching strategies
- Optimization techniques
- Scalability considerations

NO markdown formatting. NO asterisks. Use plain text with clear headings and bullet points with dashes only.`,
        temperature: 0.4
      },
      {
        key: 'techStack',
        name: 'Tech Stack',
        prompt: `TASK: List and categorize ALL technologies used in the project with versions and purposes.

STRICT REQUIREMENTS:
- Organize by clear categories
- Include specific versions where available
- Explain the purpose of each technology
- Cover all aspects: frontend, backend, database, DevOps, testing

FORMAT EXACTLY LIKE THIS:

Frontend Technologies:
- Technology name (version): Purpose and usage explanation
- Technology name (version): Purpose and usage explanation

Backend Technologies:
- Technology name (version): Purpose and usage explanation
- Technology name (version): Purpose and usage explanation

Database & Storage:
- Technology name (version): Purpose and usage explanation
- Technology name (version): Purpose and usage explanation

Development Tools:
- Technology name (version): Purpose and usage explanation
- Technology name (version): Purpose and usage explanation

Testing & Quality:
- Technology name (version): Purpose and usage explanation
- Technology name (version): Purpose and usage explanation

DevOps & Deployment:
- Technology name (version): Purpose and usage explanation
- Technology name (version): Purpose and usage explanation

NO markdown formatting. NO asterisks. Use plain text with clear headings and bullet points with dashes only.`,
        temperature: 0.3
      },
      {
        key: 'workflow',
        name: 'Workflow',
        prompt: `Generate exactly 2 simple PlantUML sequence diagrams showing key application workflows.

STRICT FORMAT REQUIREMENTS:
- Line 1: @startuml
- Line 2: title "Diagram Name"
- Lines 3+: Only use these patterns:
  * participant Name
  * Actor -> System : Message
  * System --> Actor : Response
- Last line: @enduml

EXAMPLE (copy this format exactly):
@startuml
title "User Authentication Flow"
participant User
participant Frontend
participant Backend
participant Database
User -> Frontend : Enter credentials
Frontend -> Backend : Login request
Backend -> Database : Validate user
Database --> Backend : User data
Backend --> Frontend : Auth token
Frontend --> User : Login success
@enduml

@startuml
title "Data Processing Flow"
participant Client
participant API
participant Service
participant Database
Client -> API : Request data
API -> Service : Process request
Service -> Database : Query data
Database --> Service : Raw data
Service --> API : Processed data
API --> Client : Response
@enduml

Create 2 different diagrams with this EXACT format. Do not add any other syntax or text.`,
        temperature: 0.2
      },
      {
        key: 'observations',
        name: 'Observations',
        prompt: `TASK: Provide technical code quality observations and development practices analysis.

STRICT REQUIREMENTS:
- Focus on code quality, patterns, and development practices
- NO feature descriptions or business logic details
- Structure as clear technical assessments
- Be specific about what you observe in the code

FORMAT EXACTLY LIKE THIS:

Code Organization:
Analysis of file structure, module separation, and project organization.

Design Patterns:
Identification of specific design patterns and architectural approaches used.

Code Quality:
- Code readability and maintainability assessment
- Naming conventions and coding standards
- Error handling and validation approaches

Development Practices:
- Testing implementation and coverage
- Documentation quality and completeness
- Configuration and environment management

Technical Debt:
Areas where code could be improved or refactored for better maintainability.

Best Practices:
Identification of good practices and patterns found in the codebase.

Areas for Improvement:
Specific technical aspects that could be enhanced.

NO markdown formatting. NO asterisks. Use plain text with clear headings and bullet points with dashes only.`,
        temperature: 0.5
      },
      {
        key: 'recommendations',
        name: 'Recommendations',
        prompt: `Task: Provide 5-7 specific, actionable technical recommendations with detailed implementation guidance.

Guidelines:
- Focus on concrete, implementable improvements with technical depth
- Include specific technologies, tools, or methodologies to adopt
- Provide rationale based on current architecture analysis
- Prioritize by impact, feasibility, and technical merit
- Include implementation steps or approaches where relevant
- Address performance, security, maintainability, and scalability

Format as numbered recommendations:
1. Specific Technical Recommendation Title
   Detailed explanation of the recommendation including why it's needed, what specific technologies or approaches to use, expected benefits, and potential implementation considerations. Include technical specifics and measurable outcomes.

2. Next Recommendation Title
   Another detailed technical recommendation with implementation context.

Ensure each recommendation is substantial (3-4 sentences) with technical depth and actionable guidance.`,
        temperature: 0.6
      },
      {
        key: 'enhancements',
        name: 'Future Enhancements',
        prompt: `Task: Suggest 5-7 forward-looking technical enhancement opportunities with strategic value.

Guidelines:
- Focus on advanced technical capabilities and architectural improvements
- Consider emerging technologies, modern development practices, and industry trends
- Address scalability, performance optimization, and system evolution
- Include automation opportunities, DevOps improvements, and operational enhancements
- Consider user experience improvements with technical implementation details
- Address technical debt reduction and modernization opportunities
- Include specific technologies, frameworks, or methodologies

Format as numbered enhancements:
1. Strategic Enhancement Title
   Comprehensive description including the technical approach, technologies involved, expected benefits, complexity considerations, and strategic value. Detail how this enhancement would improve the system architecture or capabilities.

2. Next Enhancement Title
   Another detailed technical enhancement with implementation context and strategic reasoning.

Ensure each enhancement is forward-thinking (4-5 sentences) with technical depth and strategic justification.`,
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
    if (!text) return [];
    
    console.log('🔍 Extracting UML blocks from text...');
    const blocks = [...text.matchAll(/@startuml([\s\S]*?)@enduml/g)];
    const validBlocks = [];
    
    for (let i = 0; i < blocks.length; i++) {
      const match = blocks[i];
      const content = match[1].trim();
      const fullBlock = `@startuml\n${content}\n@enduml`;
      
      console.log(`🔍 Processing UML block ${i + 1}:`);
      console.log(fullBlock);
      
      // Try self-healing approach
      const healedBlock = this.selfHealPlantUML(fullBlock, i + 1);
      
      if (healedBlock) {
        validBlocks.push(healedBlock);
        console.log(`✅ UML block ${i + 1} is ready for generation`);
      } else {
        console.warn(`❌ UML block ${i + 1} could not be healed, generating fallback`);
        const fallback = this.generateFallbackDiagram(i + 1);
        if (fallback) {
          validBlocks.push(fallback);
          console.log(`🔄 Generated fallback diagram for block ${i + 1}`);
        }
      }
    }
    
    console.log(`📊 Found ${validBlocks.length} valid UML blocks out of ${blocks.length} total`);
    return validBlocks;
  }
  
  sanitizePlantUML(umlBlock) {
    let sanitized = umlBlock;
    
    console.log('🧹 Sanitizing PlantUML block...');
    
    // Remove common problematic patterns
    sanitized = sanitized
      // Remove markdown formatting completely
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      
      // Remove problematic notes
      .replace(/^note (left|right)$/gm, '')
      .replace(/^note (left|right) of.*$/gm, '')
      .replace(/^note.*$/gm, '')
      
      // Fix title formatting - ensure it's properly quoted
      .replace(/^title\s+([^"\n]+)$/gm, (match, title) => {
        const cleanTitle = title.replace(/[^\w\s]/g, '').trim();
        return `title "${cleanTitle}"`;
      })
      
      // Remove lines with only special characters
      .replace(/^\s*[^\w\s@\-><:"'\n]+\s*$/gm, '')
      
      // Remove any HTML tags
      .replace(/<[^>]*>/g, '')
      
      // Fix participant names - ensure they're valid identifiers
      .replace(/^participant\s+([^a-zA-Z0-9_\s]+)/gm, 'participant Actor')
      .replace(/^participant\s+(\d+)/gm, 'participant Actor$1')
      
      // Fix common arrow syntax issues
      .replace(/(\w+)\s*[-=]+>\s*(\w+)/g, '$1 -> $2')
      .replace(/(\w+)\s*[-=]+>>\s*(\w+)/g, '$1 --> $2')
      .replace(/(\w+)\s*<[-=]+\s*(\w+)/g, '$2 -> $1')
      .replace(/(\w+)\s*<<[-=]+\s*(\w+)/g, '$2 --> $1')
      
      // Remove problematic characters but keep essential ones
      .replace(/[^\w\s@\-><:"'\n]/g, '')
      
      // Clean up whitespace
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .replace(/^\s+/gm, '')
      .replace(/\s+$/gm, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .trim();
    
    // Ensure proper structure
    if (!sanitized.startsWith('@startuml')) {
      sanitized = '@startuml\n' + sanitized;
    }
    if (!sanitized.endsWith('@enduml')) {
      sanitized = sanitized + '\n@enduml';
    }
    
    console.log('🧹 Sanitization complete');
    return sanitized;
  }
  
  validatePlantUML(umlBlock) {
    try {
      if (!umlBlock || typeof umlBlock !== 'string') {
        console.warn('❌ PlantUML validation: Block is not a string');
        return false;
      }

      const lines = umlBlock.split('\n').map(line => line.trim()).filter(line => line);
      
      // Check for required start/end
      if (lines.length < 4) {
        console.warn('❌ PlantUML validation: Too few lines (minimum 4 required)');
        return false;
      }
      
      if (!lines[0].includes('@startuml') || !lines[lines.length - 1].includes('@enduml')) {
        console.warn('❌ PlantUML validation: Missing @startuml or @enduml');
        return false;
      }
      
      // Get content between @startuml and @enduml
      const contentLines = lines.slice(1, -1);
      if (contentLines.length < 3) {
        console.warn('❌ PlantUML validation: Too little content (minimum 3 lines required)');
        return false;
      }
      
      const content = contentLines.join('\n');
      
      // Must have title
      const hasTitle = /title\s+["\']?[^"\']+["\']?/i.test(content);
      if (!hasTitle) {
        console.warn('❌ PlantUML validation: Missing title');
        return false;
      }
      
      // Must have at least one participant
      const hasParticipants = /participant\s+\w+/i.test(content);
      if (!hasParticipants) {
        console.warn('❌ PlantUML validation: No participants found');
        return false;
      }
      
      // Must have at least one arrow or relationship
      const hasValidElements = /->|-->/i.test(content);
      if (!hasValidElements) {
        console.warn('❌ PlantUML validation: No valid UML arrows found');
        return false;
      }
      
      // Check for problematic patterns that cause PlantUML errors
      const invalidPatterns = [
        { pattern: /^note\s+(left|right)$/m, desc: 'Standalone note without content' },
        { pattern: /note\s+(left|right)(?!\s+of\s+\w+|\s*:)/m, desc: 'Invalid note syntax' },
        { pattern: /^\s*\*+\s*$/m, desc: 'Lines with only asterisks' },
        { pattern: /\*\*.*?\*\*/g, desc: 'Markdown bold formatting' },
        { pattern: /@startuml.*@startuml/s, desc: 'Nested @startuml' },
        { pattern: /@enduml.*@enduml/s, desc: 'Nested @enduml' },
        { pattern: /[{}]/g, desc: 'Curly braces (not allowed in sequence diagrams)' },
        { pattern: /class\s+/i, desc: 'Class syntax (use participant instead)' },
        { pattern: /interface\s+/i, desc: 'Interface syntax (not for sequence diagrams)' },
        { pattern: /participant\s+[^a-zA-Z0-9_]/m, desc: 'Invalid participant name' },
        { pattern: /(\w+)\s*[-=]*>\s*(\w+)\s*$/m, desc: 'Arrow without message' },
        { pattern: /<[^>]*>/g, desc: 'HTML tags not allowed' },
        { pattern: /[^\w\s@\-><:"'\n]/g, desc: 'Invalid special characters' }
      ];
      
      for (const { pattern, desc } of invalidPatterns) {
        if (pattern.test(content)) {
          console.warn(`❌ PlantUML validation failed - ${desc}`);
          return false;
        }
      }
      
      // Check for minimum viable content
      const validLines = contentLines.filter(line => 
        line.length > 2 && 
        !line.startsWith('//') && 
        !/^[^a-zA-Z0-9]*$/.test(line) &&
        (line.includes('participant') || line.includes('->') || line.includes('title'))
      );
      
      if (validLines.length < 3) {
        console.warn('❌ PlantUML validation: Not enough valid content lines');
        return false;
      }
      
      // Additional check: ensure we have both participants and interactions
      const participantCount = (content.match(/participant\s+\w+/gi) || []).length;
      const interactionCount = (content.match(/\w+\s*(->|-->)\s*\w+\s*:/gi) || []).length;
      
      if (participantCount < 2) {
        console.warn('❌ PlantUML validation: Need at least 2 participants');
        return false;
      }
      
      if (interactionCount < 1) {
        console.warn('❌ PlantUML validation: Need at least 1 interaction');
        return false;
      }
      
      console.log('✅ PlantUML validation passed - Enhanced validation complete');
      return true;
      
    } catch (error) {
      console.warn('❌ PlantUML validation error:', error.message);
      return false;
    }
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

    // Clean workflow content from UML blocks and any extraneous text
    const cleanWorkflow = workflow ? workflow.replace(/@startuml[\s\S]*?@enduml/g, '').trim() : '';
    
    // Build sections with clear separation
    const sections = [];
    
    if (summary) {
      sections.push("1. Codebase Summary");
      sections.push(summary.trim());
      sections.push("");
    }
    
    if (frontend) {
      sections.push("2. Frontend Architecture");
      sections.push(frontend.trim());
      sections.push("");
    }
    
    if (backend) {
      sections.push("3. Backend Architecture");
      sections.push(backend.trim());
      sections.push("");
    }
    
    if (techStack) {
      sections.push("4. Tech Stack");
      sections.push(techStack.trim());
      sections.push("");
    }
    
    if (cleanWorkflow) {
      sections.push("5. Workflow");
      sections.push(cleanWorkflow);
      sections.push("");
    }
    
    if (observations) {
      sections.push("6. Observations");
      sections.push(observations.trim());
      sections.push("");
    }
    
    if (recommendations) {
      sections.push("7. Recommendations");
      sections.push(recommendations.trim());
      sections.push("");
    }
    
    if (enhancements) {
      sections.push("8. Future Enhancements");
      sections.push(enhancements.trim());
    }

    return sections.join('\n');
  }
  
  selfHealPlantUML(umlBlock, blockNumber) {
    console.log(`🔧 Self-healing UML block ${blockNumber}...`);
    
    let healedBlock = umlBlock;
    let healingAttempts = 0;
    const maxAttempts = 3;
    
    while (healingAttempts < maxAttempts) {
      healingAttempts++;
      console.log(`🔧 Healing attempt ${healingAttempts} for block ${blockNumber}`);
      
      // Apply progressive healing techniques
      healedBlock = this.applyHealingTechniques(healedBlock, healingAttempts);
      
      // Validate the healed block
      if (this.validatePlantUML(healedBlock)) {
        console.log(`✅ Block ${blockNumber} healed successfully on attempt ${healingAttempts}`);
        return healedBlock;
      }
      
      console.log(`⚠️ Healing attempt ${healingAttempts} failed for block ${blockNumber}`);
    }
    
    console.log(`❌ Could not heal block ${blockNumber} after ${maxAttempts} attempts`);
    return null;
  }
  
  applyHealingTechniques(umlBlock, attempt) {
    let healed = umlBlock;
    
    // Attempt 1: Basic sanitization
    if (attempt >= 1) {
      healed = this.sanitizePlantUML(healed);
      healed = this.fixCommonSyntaxErrors(healed);
    }
    
    // Attempt 2: Structural fixes
    if (attempt >= 2) {
      healed = this.fixStructuralIssues(healed);
    }
    
    // Attempt 3: Aggressive reconstruction
    if (attempt >= 3) {
      healed = this.reconstructDiagram(healed);
    }
    
    return healed;
  }
  
  fixCommonSyntaxErrors(umlBlock) {
    let fixed = umlBlock;
    
    // Fix common PlantUML syntax errors
    fixed = fixed
      // Fix participant declarations (ensure proper syntax)
      .replace(/^(participant\s+)([^a-zA-Z0-9_])(.*)$/gm, '$1Actor$3')
      .replace(/^participant\s*$/gm, 'participant Actor')
      
      // Fix arrow syntax
      .replace(/(\w+)\s*->\s*(\w+)\s*:\s*([^:\n]+):/g, '$1 -> $2 : $3')
      .replace(/(\w+)\s*-->\s*(\w+)\s*:\s*([^:\n]+):/g, '$1 --> $2 : $3')
      
      // Fix title formatting
      .replace(/^title\s*([^"\n]+)$/gm, (match, title) => {
        const cleanTitle = title.replace(/[^\w\s]/g, '').trim();
        return `title "${cleanTitle}"`;
      })
      
      // Remove invalid characters from participant names
      .replace(/^participant\s+([^a-zA-Z0-9_]+)/gm, 'participant Actor')
      .replace(/^participant\s+([a-zA-Z0-9_]*[^a-zA-Z0-9_\s]+[a-zA-Z0-9_]*)/gm, 'participant $1')
      
      // Fix common message format issues
      .replace(/(\w+)\s*->\s*(\w+)\s*$/gm, '$1 -> $2 : Action')
      .replace(/(\w+)\s*-->\s*(\w+)\s*$/gm, '$1 --> $2 : Response')
      
      // Remove problematic characters
      .replace(/[^\w\s@\-><:"'\n]/g, '')
      
      // Fix spacing issues
      .replace(/\s+/g, ' ')
      .replace(/^\s+/gm, '')
      .replace(/\s+$/gm, '');
    
    return fixed;
  }
  
  fixStructuralIssues(umlBlock) {
    const lines = umlBlock.split('\n').map(line => line.trim()).filter(line => line);
    let fixed = [];
    
    // Ensure proper structure
    fixed.push('@startuml');
    
    let hasTitle = false;
    let participants = new Set();
    let interactions = [];
    
    for (const line of lines) {
      if (line.includes('@startuml') || line.includes('@enduml')) {
        continue;
      }
      
      // Extract title
      const titleMatch = line.match(/title\s+["\']?([^"\']+)["\']?/i);
      if (titleMatch && !hasTitle) {
        fixed.push(`title "${titleMatch[1].trim()}"`);
        hasTitle = true;
        continue;
      }
      
      // Extract participants
      const participantMatch = line.match(/participant\s+(\w+)/i);
      if (participantMatch) {
        const name = participantMatch[1];
        if (!participants.has(name)) {
          participants.add(name);
          fixed.push(`participant ${name}`);
        }
        continue;
      }
      
      // Extract interactions
      const interactionMatch = line.match(/(\w+)\s*(->|-->)\s*(\w+)\s*:\s*(.+)/);
      if (interactionMatch) {
        const [, from, arrow, to, message] = interactionMatch;
        participants.add(from);
        participants.add(to);
        interactions.push(`${from} ${arrow} ${to} : ${message.trim()}`);
        continue;
      }
    }
    
    // Add missing title
    if (!hasTitle) {
      fixed.splice(1, 0, 'title "System Flow"');
    }
    
    // Add missing participants
    participants.forEach(participant => {
      if (!fixed.some(line => line.includes(`participant ${participant}`))) {
        fixed.splice(-1, 0, `participant ${participant}`);
      }
    });
    
    // Add interactions
    interactions.forEach(interaction => {
      fixed.push(interaction);
    });
    
    // Ensure we have some content
    if (interactions.length === 0) {
      const participantArray = Array.from(participants);
      if (participantArray.length >= 2) {
        fixed.push(`${participantArray[0]} -> ${participantArray[1]} : Request`);
        fixed.push(`${participantArray[1]} --> ${participantArray[0]} : Response`);
      } else {
        fixed.push('Actor -> System : Request');
        fixed.push('System --> Actor : Response');
      }
    }
    
    fixed.push('@enduml');
    
    return fixed.join('\n');
  }
  
  reconstructDiagram(umlBlock) {
    console.log('🔨 Reconstructing diagram with safe defaults...');
    
    // Extract any meaningful text for title
    const titleMatch = umlBlock.match(/title\s+["\']?([^"\']+)["\']?/i);
    const title = titleMatch ? titleMatch[1].trim() : 'System Flow';
    
    // Extract participant names
    const participantMatches = [...umlBlock.matchAll(/participant\s+(\w+)/gi)];
    let participants = participantMatches.map(match => match[1]);
    
    // If no participants found, use defaults
    if (participants.length === 0) {
      participants = ['User', 'System', 'Database'];
    } else if (participants.length === 1) {
      participants.push('System');
    }
    
    // Create a safe, basic diagram
    const safeDiagram = [
      '@startuml',
      `title "${title}"`,
      ...participants.slice(0, 4).map(p => `participant ${p}`),
      `${participants[0]} -> ${participants[1]} : Request`,
      `${participants[1]} --> ${participants[0]} : Response`,
      participants[2] ? `${participants[1]} -> ${participants[2]} : Query` : '',
      participants[2] ? `${participants[2]} --> ${participants[1]} : Data` : '',
      '@enduml'
    ].filter(line => line).join('\n');
    
    return safeDiagram;
  }
  
  generateFallbackDiagram(blockNumber) {
    console.log(`🔄 Generating fallback diagram ${blockNumber}...`);
    
    const fallbackDiagrams = [
      {
        title: 'User Authentication Flow',
        participants: ['User', 'Frontend', 'Backend', 'Database'],
        interactions: [
          'User -> Frontend : Login request',
          'Frontend -> Backend : Validate credentials',
          'Backend -> Database : Check user',
          'Database --> Backend : User data',
          'Backend --> Frontend : Auth token',
          'Frontend --> User : Login success'
        ]
      },
      {
        title: 'Data Processing Flow',
        participants: ['Client', 'API', 'Service', 'Database'],
        interactions: [
          'Client -> API : Request data',
          'API -> Service : Process request',
          'Service -> Database : Query',
          'Database --> Service : Results',
          'Service --> API : Processed data',
          'API --> Client : Response'
        ]
      }
    ];
    
    const fallback = fallbackDiagrams[(blockNumber - 1) % fallbackDiagrams.length];
    
    const diagram = [
      '@startuml',
      `title "${fallback.title}"`,
      ...fallback.participants.map(p => `participant ${p}`),
      ...fallback.interactions,
      '@enduml'
    ].join('\n');
    
    return diagram;
  }
}

exports.runRAG = async (context) => {
  const analyzer = new CodeAnalyzer();
  return await analyzer.generateAll(context);
};
