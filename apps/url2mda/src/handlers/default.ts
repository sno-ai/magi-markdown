import puppeteer from '@cloudflare/puppeteer';
import type { Browser as PuppeteerBrowser, Page } from '@cloudflare/puppeteer';
import { SIMPLE_CONTENT_MAX_LENGTH } from '../constants';

/**
 * Fetches and processes a generic webpage to extract markdown content.
 * Uses Readability.js and TurndownService.
 * Provides fallbacks if libraries fail.
 * @param url The URL to process.
 * @param enableDetailedResponse Whether to use detailed mode (full page) or Readability mode.
 * @param browser The Puppeteer browser instance.
 * @returns Markdown string.
 */
export async function handleDefaultPage(url: string, enableDetailedResponse: boolean, browser: PuppeteerBrowser): Promise<string> {
	// Ensure SIMPLE_CONTENT_MAX_LENGTH is defined even if import fails
	const MAX_CONTENT_LENGTH = SIMPLE_CONTENT_MAX_LENGTH || 10000;
	
	let page: Page | null = null;
	try {
		console.log(`[DefaultHandler] Processing URL: ${url}`);
		page = await browser.newPage();
		// Increased timeout slightly
		await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 }); 

		// Add the required scripts with error handling
		try {
			console.log(`[DefaultHandler] Adding Readability and Turndown scripts for ${url}`);
			await page.addScriptTag({ url: 'https://unpkg.com/@mozilla/readability/Readability.js' });
			await page.addScriptTag({ url: 'https://unpkg.com/turndown/dist/turndown.js' });
			console.log(`[DefaultHandler] Scripts added successfully for ${url}`);
		} catch (scriptError) {
			console.error(`[DefaultHandler] Error adding script tags for ${url}:`, scriptError);
			// Fallback to simple body text extraction if scripts fail
			try {
				console.log(`[DefaultHandler] Falling back to simple text extraction for ${url}`);
				const fallbackContent = await page.evaluate((maxLength) => {
					const title = document.title || 'Untitled Page';
					const bodyText = document.body ? document.body.innerText : 'Could not access document body.';
					return `## ${title}\n\n${bodyText.slice(0, maxLength)}`;
				}, MAX_CONTENT_LENGTH);
				console.log(`[DefaultHandler] Fallback extraction successful for ${url}`);
				return fallbackContent;
			} catch (fallbackError) {
				console.error(`[DefaultHandler] Error during fallback extraction for ${url}:`, fallbackError);
				return `## Error\n\nFailed to extract content: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`;
			}
		}

		// Evaluate page content using Readability and Turndown
		console.log(`[DefaultHandler] Evaluating page content using libraries for ${url}`);
		const md = await page.evaluate((detailed, maxLength) => {
			try {
				if (typeof (globalThis as any).Readability !== 'function' || typeof (globalThis as any).TurndownService !== 'function') {
					throw new Error('Readability or TurndownService not available');
				}

				const turndownService = new (globalThis as any).TurndownService();
				let contentToConvert = '';

				if (detailed) {
					console.log('[DefaultHandler Eval] Using detailed mode (full document body)');
					// Clone to avoid modifying the live DOM, remove scripts/styles
					const docClone = document.cloneNode(true) as Document;
					docClone.querySelectorAll('script, style, iframe, noscript, svg, header, footer, nav').forEach(el => el.remove());
					contentToConvert = docClone.body ? docClone.body.innerHTML : '';
				} else {
					console.log('[DefaultHandler Eval] Using Readability mode');
					const reader = new (globalThis as any).Readability(document.cloneNode(true), {
						// Adjust parameters as needed
						// charThreshold: 250, // Default is 500, might reduce for more content
						// keepClasses: true, // Useful for debugging, maybe disable for cleaner output
					});
					const article = reader.parse();
					if (!article || !article.content) {
						console.warn('[DefaultHandler Eval] Readability parsing failed or returned no content.');
						// Fallback within evaluate: use body text
						contentToConvert = document.body ? document.body.innerHTML : ''; 
					} else {
						contentToConvert = article.content;
					}
				}

				if (!contentToConvert) {
					console.warn('[DefaultHandler Eval] No content identified for conversion, using innerText fallback.');
					return `## ${document.title || 'Untitled Page'}\n\n${(document.body ? document.body.innerText : '').slice(0, maxLength)}`;
				}

				console.log(`[DefaultHandler Eval] Running Turndown on content (length: ${contentToConvert.length})`);
				const markdown = turndownService.turndown(contentToConvert);
				console.log(`[DefaultHandler Eval] Turndown conversion complete (output length: ${markdown.length})`);
				return markdown;

			} catch (evalError) {
				console.error('[DefaultHandler Eval] Error during page evaluation:', evalError);
				// Final fallback within evaluate: simple text extraction
				const title = document.title || 'Untitled Page';
				const content = document.body ? document.body.innerText : 'Could not access body text.';
				return `## ${title}\n\n(Evaluation Error: ${evalError instanceof Error ? evalError.message : String(evalError)})\n\n${content.slice(0, maxLength)}`;
			}
		}, enableDetailedResponse, MAX_CONTENT_LENGTH);

		console.log(`[DefaultHandler] Page evaluation completed for ${url}. Markdown length: ${md.length}`);
		return md;

	} catch (error) {
		console.error(`[DefaultHandler] Error processing page ${url}:`, error);
		// Check for specific timeout error
		if (error instanceof Error && error.message.includes('Navigation timeout')) {
			return `## Error: Navigation Timeout\n\nFailed to load page ${url} within the time limit. The server might be slow or the page too complex.`;
		}
		return `## Error\n\nFailed to process page ${url}: ${error instanceof Error ? error.message : String(error)}`;
	} finally {
		if (page) {
			try {
				await page.close();
				console.log(`[DefaultHandler] Closed page successfully for ${url}`);
			} catch (closeError) {
				console.error(`[DefaultHandler] Error closing page for ${url}:`, closeError);
			}
		}
	}
} 