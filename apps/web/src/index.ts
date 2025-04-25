import { Hono } from 'hono'

const app = new Hono()

// SVG Contents (Escaped for template literal)
const threePartsSvg = `<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="800" height="500" fill="#f8f9fa" rx="10" ry="10" />
  
  <!-- Title -->
  <text x="400" y="50" font-family="Arial, sans-serif" font-size="24" fill="#333" text-anchor="middle" font-weight="bold">MAGI: Three Major Components</text>
  
  <!-- YAML Front Matter -->
  <rect x="100" y="100" width="200" height="250" fill="#e3f2fd" stroke="#2196f3" stroke-width="2" rx="10" ry="10" />
  <text x="200" y="130" font-family="Arial, sans-serif" font-size="18" fill="#0d47a1" text-anchor="middle" font-weight="bold">YAML Front Matter</text>
  
  <rect x="120" y="150" width="165" height="180" fill="#ffffff" stroke="#bbdefb" stroke-width="1" rx="5" ry="5" />
  <text x="130" y="170" font-family="monospace" font-size="12" fill="#333">---</text>
  <text x="130" y="190" font-family="monospace" font-size="12" fill="#333">doc-id: "38f5a922..."</text>
  <text x="130" y="210" font-family="monospace" font-size="12" fill="#333">title: "Document"</text>
  <text x="130" y="230" font-family="monospace" font-size="12" fill="#333">description: "..."</text>
  <text x="130" y="250" font-family="monospace" font-size="12" fill="#333">tags: ["magi", "doc"]</text>
  <text x="130" y="270" font-family="monospace" font-size="12" fill="#333">created-date: "..."</text>
  <text x="130" y="290" font-family="monospace" font-size="12" fill="#333">updated-date: "..."</text>
  <text x="130" y="310" font-family="monospace" font-size="12" fill="#333">---</text>
  
  <!-- AI Script Blocks -->
  <rect x="310" y="100" width="200" height="250" fill="#e8f5e9" stroke="#4caf50" stroke-width="2" rx="10" ry="10" />
  <text x="410" y="130" font-family="Arial, sans-serif" font-size="18" fill="#1b5e20" text-anchor="middle" font-weight="bold">AI Script Blocks</text>
  
  <rect x="330" y="150" width="160" height="180" fill="#ffffff" stroke="#c8e6c9" stroke-width="1" rx="5" ry="5" />
  <text x="340" y="170" font-family="monospace" font-size="12" fill="#333">\\\`\\\`\\\`ai-script</text>
  <text x="340" y="190" font-family="monospace" font-size="12" fill="#333">{</text>
  <text x="340" y="210" font-family="monospace" font-size="12" fill="#333">  "script-id": "..."</text>
  <text x="340" y="230" font-family="monospace" font-size="12" fill="#333">  "prompt": "..."</text>
  <text x="340" y="250" font-family="monospace" font-size="12" fill="#333">  "priority": "high"</text>
  <text x="340" y="270" font-family="monospace" font-size="12" fill="#333">  "auto-run": true</text>
  <text x="340" y="290" font-family="monospace" font-size="12" fill="#333">}</text>
  <text x="340" y="310" font-family="monospace" font-size="12" fill="#333">\\\`\\\`\\\`</text>
  
  <!-- Document Relationships -->
  <rect x="520" y="100" width="200" height="250" fill="#fff8e1" stroke="#ffc107" stroke-width="2" rx="10" ry="10" />
  <text x="620" y="130" font-family="Arial, sans-serif" font-size="18" fill="#ff6f00" text-anchor="middle" font-weight="bold">Doc Relationships</text>
  
  <rect x="540" y="150" width="165" height="180" fill="#ffffff" stroke="#ffecb3" stroke-width="1" rx="5" ry="5" />
  <text x="550" y="170" font-family="monospace" font-size="12" fill="#333">Reference [^ref1]</text>
  <text x="550" y="210" font-family="monospace" font-size="12" fill="#333">[^ref1]: {</text>
  <text x="550" y="230" font-family="monospace" font-size="12" fill="#333">  "rel-type": "parent"</text>
  <text x="550" y="250" font-family="monospace" font-size="12" fill="#333">  "doc-id": "..."</text>
  <text x="550" y="270" font-family="monospace" font-size="12" fill="#333">  "rel-desc": "..."</text>
  <text x="550" y="290" font-family="monospace" font-size="12" fill="#333">}</text>
  
  <!-- Human-readable part -->
  <rect x="100" y="380" width="620" height="100" fill="#f5f5f5" stroke="#9e9e9e" stroke-width="2" rx="10" ry="10" />
  <text x="410" y="420" font-family="Arial, sans-serif" font-size="16" fill="#333" text-anchor="middle">Standard Markdown Content</text>
  <text x="410" y="440" font-family="Arial, sans-serif" font-size="14" fill="#666" text-anchor="middle">[Human-readable text, headings, styles]</text>
  <text x="410" y="460" font-family="Arial, sans-serif" font-size="12" fill="#666" text-anchor="middle">
    (text, lists, headings, links, etc.)
  </text>
  
  <!-- Connecting Lines -->
  <line x1="200" y1="350" x2="200" y2="380" stroke="#9e9e9e" stroke-width="2" stroke-dasharray="5,5" />
  <line x1="410" y1="350" x2="410" y2="380" stroke="#9e9e9e" stroke-width="2" stroke-dasharray="5,5" />
  <line x1="620" y1="350" x2="620" y2="380" stroke="#9e9e9e" stroke-width="2" stroke-dasharray="5,5" />
</svg>`;
const docGraphSvg = `<svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="800" height="500" fill="#f8f9fa" rx="10" ry="10" />
  
  <!-- Title -->
  <text x="400" y="40" font-family="Arial, sans-serif" font-size="24" fill="#333" text-anchor="middle" font-weight="bold">MAGI: Knowledge Graph Construction</text>
  
  <!-- Document Nodes -->
  <!-- Central Document -->
  <circle cx="400" cy="250" r="60" fill="#e3f2fd" stroke="#2196f3" stroke-width="3" />
  <text x="400" y="245" font-family="Arial, sans-serif" font-size="14" fill="#0d47a1" text-anchor="middle" font-weight="bold">Research Paper</text>
  <text x="400" y="265" font-family="Arial, sans-serif" font-size="10" fill="#333" text-anchor="middle">doc-id: "research-001"</text>
  
  <!-- Supporting Documents -->
  <circle cx="250" cy="150" r="50" fill="#e8f5e9" stroke="#4caf50" stroke-width="2" />
  <text x="250" y="145" font-family="Arial, sans-serif" font-size="12" fill="#1b5e20" text-anchor="middle" font-weight="bold">Data Set</text>
  <text x="250" y="165" font-family="Arial, sans-serif" font-size="9" fill="#333" text-anchor="middle">doc-id: "data-123"</text>
  
  <circle cx="550" cy="150" r="50" fill="#e8f5e9" stroke="#4caf50" stroke-width="2" />
  <text x="550" y="145" font-family="Arial, sans-serif" font-size="12" fill="#1b5e20" text-anchor="middle" font-weight="bold">Methods</text>
  <text x="550" y="165" font-family="Arial, sans-serif" font-size="9" fill="#333" text-anchor="middle">doc-id: "methods-456"</text>
  
  <!-- Related Documents -->
  <circle cx="200" cy="350" r="40" fill="#fff8e1" stroke="#ffc107" stroke-width="2" />
  <text x="200" y="345" font-family="Arial, sans-serif" font-size="11" fill="#ff6f00" text-anchor="middle" font-weight="bold">Prior Study</text>
  <text x="200" y="360" font-family="Arial, sans-serif" font-size="8" fill="#333" text-anchor="middle">doc-id: "prior-789"</text>
  
  <circle cx="600" cy="350" r="40" fill="#fff8e1" stroke="#ffc107" stroke-width="2" />
  <text x="600" y="345" font-family="Arial, sans-serif" font-size="11" fill="#ff6f00" text-anchor="middle" font-weight="bold">Follow-up</text>
  <text x="600" y="360" font-family="Arial, sans-serif" font-size="8" fill="#333" text-anchor="middle">doc-id: "follow-012"</text>
  
  <!-- Competing Documents -->
  <circle cx="150" cy="250" r="35" fill="#f3e5f5" stroke="#9c27b0" stroke-width="2" />
  <text x="150" y="245" font-family="Arial, sans-serif" font-size="10" fill="#4a148c" text-anchor="middle" font-weight="bold">Contradicts</text>
  <text x="150" y="260" font-family="Arial, sans-serif" font-size="7" fill="#333" text-anchor="middle">doc-id: "contra-345"</text>
  
  <circle cx="650" cy="250" r="35" fill="#f3e5f5" stroke="#9c27b0" stroke-width="2" />
  <text x="650" y="245" font-family="Arial, sans-serif" font-size="10" fill="#4a148c" text-anchor="middle" font-weight="bold">Extends</text>
  <text x="650" y="260" font-family="Arial, sans-serif" font-size="7" fill="#333" text-anchor="middle">doc-id: "extend-678"</text>
  
  <!-- Supporting Documents -->
  <circle cx="300" cy="400" r="30" fill="#ffebee" stroke="#f44336" stroke-width="2" />
  <text x="300" y="395" font-family="Arial, sans-serif" font-size="9" fill="#b71c1c" text-anchor="middle" font-weight="bold">Citation 1</text>
  <text x="300" y="408" font-family="Arial, sans-serif" font-size="7" fill="#333" text-anchor="middle">doc-id: "cite-901"</text>
  
  <circle cx="500" cy="400" r="30" fill="#ffebee" stroke="#f44336" stroke-width="2" />
  <text x="500" y="395" font-family="Arial, sans-serif" font-size="9" fill="#b71c1c" text-anchor="middle" font-weight="bold">Citation 2</text>
  <text x="500" y="408" font-family="Arial, sans-serif" font-size="7" fill="#333" text-anchor="middle">doc-id: "cite-234"</text>
  
  <!-- Connection Lines -->
  <!-- Research Paper to Data connections -->
  <line x1="353" y1="212" x2="290" y2="175" stroke="#4caf50" stroke-width="2" />
  <polygon points="293,170 280,168 285,180" fill="#4caf50" />
  <text x="310" y="185" font-family="Arial, sans-serif" font-size="9" fill="#1b5e20" transform="rotate(-30, 310, 185)">uses-data</text>
  
  <!-- Research Paper to Methods connections -->
  <line x1="447" y1="212" x2="510" y2="175" stroke="#4caf50" stroke-width="2" />
  <polygon points="507,170 520,168 515,180" fill="#4caf50" />
  <text x="490" y="185" font-family="Arial, sans-serif" font-size="9" fill="#1b5e20" transform="rotate(30, 490, 185)">uses-methods</text>
  
  <!-- Research Paper to Prior Study -->
  <line x1="350" y1="285" x2="235" y2="330" stroke="#ffc107" stroke-width="2" />
  <polygon points="242,335 230,340 232,325" fill="#ffc107" />
  <text x="280" y="320" font-family="Arial, sans-serif" font-size="9" fill="#ff6f00" transform="rotate(-30, 280, 320)">builds-on</text>
  
  <!-- Research Paper to Follow-up -->
  <line x1="450" y1="285" x2="565" y2="330" stroke="#ffc107" stroke-width="2" />
  <polygon points="558,335 570,340 568,325" fill="#ffc107" />
  <text x="525" y="320" font-family="Arial, sans-serif" font-size="9" fill="#ff6f00" transform="rotate(30, 520, 320)">leads-to</text>
  
  <!-- Research Paper to Contradicts -->
  <line x1="340" y1="250" x2="185" y2="250" stroke="#9c27b0" stroke-width="2" stroke-dasharray="5,3" />
  <polygon points="190,245 180,250 190,255" fill="#9c27b0" />
  <text x="265" y="240" font-family="Arial, sans-serif" font-size="9" fill="#4a148c">contradicts</text>
  
  <!-- Research Paper to Extends -->
  <line x1="460" y1="250" x2="615" y2="250" stroke="#9c27b0" stroke-width="2" stroke-dasharray="5,3" />
  <polygon points="610,245 620,250 610,255" fill="#9c27b0" />
  <text x="535" y="240" font-family="Arial, sans-serif" font-size="9" fill="#4a148c">extends</text>
  
  <!-- Research Paper to Citations -->
  <line x1="370" y1="300" x2="320" y2="370" stroke="#f44336" stroke-width="2" />
  <polygon points="325,365 315,375 315,365" fill="#f44336" />
  <text x="340" y="345" font-family="Arial, sans-serif" font-size="9" fill="#b71c1c" transform="rotate(-45, 340, 345)">cites</text>
  
  <line x1="430" y1="300" x2="480" y2="370" stroke="#f44336" stroke-width="2" />
  <polygon points="475,365 485,375 485,365" fill="#f44336" />
  <text x="460" y="345" font-family="Arial, sans-serif" font-size="9" fill="#b71c1c" transform="rotate(45, 460, 345)">cites</text>
  
  <!-- Legend -->
  <rect x="600" y="60" width="180" height="80" fill="#ffffff" stroke="#9e9e9e" stroke-width="1" rx="5" ry="5" />
  <text x="690" y="80" font-family="Arial, sans-serif" font-size="12" fill="#333" text-anchor="middle" font-weight="bold">Relationship Types</text>
  
  <line x1="620" y1="100" x2="640" y2="100" stroke="#4caf50" stroke-width="2" />
  <text x="645" y="104" font-family="Arial, sans-serif" font-size="10" fill="#333">uses</text>
  
  <line x1="620" y1="120" x2="640" y2="120" stroke="#ffc107" stroke-width="2" />
  <text x="645" y="124" font-family="Arial, sans-serif" font-size="10" fill="#333">temporal</text>
  
  <line x1="700" y1="100" x2="720" y2="100" stroke="#9c27b0" stroke-width="2" stroke-dasharray="5,3" />
  <text x="730" y="104" font-family="Arial, sans-serif" font-size="10" fill="#333">logical</text>
  
  <line x1="700" y1="120" x2="720" y2="120" stroke="#f44336" stroke-width="2" />
  <text x="730" y="124" font-family="Arial, sans-serif" font-size="10" fill="#333">citation</text>
</svg>`;

