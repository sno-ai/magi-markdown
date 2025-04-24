/// <reference lib="dom" />
import puppeteer from '@cloudflare/puppeteer';
import type { Browser as PuppeteerBrowser, Page } from '@cloudflare/puppeteer';

import { convertToMagiFormat } from './magi-util/convert-magi';
import { applyLlmFilter } from './llm-process/llm-filter';

import { html } from './response';
import type { Env } from './types';
import { isValidUrl } from './utils';
import { 
	KEEP_BROWSER_ALIVE_IN_SECONDS, 
	TEN_SECONDS, 
} from './constants';
import {
	getYouTubeMetadata,
	handleTwitterProfilePage,
	handleTwitterTweetPage,
	handleRedditURL,
	handleDefaultPage
} from './handlers';

// Main Cloudflare Worker entry point
export default {
	async fetch(request: Request, env: Env) {
		// console.log("\n");
		// console.log("🚀🚀🚀 ---> Worker Fetch Handler Entered <--- 🚀🚀🚀");
		try {
			// Rate Limiting (apply before routing to Durable Object)
			const ip = request.headers.get('cf-connecting-ip');
			const isAuthorized = env.BACKEND_SECURITY_TOKEN === request.headers.get('Authorization')?.replace('Bearer ', '');
		
			if (!isAuthorized) {
				console.log(`[Worker] Rate limiting check for IP: ${ip ?? 'no-ip'}`);
				const { success } = await env.RATELIMITER.limit({ key: ip ?? 'no-ip' });
				if (!success) {
					console.warn(`[Worker] Rate limit exceeded for IP: ${ip ?? 'no-ip'}`);
					return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { 
						status: 429,
						headers: { 'Content-Type': 'application/json' }
					});
				}
				console.log(`[Worker] Rate limit passed for IP: ${ip ?? 'no-ip'}`);
			}

			// Route to Durable Object
			// console.log("[Worker] Getting Durable Object ID");
			const id = env.BROWSER.idFromName('browser');
			// console.log(`[Worker] Durable Object ID: ${id}`);
			// console.log("[Worker] Getting Durable Object instance");
			const obj = env.BROWSER.get(id);
			// console.log("[Worker] Forwarding request to Durable Object");
			const resp = await obj.fetch(request.url, { headers: request.headers });
			// console.log("[Worker] Received response from Durable Object");
			return resp;
		} catch (error) {
			console.error('[Worker] Error in main fetch handler:', error);
			return new Response(JSON.stringify({ 
				error: 'Server error',
				message: error instanceof Error ? error.message : String(error)
			}), { 
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	},
};

// Durable Object Class
export class Browser {
	state: DurableObjectState;
	env: Env;
	keptAliveInSeconds: number;
	storage: DurableObjectStorage;
	browser?: PuppeteerBrowser; // Made optional as it's initialized later
	request?: Request; // Made optional
	llmFilter: boolean;
	token: string;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.env = env;
		this.keptAliveInSeconds = 0;
		this.storage = this.state.storage; // Use state.storage directly
		this.request = undefined;
		this.llmFilter = false;
		this.token = '';
		
		// Initialize storage within the constructor
		this.state.blockConcurrencyWhile(async () => {
            let stored = await this.storage.get<number>("keptAliveInSeconds");
            this.keptAliveInSeconds = stored || 0;
        });
	}

	// Main fetch handler for the Durable Object
	async fetch(request: Request): Promise<Response> {
		// console.log("\n🚀🚀🚀 ---> DO Fetch Handler Entered <--- 🚀🚀🚀");
		try {
			this.request = request;

			if (request.method !== 'GET') {
				console.warn("[DO] Method not allowed:", request.method);
				return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
					status: 405,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			// Parse URL and parameters
			const urlParams = new URL(request.url).searchParams;
			const url = urlParams.get('url');
			const htmlDetails = urlParams.get('htmlDetails') === 'true';
			const crawlSubpages = urlParams.get('subpages') === 'true';
			const contentType = request.headers.get('content-type') === 'application/json' ? 'json' : 'text';
			this.token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
			this.llmFilter = urlParams.get('llmFilter') === 'true';

			// console.log(`[DO] Request Params: url=${url}, htmlDetails=${htmlDetails}, crawlSubpages=${crawlSubpages}, contentType=${contentType}, llmFilter=${this.llmFilter}`);

			// Input Validation
			if (contentType === 'text' && crawlSubpages) {
				console.error("[DO] Invalid parameter combination: text content type with crawl subpages");
				return new Response(JSON.stringify({ error: 'Error: Crawl subpages can only be enabled with JSON content type' }), { 
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			if (!url) {
				console.log("[DO] No URL provided, returning help page.");
				return this.buildHelpResponse();
			}

			if (!isValidUrl(url)) {
				console.error("[DO] Invalid URL provided:", url);
				return new Response(JSON.stringify({ error: 'Invalid URL provided, should be a full URL starting with http:// or https://' }), { 
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			// Ensure browser is running
			console.log("[DO] Ensuring browser instance is active...");
			if (!(await this.ensureBrowser())) {
				console.error("[DO] Failed to ensure browser instance.");
				return new Response(JSON.stringify({ error: 'Could not start or connect to browser instance' }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			console.log("[DO] Browser instance is active.");

			// Process request
			if (crawlSubpages) {
				console.log(`[DO] Starting subpage crawl for: ${url}`);
				return this.crawlSubpages(url, htmlDetails, contentType);
			} else {
				console.log(`[DO] Processing single page: ${url}`);
				return this.processSinglePage(url, htmlDetails, contentType);
			}
		} catch (error) {
			console.error('[DO] Error in Browser.fetch:', error);
			return new Response(JSON.stringify({ 
				error: 'Durable Object fetch error',
				message: error instanceof Error ? error.message : String(error)
			}), { 
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		} finally {
			// Reset keptAliveInSeconds after processing a request
			this.keptAliveInSeconds = 0;
			// console.log("[DO] Reset keptAliveInSeconds counter.");
			// Ensure alarm is set to keep the DO alive or eventually shut down the browser
			this.ensureAlarmIsSet();
		}
	}
	
	async ensureAlarmIsSet() {
		const currentAlarm = await this.storage.getAlarm();
		if (currentAlarm === null) {
			console.log("[DO] No alarm set, setting keep-alive alarm.");
			await this.storage.setAlarm(Date.now() + TEN_SECONDS);
		}
	}

	async ensureBrowser(): Promise<boolean> {
		let retries = 3;
		while (retries > 0) {
			if (!this.browser || !(await this.isBrowserConnected())) {
				console.log(`[DO Browser] Browser not connected or initialized. Attempting to launch (Retries left: ${retries})...`);
				try {
					this.browser = await puppeteer.launch(this.env.MYBROWSER);
					console.log("[DO Browser] New browser instance launched successfully.");
					return true;
				} catch (e) {
					console.error(`[DO Browser] Could not launch browser instance. Error: ${e}`);
					retries--;
					if (!retries) {
						console.error("[DO Browser] Max retries reached. Failed to launch browser.");
						return false;
					}

					// Attempt to clean up potentially broken sessions
					console.log("[DO Browser] Attempting to clean up existing browser sessions...");
					try {
						const sessions = await puppeteer.sessions(this.env.MYBROWSER);
						console.log(`[DO Browser] Found ${sessions.length} sessions.`);
						for (const session of sessions) {
							console.log(`[DO Browser] Attempting to connect and close session: ${session.sessionId}`);
							try {
							const b = await puppeteer.connect(this.env.MYBROWSER, session.sessionId);
							await b.close();
								console.log(`[DO Browser] Closed session: ${session.sessionId}`);
							} catch (closeError) {
								console.warn(`[DO Browser] Failed to close session ${session.sessionId}:`, closeError);
							}
						}
					} catch (sessionError) {
						console.error(`[DO Browser] Failed to list or clean up sessions: ${sessionError}`);
					}
					console.log(`[DO Browser] Retrying browser launch...`);
				}
			} else {
				console.log("[DO Browser] Existing browser instance is connected.");
				return true; // Browser exists and is connected
			}
		}
		return false; // Should not be reached if retries > 0
	}

	async isBrowserConnected(): Promise<boolean> {
		if (!this.browser) return false;
		try {
			// Try to get browser version as a lightweight operation to check connection
			await this.browser.version();
			return true;
		} catch (e) {
			console.log("[DO Browser] Browser connection check failed:", e);
			return false;
		}
	}

	async crawlSubpages(baseUrl: string, enableDetailedResponse: boolean, contentType: string): Promise<Response> {
		let page: Page | null = null;
		try {
			console.log(`[DO Crawl] Starting crawl for base URL: ${baseUrl}`);
			page = await this.browser!.newPage();
			console.log(`[DO Crawl] Navigating to base URL: ${baseUrl}`);
			await page.goto(baseUrl, { waitUntil: 'networkidle0' });
			console.log(`[DO Crawl] Extracting links from: ${baseUrl}`);
			const links = await this.extractLinks(page, baseUrl);
			console.log(`[DO Crawl] Found ${links.length} links on ${baseUrl}.`);
			await page.close(); // Close the page used for link extraction
			page = null; // Ensure page is marked as closed

			const uniqueLinks = Array.from(new Set(links)).slice(0, 10); // Limit to 10 unique links
			console.log(`[DO Crawl] Processing ${uniqueLinks.length} unique subpages.`);

			const results = await this.getWebsiteMarkdown({
				urls: uniqueLinks,
				enableDetailedResponse,
			});

			// Convert all results to MAGI format
			const magiResults = results.map(result => {
				if (!result.error) {
					result.md = convertToMagiFormat(result.url, result.md);
				}
				return result;
			});

			let status = 200;
			if (magiResults.some((item) => item.error && item.md === 'Rate limit exceeded')) {
				console.warn(`[DO Crawl] Rate limit hit during subpage processing for ${baseUrl}`);
				status = 429;
			}

			console.log(`[DO Crawl] Finished crawl for ${baseUrl}. Returning ${magiResults.length} results with status ${status}.`);
			return new Response(JSON.stringify(magiResults), {
				status: status,
				headers: { 'Content-Type': 'application/json' }
			});
		} catch (error) {
			console.error(`[DO Crawl] Error crawling subpages for ${baseUrl}:`, error);
			return new Response(JSON.stringify({ 
				error: 'Failed to crawl subpages',
				message: error instanceof Error ? error.message : String(error),
				url: baseUrl
			}), { 
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		} finally {
			if (page) {
				try { await page.close(); } catch (e) { console.error("[DO Crawl] Error closing page in finally block:", e); }
			}
		}
	}


	async processSinglePage(url: string, enableDetailedResponse: boolean, contentType: string): Promise<Response> {
		try {
			console.log(`[DO SinglePage] Processing URL: ${url}`);
			const results = await this.getWebsiteMarkdown({
				urls: [url],
				enableDetailedResponse,
			});

			const result = results[0]; // Get the single result
			let status = result.error ? (result.status || 500) : 200;
			if (result.md === 'Rate limit exceeded') {
				status = 429;
			}

			console.log(`[DO SinglePage] Finished processing ${url}. Status: ${status}, ContentType: ${contentType}`);
			
			if (contentType === 'json') {
				// Convert to MAGI format for JSON output as well
				if (!result.error) {
					result.md = convertToMagiFormat(url, result.md);
				}
				// Always return array for JSON, even with errors
				return new Response(JSON.stringify(results), {
					status: status,
					headers: { 'Content-Type': 'application/json' }
				});
			} else { // contentType === 'text'
				if (result.error) {
					// For text errors, return JSON error object for clarity
					console.error(`[DO SinglePage] Error processing ${url} for text response:`, result.errorDetails);
					return new Response(JSON.stringify({ 
						error: result.md, 
						message: result.errorDetails || 'Error processing page', 
						url: url 
					}), {
					status: status,
					headers: { 'Content-Type': 'application/json' }
				});
				} else {
					// Successful text response - convert to MAGI format
					const magiContent = convertToMagiFormat(url, result.md);
					return new Response(magiContent, {
						status: status,
						headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
					});
				}
			}
		} catch (error) {
			console.error(`[DO SinglePage] Unexpected error processing ${url}:`, error);
			const errorResponse = {
				error: 'Failed to process page',
				message: error instanceof Error ? error.message : String(error),
				url: url
			};
			
			// Return JSON error regardless of requested contentType on unexpected errors
			return new Response(JSON.stringify(contentType === 'json' ? [errorResponse] : errorResponse), {
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				});
		}
	}

	async extractLinks(page: Page, baseUrl: string): Promise<string[]> {
		try {
			// console.log(`[DO LinkExtract] Extracting links from ${baseUrl}`);
			return await page.evaluate((base) => {
				// Ensure base ends with / for correct startsWith check
				const normalizedBase = base.endsWith('/') ? base : base + '/';
				return Array.from(document.querySelectorAll('a'))
					.map(link => (link as HTMLAnchorElement).href)
					.filter(link => {
						try {
							// Basic validation and ensure it's http/https
							if (!link || !link.startsWith('http')) return false;
							const linkUrl = new URL(link);
							// Check if it starts with the base URL (ignoring potential trailing slash differences)
							return linkUrl.href.startsWith(normalizedBase) || linkUrl.href === base;
						} catch (e) {
							// Ignore invalid URLs during mapping/filtering
							return false;
						}
					});
			}, baseUrl);
		} catch (error) {
			console.error(`[DO LinkExtract] Error extracting links from ${baseUrl}:`, error);
			return [];
		}
	}

	/**
	 * Orchestrates fetching markdown for multiple URLs, routing to specific handlers.
	 */
	async getWebsiteMarkdown({ urls, enableDetailedResponse }: {
		urls: string[];
		enableDetailedResponse: boolean;
	}): Promise<{ url: string; md: string; error?: boolean; status?: number; errorDetails?: string }[]> {
		console.log(`[DO GetMarkdown] Processing ${urls.length} URLs. Detailed: ${enableDetailedResponse}, LLM Filter: ${this.llmFilter}`);
		try {
			const isBrowserActive = await this.ensureBrowser();
			if (!isBrowserActive) {
				console.error("[DO GetMarkdown] Browser instance not active. Cannot process URLs.");
				return urls.map(url => ({ url, md: '[Browser] Could not start browser instance', error: true, status: 500 }));
			}

			// Process all URLs in parallel
			const results = await Promise.all(
				urls.map(async (url): Promise<{ url: string; md: string; error?: boolean; status?: number; errorDetails?: string }> => {
					try {
						// --- Rate Limiting Check (within parallel processing) ---
						const ip = this.request?.headers.get('cf-connecting-ip');
						if (this.token !== this.env.BACKEND_SECURITY_TOKEN) {
							const { success } = await this.env.RATELIMITER.limit({ key: ip ?? 'no-ip' });
							if (!success) {
								console.warn(`[DO GetMarkdown] Rate limit exceeded for ${url} (IP: ${ip ?? 'no-ip'})`);
								return { url, md: 'Rate limit exceeded', error: true, status: 429 };
							}
						}
						// --- End Rate Limiting Check ---

						console.log(`[DO GetMarkdown] Processing URL: ${url}`);
						const cacheIdBase = url + (enableDetailedResponse ? '-detailed' : '') + (this.llmFilter ? '-llm' : '');

						let result: { url: string; md: string; error?: boolean; status?: number; errorDetails?: string };

						// --- URL Routing --- 
						if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
							console.log(`[DO GetMarkdown] Routing to YouTube handler for: ${url}`);
							const md = await getYouTubeMetadata(url, this.env);
							result = { url, md }; // YouTube handler includes caching
						
						} else if (url.startsWith('https://x.com') || url.startsWith('https://twitter.com')) {
							const urlParts = url.split('/');
							const lastPart = urlParts[urlParts.length - 1];
							// Simpler check: is the last part likely a user ID or a status ID?
							const isLikelyStatus = /^[0-9]+$/.test(lastPart?.split('?')[0] ?? '');

							if (!isLikelyStatus && urlParts.length > 3) { // Assume profile if not status and has path beyond domain
								console.log(`[DO GetMarkdown] Routing to Twitter profile handler for: ${url}`);
								result = await handleTwitterProfilePage(url, this.browser!, this.env);
							} else if (isLikelyStatus) { // Assume tweet if last part is numeric
								console.log(`[DO GetMarkdown] Routing to Twitter tweet handler for: ${url}`);
								result = await handleTwitterTweetPage(url, this.env);
							} else {
								console.warn(`[DO GetMarkdown] Could not determine Twitter URL type: ${url}. Falling back to default.`);
								result = { url, md: await handleDefaultPage(url, enableDetailedResponse, this.browser!), error: false }; // Assume no error initially for default
							}

						} else if (url.includes('reddit.com/r/')) {
							console.log(`[DO GetMarkdown] Routing to Reddit handler for: ${url}`);
							result = await handleRedditURL(url, this.env); // Reddit handler includes caching

						} else { // Default handler for other URLs
							console.log(`[DO GetMarkdown] Routing to default page handler for: ${url}`);
							// Check cache for default pages
							const cacheKey = `Default:${cacheIdBase}`;
							const cached = await this.env.MDA_CACHE.get(cacheKey);
							if (cached) {
								console.log(`[DO GetMarkdown] Using cached content for default URL: ${url}`);
								result = { url, md: cached };
							} else {
								console.log(`[DO GetMarkdown] No cache for default URL: ${url}, fetching...`);
								const md = await handleDefaultPage(url, enableDetailedResponse, this.browser!);
								result = { url, md }; // Assume success initially
								// Check if the handler returned an error message
								if (md.startsWith('## Error')) {
									console.warn(`[DO GetMarkdown] Default handler returned error for ${url}`);
									result.error = true;
									result.status = md.includes('Timeout') ? 504 : 500; // Specific status for timeout
									result.errorDetails = md;
								} else if (this.llmFilter && !result.error) {
									// Apply LLM Filter ONLY if default fetch was successful and filter is enabled
									console.log(`[DO GetMarkdown] Applying LLM filter for: ${url}`);
									result.md = await applyLlmFilter(md, this.env);
								}
								// Cache the final result (original, error, or filtered) for default pages
								if (!result.error) {
									await this.env.MDA_CACHE.put(cacheKey, result.md, { expirationTtl: 3600 });
									console.log(`[DO GetMarkdown] Cached content for default URL: ${url}`);
								}
							}
						}
						// --- End URL Routing ---

						return result;

					} catch (error) {
						console.error(`[DO GetMarkdown] Error processing URL ${url} in parallel map:`, error);
						return { 
							url, 
							md: 'Failed to process page due to unexpected error',
							error: true,
							status: 500,
							errorDetails: error instanceof Error ? error.message : String(error)
						};
					}
				})
			);
			console.log(`[DO GetMarkdown] Finished processing all ${urls.length} URLs.`);
			return results;
		} catch (error) {
			console.error('[DO GetMarkdown] General error in getWebsiteMarkdown:', error);
			// Return error for all URLs if a general error occurs (e.g., browser init failed)
			return urls.map(url => ({
				url,
				md: 'Failed to get website markdown due to a system error',
				error: true,
				status: 500,
				errorDetails: error instanceof Error ? error.message : String(error)
			}));
		}
	}



	/**
	 * Builds the HTML response for the help page.
	 */
	buildHelpResponse(): Response {
		console.log("[DO] Building help page response.");
		return new Response(html, {
			headers: { 'content-type': 'text/html;charset=UTF-8' },
		});
	}

	/**
	 * Handles the scheduled alarm for the Durable Object.
	 * Used to keep the browser alive or shut it down after inactivity.
	 */
	async alarm() {
		// console.log(`[DO Alarm] Alarm triggered. keptAliveInSeconds: ${this.keptAliveInSeconds}`);
		try {
			this.keptAliveInSeconds += 10; // Increment by alarm interval (10 seconds)

			if (this.keptAliveInSeconds < KEEP_BROWSER_ALIVE_IN_SECONDS) {
				// Browser is active and recent; set the alarm again
				// console.log(`[DO Alarm] Keep-alive threshold not reached (${this.keptAliveInSeconds}s < ${KEEP_BROWSER_ALIVE_IN_SECONDS}s). Setting alarm again.`);
				await this.storage.setAlarm(Date.now() + TEN_SECONDS);
			} else {
				// Inactivity threshold reached; shut down the browser
				// console.log(`[DO Alarm] Keep-alive threshold reached (${this.keptAliveInSeconds}s >= ${KEEP_BROWSER_ALIVE_IN_SECONDS}s). Shutting down browser.`);
				if (this.browser) {
					// console.log("[DO Alarm] Closing browser instance...");
					try {
					await this.browser.close();
						// console.log("[DO Alarm] Browser instance closed successfully.");
					} catch (closeError) {
						console.error("[DO Alarm] Error closing browser instance:", closeError);
					}
					this.browser = undefined; // Clear the browser instance variable
				}
				// Do not set the alarm again; it will be set on the next fetch request
				// console.log("[DO Alarm] Browser shut down. Alarm will be reset on next request.");
			}
			// Persist the updated keptAliveInSeconds count
			await this.storage.put("keptAliveInSeconds", this.keptAliveInSeconds);
		} catch (error) {
			console.error('[DO Alarm] Error in alarm handler:', error);
			// Attempt to set alarm again even if there was an error to prevent DO from becoming unresponsive
			try {
				await this.storage.setAlarm(Date.now() + TEN_SECONDS);
			} catch (setAlarmError) {
				console.error('[DO Alarm] Failed to set alarm after error:', setAlarmError);
			}
		}
	}
}

