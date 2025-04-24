	/**
	 * Converts plain markdown to MAGI format with YAML frontmatter and optional AI script
	 * @param url The source URL
	 * @param markdown The markdown content to convert
	 * @returns The MAGI formatted string
	 */

import { v4 as uuidv4 } from 'uuid';

	/**
	 * Template tag function that handles stripping indentation from template literals
	 * to ensure clean output formatting.
	 */
	function cleanIndent(strings: TemplateStringsArray, ...values: any[]): string {
		// Combine the template parts with the values
		let result = '';
		for (let i = 0; i < strings.length; i++) {
			result += strings[i];
			if (i < values.length) {
				result += values[i];
			}
		}
		// Split into lines and remove any common leading whitespace
		const lines = result.split('\n');
		// Find the minimum indentation (excluding empty lines)
		const minIndent = lines
			.filter(line => line.trim().length > 0)
			.reduce((min, line) => {
				const match = line.match(/^\s*/);
				const leadingSpace = match ? match[0].length : 0;
				return Math.min(min, leadingSpace);
			}, Infinity);
		// Remove that indentation from each line
		return lines
			.map(line => line.trim().length > 0 ? line.substring(minIndent) : line.trim())
			.join('\n');
	}

	export function convertToMagiFormat(url: string, markdown: string): string {
		// Extract title from markdown (first h1 or document title)
		let title = 'Untitled Document';
		const titleMatch = markdown.match(/^# (.+)$/m);
		if (titleMatch && titleMatch[1]) {
			title = titleMatch[1];
		}

		// Generate current timestamp in ISO format
		const now = new Date().toISOString();
		
		// Extract description (first paragraph or first 150 chars)
		let description = '';
		const paragraphs = markdown.split('\n\n');
		for (const para of paragraphs) {
			const cleanPara = para.trim();
			// Skip headings, code blocks, etc.
			if (cleanPara && !cleanPara.startsWith('#') && !cleanPara.startsWith('```') && !cleanPara.startsWith('|') && !cleanPara.startsWith('!')) {
				description = cleanPara.replace(/\n/g, ' ').slice(0, 150);
				if (description.length === 150) description += '...';
				break;
			}
		}

		// Calculate approximate reading time (avg reading speed: 200 words per minute)
		const wordCount = markdown.split(/\s+/).length;
		const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));
		
		// Extract image URLs
		const imageMatches = [...markdown.matchAll(/!\[.*?\]\((https?:\/\/[^)]+)\)/g)];
		const images = imageMatches.map(match => match[1]).slice(0, 5); // Limit to 5 images
		
		// Extract potential entities (proper nouns, technical terms)
		const potentialEntities = new Set<string>();
		
		// Extract code terms
		const techTermsMatches = markdown.match(/`[^`]+`/g) || [];
		techTermsMatches.forEach(match => {
			const term = match.replace(/`/g, '').trim();
			if (term && term.length > 1) potentialEntities.add(term);
		});
		
		// Look for capitalized multi-word phrases (potential entities)
		const capitalizedPhraseMatches = markdown.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g) || [];
		capitalizedPhraseMatches.forEach(match => {
			if (match && match.length > 3) potentialEntities.add(match);
		});
		
		// Extract acronyms (all caps words of 2+ letters)
		const acronymMatches = markdown.match(/\b([A-Z]{2,})\b/g) || [];
		acronymMatches.forEach(match => {
			if (match && match.length >= 2 && match !== 'II' && match !== 'III' && match !== 'IV') {
				potentialEntities.add(match);
			}
		});
		
		const entities = Array.from(potentialEntities).slice(0, 10); // Limit to 10 entities

		// Determine document purpose by looking for pattern matches
		let purpose = 'information'; // Default purpose
		if (markdown.match(/\bhow\s+to\b/i) || 
			markdown.match(/\bstep\s+\d+\b/i) || 
			markdown.match(/\bguide\b/i) || 
			markdown.match(/\btutorial\b/i)) {
			purpose = 'tutorial';
		} else if (markdown.match(/\breference\b/i) || 
				  markdown.match(/\bspecification\b/i) || 
				  markdown.match(/\bdocumentation\b/i)) {
			purpose = 'reference';
		} else if (markdown.match(/\bopinion\b/i) || 
				  markdown.match(/\bthink\b/i) || 
				  markdown.match(/\bbelieve\b/i) || 
				  markdown.match(/\bargue\b/i)) {
			purpose = 'opinion';
		} else if (markdown.match(/\banalysis\b/i) || 
				  markdown.match(/\bresearch\b/i) || 
				  markdown.match(/\bstudy\b/i)) {
			purpose = 'analysis';
		}

		// Determine audience by keyword detection
		const audiences = [];
		if (markdown.match(/\bdeveloper[s]?\b/i) ||
			markdown.match(/\bcode\b/i) ||
			markdown.match(/\bprogramm(er|ing)\b/i) ||
			markdown.match(/\bengine(er|ering)\b/i)) {
			audiences.push('developers');
		}
		if (markdown.match(/\bdesigner[s]?\b/i) ||
			markdown.match(/\bUX\b/i) ||
			markdown.match(/\bUI\b/i) ||
			markdown.match(/\buser\s+experience\b/i)) {
			audiences.push('designers');
		}
		if (markdown.match(/\bmanager[s]?\b/i) ||
			markdown.match(/\bleader[s]?\b/i) ||
			markdown.match(/\bexecutive[s]?\b/i) ||
			markdown.match(/\bCEO\b/i) ||
			markdown.match(/\bCTO\b/i)) {
			audiences.push('managers');
		}
		if (markdown.match(/\bbeginner[s]?\b/i) ||
			markdown.match(/\bnovice[s]?\b/i) ||
			markdown.match(/\bintroduction\b/i)) {
			audiences.push('beginners');
		}
		if (audiences.length === 0) {
			audiences.push('general');
		}

		// Auto-detect tags based on content
		const tags = new Set<string>();
		// Add purpose as a tag
		tags.add(purpose);
		
		// Domain-specific tags based on terminology
		if (markdown.match(/\b(javascript|typescript|react|angular|vue|node\.?js)\b/i)) tags.add('web-development');
		if (markdown.match(/\b(python|django|flask|pandas|numpy)\b/i)) tags.add('python');
		if (markdown.match(/\b(ai|machine\s+learning|deep\s+learning|neural\s+network|llm|gpt)\b/i)) tags.add('artificial-intelligence');
		if (markdown.match(/\b(data\s+science|statistics|analytics|visualization|big\s+data)\b/i)) tags.add('data-science');
		if (markdown.match(/\b(cloud|aws|azure|google\s+cloud|serverless)\b/i)) tags.add('cloud-computing');
		if (markdown.match(/\b(devops|ci\/cd|pipeline|docker|kubernetes|k8s)\b/i)) tags.add('devops');
		if (markdown.match(/\b(security|encryption|authentication|authorization|oauth)\b/i)) tags.add('security');
		
		// Add extracted entities as tags if they match certain patterns
		entities.forEach(entity => {
			const lowerEntity = entity.toLowerCase();
			// If entity is a known technology or framework
			if (['react', 'angular', 'vue', 'node', 'python', 'java', 'javascript', 'typescript', 
				 'kubernetes', 'docker', 'aws', 'azure', 'gcp', 'ai', 'ml'].includes(lowerEntity)) {
				tags.add(lowerEntity);
			}
		});
		
		// Build YAML frontmatter with explicit line-by-line approach for proper formatting
		const yamlLines = [
			'---',
			`doc-id: "${uuidv4()}"`,
			`title: "${title.replace(/"/g, '\\"')}"`,
			`description: "${description.replace(/"/g, '\\"')}"`,
			`created-date: "${now}"`,
			`updated-date: "${now}"`,
			`source-url: "${url}"`,
			`purpose: "${purpose}"`,
			`audience: ${JSON.stringify(audiences)}`,
			`tags: ${JSON.stringify(Array.from(tags))}`,
			`reading-time-minutes: ${readingTimeMinutes}`
		];

		// Add images if available
		if (images.length > 0) {
			if (images.length === 1) {
				yamlLines.push(`image: "${images[0]}"`);
			} else {
				yamlLines.push('images-list:');
				images.forEach(img => {
					yamlLines.push(`  - "${img}"`);
				});
			}
		}

		// Add entities if available
		if (entities.length > 0) {
			yamlLines.push('entities:');
			entities.forEach(entity => {
				yamlLines.push(`  - "${entity.replace(/"/g, '\\"')}"`);
			});
		}

		// Close YAML frontmatter
		yamlLines.push('---');
		yamlLines.push(''); // Empty line after frontmatter

		// Start with the YAML frontmatter
		let magiDocument = yamlLines.join('\n');

		// Add the markdown content
		magiDocument += markdown;

		// Add AI script for summarization if content is long enough (>1000 chars for better summarization)
		if (markdown.length > 1000) {
			const summaryScript = [
				'',
				'<!-- AI-PROCESSOR: Content blocks marked with ```ai-script are instructions for AI systems -->',
				'```ai-script',
				'{',
				'  "script-id": "doc-summary-' + Date.now() + '",',
				'  "prompt": "Provide a concise summary of the main points covered in this document. Focus on the key information, main arguments, and important conclusions.",',
				'  "auto-run": true,',
				'  "priority": "medium",',
				'  "output-format": "markdown"',
				'}',
				'```'
			].join('\n');
			
			magiDocument += summaryScript;

			// For very long documents (>3000 chars), add entity extraction script
			if (markdown.length > 3000) {
				const entityScript = [
					'',
					'<!-- AI-PROCESSOR: Entity extraction for long documents -->',
					'```ai-script',
					'{',
					'  "script-id": "entity-extract-' + Date.now() + '",',
					'  "prompt": "Extract the key entities (people, organizations, technologies, concepts) mentioned in this document and provide a brief explanation of their significance in the context of this content.",',
					'  "auto-run": false,',
					'  "interactive-type": "button",',
					'  "interactive-label": "Extract Key Entities",',
					'  "priority": "low",',
					'  "output-format": "markdown"',
					'}',
					'```'
				].join('\n');
				
				magiDocument += '\n' + entityScript;
			}
		}

		return magiDocument;
	}