app.get('*', (c) => {
  return c.html(
    `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>MAGI: Markdown for Agent Guidance & Instruction</title>
      <style>
        :root {
          --primary-color: #005f73; /* Deep teal */
          --secondary-color: #0a9396; /* Teal */
          --accent-color: #94d2bd; /* Pale teal */
          --background-color: #f8f9fa; /* Light grey */
          --text-color: #212529; /* Dark grey */
          --heading-color: #003d4f; /* Darker teal */
          --link-color: #007bff; /* Standard blue */
          --link-hover-color: #0056b3;
          --border-color: #dee2e6;
          --card-bg: #ffffff;
          --code-bg: #e9ecef;
          --button-bg: var(--secondary-color);
          --button-hover-bg: var(--primary-color);
          --button-text: white;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
          line-height: 1.7;
          margin: 0;
          background-color: var(--background-color);
          color: var(--text-color);
        }
        .container {
          max-width: 960px;
          margin: 2rem auto;
          padding: 0 1.5rem;
        }
        header {
          text-align: center;
          padding: 3rem 0;
          background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
          color: white;
          border-bottom-left-radius: 10px;
          border-bottom-right-radius: 10px;
          margin-bottom: 3rem;
        }
        header h1 {
          margin: 0;
          font-size: 2.8rem;
          font-weight: 700;
        }
        header p {
          font-size: 1.2rem;
          opacity: 0.9;
          margin-top: 0.5rem;
        }
        h2 {
          color: var(--heading-color);
          border-bottom: 2px solid var(--accent-color);
          padding-bottom: 0.5em;
          margin-top: 2.5rem;
          margin-bottom: 1.5rem;
          font-size: 2rem;
          font-weight: 600;
        }
        h3 {
           color: var(--heading-color);
           margin-top: 2rem;
           font-size: 1.5rem;
           font-weight: 600;
        }
        a {
          color: var(--link-color);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        a:hover {
          color: var(--link-hover-color);
          text-decoration: underline;
        }
        code {
          background-color: var(--code-bg);
          padding: 0.2em 0.5em;
          border-radius: 4px;
          font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
          font-size: 0.9em;
        }
        ul {
          list-style: none;
          padding-left: 0;
        }
        li {
          margin-bottom: 0.8rem;
          padding-left: 1.5em;
          position: relative;
        }
        li::before {
          content: "✨"; /* Sparkle icon */
          position: absolute;
          left: 0;
          top: 0.1em;
          color: var(--secondary-color);
        }
        .section {
          background-color: var(--card-bg);
          padding: 2rem;
          margin-bottom: 2rem;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .svg-container {
          text-align: center;
          margin: 2rem 0;
          padding: 1rem;
          background-color: var(--card-bg);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .svg-container svg {
          max-width: 100%;
          height: auto;
        }
        .links-section {
          text-align: center;
          margin-top: 3rem;
          padding: 2rem;
          background-color: var(--primary-color);
          color: white;
          border-radius: 8px;
        }
        .links-section h2 {
          color: white;
          border-bottom-color: var(--accent-color);
        }
        .links-section ul {
          padding: 0;
        }
        .links-section li {
           padding-left: 0;
           margin-bottom: 0.5rem;
        }
        .links-section li::before {
           content: ""; /* Remove default icon */
        }
        .links-section a {
          color: var(--accent-color);
          font-weight: 600;
          font-size: 1.1rem;
        }
        .links-section a:hover {
          color: white;
        }
        /* Styles for the new url2mda section */
        .try-it-section {
          text-align: center;
          padding: 2.5rem;
          background-color: var(--accent-color); /* Use accent color */
          color: var(--heading-color); /* Darker text for contrast */
          border-radius: 8px;
          margin-bottom: 2rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .try-it-section h2 {
          color: var(--heading-color);
          border-bottom-color: var(--primary-color); /* Darker border */
        }
        .try-it-link {
          display: inline-block;
          background-color: var(--button-bg);
          color: var(--button-text);
          padding: 0.8rem 1.8rem;
          border-radius: 50px; /* Pill shape */
          text-decoration: none;
          font-weight: 600;
          font-size: 1.1rem;
          margin-top: 1rem;
          transition: background-color 0.2s ease, transform 0.2s ease;
        }
        .try-it-link:hover {
          background-color: var(--button-hover-bg);
          color: var(--button-text); /* Keep text white on hover */
          text-decoration: none;
          transform: translateY(-2px); /* Slight lift effect */
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
        }
        footer {
          text-align: center;
          margin-top: 4rem;
          padding: 1.5rem 0;
          color: #6c757d;
          font-size: 0.9rem;
          border-top: 1px solid var(--border-color);
        }
      </style>
    </head>
    <body>
      <header>
        <h1>📝 MAGI</h1>
        <p>Markdown for Agent Guidance & Instruction</p>
      </header>

      <div class="container">

        <section class="section">
          <h2>🎯 Motivation & Introduction</h2>
          <p>
            Large Language Models (LLMs) and AI agents increasingly rely on processing diverse content,
            but standard formats often lack the necessary structure and context for optimal performance.
            Converting complex web pages or documents into LLM-friendly plain text can be imprecise,
            losing valuable metadata and structural information.
          </p>
          <p>
            <strong>MAGI (Markdown for Agent Guidance & Instruction)</strong> addresses this challenge by extending standard Markdown
            with optional, structured components designed specifically for AI consumption. It enhances content for
            Retrieval-Augmented Generation (RAG), seamless integration with LLM agents, and robust knowledge graph construction.
            MAGI elegantly combines Markdown's readability with enhanced data for AI systems.
          </p>
        </section>

        <section class="section">
          <h2>🧩 Core Components</h2>
           <p>MAGI enhances standard Markdown by incorporating three key, <strong>optional</strong> components:</p>
           <ul>
            <li><strong>Structured Metadata (YAML Front Matter):</strong> Provides rich context (e.g., <code>doc-id</code>, <code>title</code>, <code>tags</code>, <code>purpose</code>).</li>
            <li><strong>Embedded AI Instructions (<code>ai-script</code> Code Blocks):</strong> Embeds structured JSON instructions for LLM processing directly within the content.</li>
            <li><strong>Explicit Document Relationships (Footnotes with JSON):</strong> Defines typed relationships between documents using structured JSON within standard footnotes (e.g., <code>parent</code>, <code>child</code>, <code>cites</code>).</li>
          </ul>
          <div class="svg-container">
            ${threePartsSvg}
          </div>
           <p><strong>Key Principle:</strong> All MAGI components are optional. Use only what you need, offering flexibility.</p>
        </section>

        <section class="section">
          <h2>🕸️ Knowledge Graph Construction</h2>
          <p>
            Leverage standard Markdown footnotes <code>[^ref-id]</code> with embedded JSON to define explicit, typed relationships
            between documents (identified by their unique <code>doc-id</code> in the Front Matter).
            This is essential for building robust knowledge graphs automatically.
          </p>
          <p>Relationship types include <code>parent</code>, <code>child</code>, <code>related</code>, <code>cites</code>, <code>supports</code>, <code>contradicts</code>, and more.</p>
           <div class="svg-container">
            ${docGraphSvg}
          </div>
          <p><strong>Benefits:</strong> Human-readable syntax combines with machine-processable structured data, enabling explicit connections and graph-ready content.</p>
        </section>

        <section class="section">
          <h2>🚀 Use Cases</h2>
           <p>MAGI is designed to solve real-world problems at the intersection of human and AI content processing:</p>
          <ul>
            <li><strong>Enhanced RAG Systems:</strong> Transform knowledge bases into MAGI format to improve retrieval quality and context understanding.</li>
            <li><strong>Multi-Agent Content Orchestration:</strong> Coordinate specialized AI agents working on the same content using embedded <code>ai-script</code> instructions.</li>
            <li><strong>Dynamic Documentation:</strong> Create living documentation where embedded scripts can trigger updates, while maintaining version relationships.</li>
            <li><strong>Automated Knowledge Graphs:</strong> Generate graphs from MAGI documents where relationships are explicitly defined.</li>
            <li><strong>Cross-Language Content Transformation:</strong> Maintain consistent document relationships across translations using UUID-based references.</li>
          </ul>
        </section>

        <!-- New Section for url2mda -->
        <section class="try-it-section">
          <h2>🪄 Try MAGI Instantly!</h2>
          <p>Want to see MAGI in action right away? Convert any public web page into MAGI format using the hosted <strong>url2mda</strong> service. Just paste a URL and get a MAGI <code>.mda</code> file—no installation required!</p>
          <a href="https://url2mda.sno.ai" target="_blank" rel="noopener noreferrer" class="try-it-link">Convert URL to MAGI Now</a>
        </section>

        <section class="links-section">
          <h2>🔗 Learn More & Get Started</h2>
          <ul>
            <li><a href="https://github.com/snoai/magi-markdown" target="_blank" rel="noopener noreferrer">GitHub Repository</a></li>
            <li><a href="https://docs.magi-mda.org" target="_blank" rel="noopener noreferrer">Official Documentation</a></li>
          </ul>
        </section>

      </div>

      <footer>
        <p>&copy; ${new Date().getFullYear()} MAGI Project. Licensed under MIT.</p>
      </footer>

    </body>
    </html>`
  )
})

export default app 