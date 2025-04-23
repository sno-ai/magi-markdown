import type { Env } from "../types";

/**
 * Formats Reddit API data into markdown.
 * @param data Raw data from the Reddit API.
 * @param subreddit The name of the subreddit.
 * @param originalUrl The original Reddit URL requested.
 * @returns Markdown string.
 */
function formatRedditData(data: any, subreddit: string, originalUrl: string): string {
	if (!data?.data?.children?.length) {
		return `# Subreddit: r/${subreddit}\n\nNo posts found or could not be fetched from this subreddit.`;
	}

	let md = `# Subreddit: r/${subreddit}\n\n`;

	for (const post of data.data.children) {
		const p = post.data;
		if (!p) continue;

		md += `## ${p.title || "Untitled post"}\n\n`;
		md += `- **Author:** u/${p.author || "unknown"}\n`;
		md += `- **Score:** ${p.score || 0}\n`;
		md += `- **Comments:** ${p.num_comments || 0}\n`;
		md += `- **Posted:** ${new Date(
			p.created_utc * 1000,
		).toLocaleString()}\n\n`;

		if (p.selftext) {
			// Limit text length with ellipsis if too long
			const maxLength = 500;
			const text = p.selftext.length > maxLength
					? p.selftext.substring(0, maxLength) + "..."
					: p.selftext;
			md += `${text}\n\n`;
		}

		if (p.url && !p.url.includes("reddit.com")) {
			md += `**Link:** [${p.url}](${p.url})\n\n`;
		}

		md += `**Reddit link:** [View full post](https://reddit.com${p.permalink})\n\n`;
		md += `---\n\n`;
	}

	md += `\nSource: [${originalUrl}](${originalUrl})`;
	return md;
}

/**
 * Fetches subreddit data using the public Reddit API (no authentication).
 * @param subreddit The name of the subreddit.
 * @param url The original Reddit URL.
 * @param env Cloudflare environment variables.
 * @param cacheKey The cache key for this request.
 * @returns Object containing markdown content and rate limit status.
 */
async function fetchRedditPublicApi(
	subreddit: string,
	url: string,
	env: Env,
	cacheKey: string,
): Promise<{ md: string; isRateLimited: boolean }> {
	try {
		console.log("[Reddit-Public] === STARTING PUBLIC API FETCH ===");
		const apiUrl = `https://www.reddit.com/r/${subreddit}/hot.json?limit=5`;
		console.log("[Reddit-Public] Fetching from public API:", apiUrl);

		const resp = await fetch(apiUrl, {
			method: "GET",
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
				Accept: "application/json",
				"Cache-Control": "no-cache",
			},
		});

		console.log(
			`[Reddit-Public] Public API response received: Status ${resp.status}`,
		);

		if (
			resp.status === 429 ||
			resp.headers.get("x-ratelimit-remaining") === "0"
		) {
			console.log(
				"[Reddit-Public] RATE LIMIT DETECTED from status code or headers",
			);
			return { md: "", isRateLimited: true };
		}

		if (!resp.ok) {
			console.log(
				`[Reddit-Public] Response not OK: ${resp.status} ${resp.statusText}`,
			);
			const errorText = await resp.text();
			console.log(
				`[Reddit-Public] Error response body: ${errorText.substring(0, 100)}...`,
			);

			if (errorText.includes("rate limit") || errorText.includes("ratelimit")) {
				console.log("[Reddit-Public] RATE LIMIT DETECTED in response text");
				return { md: "", isRateLimited: true };
			}
			console.log("[Reddit-Public] Returning error message (not rate limited)");
			return {
				md: `Failed to fetch from Reddit Public API: ${resp.status}`,
				isRateLimited: false,
			};
		}

		console.log("[Reddit-Public] Successfully received OK response");
		const responseText = await resp.text();
		console.log(
			"[Reddit-Public] API response length:",
			responseText.length,
		);

		let data;
		try {
			console.log("[Reddit-Public] Parsing JSON response");
			data = JSON.parse(responseText);
		} catch (parseError) {
			console.log("[Reddit-Public] JSON PARSE ERROR");
			console.error("[Reddit-Public] JSON parse error:", parseError);
			return {
				md: "Error parsing Reddit Public API response",
				isRateLimited: false,
			};
		}

		if (data.error) {
			console.log(`[Reddit-Public] API returned error: ${data.error}`);
			return {
				md: `Reddit API error: ${data.message || data.error}`,
				isRateLimited: false,
			};
		}

		console.log("[Reddit-Public] Formatting response data to markdown");
		const md = formatRedditData(data, subreddit, url);
		console.log("[Reddit-Public] Formatted data length:", md.length);
		if (md.length < 100) {
			console.warn(
				"[Reddit-Public] WARNING: Formatted content suspiciously short:",
				md,
			);
		}

		// Cache successful responses
		if (md && md.length > 100) {
			console.log("[Reddit-Public] Caching successful response");
			await env.MDA_CACHE.put(cacheKey, md, { expirationTtl: 3600 });
		}

		console.log("[Reddit-Public] === COMPLETED PUBLIC API FETCH ===");
		return { md, isRateLimited: false };
	} catch (error) {
		console.log("[Reddit-Public] === ERROR IN PUBLIC API FETCH ===");
		console.error("[Reddit-Public] Error in fetchRedditPublicApi:", error);
		return {
			md: `Error fetching Reddit public content: ${error instanceof Error ? error.message : String(error)}`,
			isRateLimited: false,
		};
	}
}

/**
 * Fetches subreddit data using the authenticated Reddit API (OAuth).
 * @param subreddit The name of the subreddit.
 * @param url The original Reddit URL.
 * @param env Cloudflare environment variables.
 * @param cacheKey The cache key for this request.
 * @returns Markdown string.
 */
async function fetchRedditAuthenticatedApi(
	subreddit: string,
	url: string,
	env: Env,
	cacheKey: string,
): Promise<string> {
	try {
		console.log("[Reddit-Auth] === STARTING AUTHENTICATED API FETCH ===");

		if (!env.REDDIT_CLIENT_ID || !env.REDDIT_CLIENT_SECRET) {
			console.error(
				"[Reddit-Auth] Missing REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET in environment variables.",
			);
			return "Reddit API credentials not configured.";
		}

		const tokenCacheKey = "Reddit:OAuthToken";
		let token = await env.MDA_CACHE.get(tokenCacheKey);

		console.log("[Reddit-Auth] Cached token available:", !!token);

		if (!token) {
			console.log("[Reddit-Auth] No cached token, requesting new token");
			const authString = `${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`;
			console.log("[Reddit-Auth] Sending token request to Reddit");
			const tokenResponse = await fetch(
				"https://www.reddit.com/api/v1/access_token",
				{
					method: "POST",
					headers: {
						Authorization: `Basic ${btoa(authString)}`,
						"Content-Type": "application/x-www-form-urlencoded",
						"User-Agent": "CloudflareWorker/1.0",
					},
					body: "grant_type=client_credentials&scope=read",
				},
			);

			console.log(
				`[Reddit-Auth] Token response received: Status ${tokenResponse.status}`,
			);

			if (!tokenResponse.ok) {
				console.log(
					`[Reddit-Auth] Token response not OK: ${tokenResponse.status}`,
				);
				const errorText = await tokenResponse.text();
				console.log(`[Reddit-Auth] Token error response: ${errorText}`);
				await env.MDA_CACHE.delete(tokenCacheKey);
				return `Failed to authenticate with Reddit: ${tokenResponse.status}`;
			}

			const tokenResponseText = await tokenResponse.text();
			console.log(
				`[Reddit-Auth] Token response received, length: ${tokenResponseText.length}`,
			);

			let tokenData;
			try {
				console.log("[Reddit-Auth] Parsing token response");
				tokenData = JSON.parse(tokenResponseText) as { access_token: string };
			} catch (parseError) {
				console.log("[Reddit-Auth] TOKEN PARSE ERROR");
				console.error("[Reddit-Auth] Failed to parse token response:", parseError);
				return `Failed to parse Reddit authentication response: ${tokenResponseText.substring(0, 100)}`;
			}

			token = tokenData.access_token;

			if (!token) {
				console.log("[Reddit-Auth] NO TOKEN IN RESPONSE");
				console.error("[Reddit-Auth] No token in response:", tokenResponseText);
				return `Reddit did not provide an access token: ${tokenResponseText.substring(0, 100)}`;
			}

			console.log("[Reddit-Auth] Successfully extracted token");
			console.log(
				"[Reddit-Auth] Received token (first 5 chars):",
				token.substring(0, 5) + "...",
			);

			if (token) {
				console.log("[Reddit-Auth] Caching token");
				await env.MDA_CACHE.put(tokenCacheKey, token, {
					expirationTtl: 3000,
				}); // 50 minutes
				console.log("[Reddit-Auth] Token cached successfully");
			} else {
				console.log("[Reddit-Auth] NO TOKEN TO CACHE");
				console.error("[Reddit-Auth] No token received from Reddit");
				return "Failed to obtain Reddit access token";
			}
		}

		console.log(
			"[Reddit-Auth] Token available, proceeding with authenticated request",
		);
		const apiUrl = `https://oauth.reddit.com/r/${subreddit}/hot?limit=5`;
		console.log("[Reddit-Auth] API URL:", apiUrl);

		console.log("[Reddit-Auth] Sending authenticated API request");
		const resp = await fetch(apiUrl, {
			headers: {
				Authorization: `Bearer ${token}`,
				"User-Agent": "url2mda/1.0 (by /u/sno_ai)", // Replace with actual user if needed
				Accept: "application/json",
			},
		});

		console.log(
			`[Reddit-Auth] Authenticated API response received: Status ${resp.status}`,
		);

		if (!resp.ok) {
			if (resp.status === 401) {
				console.log("[Reddit-Auth] UNAUTHORIZED: Invalid or expired token");
				await env.MDA_CACHE.delete(tokenCacheKey);
				return `Reddit authentication failed. Token may have expired.`;
			}

			console.log(`[Reddit-Auth] Response not OK: ${resp.status}`);
			const errorText = await resp.text();
			console.log(
				`[Reddit-Auth] Error response body: ${errorText.substring(0, 100)}...`,
			);
			console.error(
				`[Reddit-Auth] Authenticated API error: ${resp.status}`, errorText);
			return `Failed to fetch from Reddit API (authenticated): ${resp.status} - ${errorText.substring(0, 100)}`;
		}

		console.log("[Reddit-Auth] Successfully received OK response");
		const responseText = await resp.text();
		console.log("[Reddit-Auth] API response length:", responseText.length);

		let data;
		try {
			console.log("[Reddit-Auth] Parsing JSON response");
			data = JSON.parse(responseText);
		} catch (parseError) {
			console.log("[Reddit-Auth] JSON PARSE ERROR");
			console.error("[Reddit-Auth] Failed to parse API response:", parseError);
			return `Failed to parse Reddit API response: ${responseText.substring(0, 100)}`;
		}

		if (data.error) {
			console.log(`[Reddit-Auth] API returned error: ${data.error}`);
			console.error("[Reddit-Auth] API returned error:", data.error);
			return `Reddit API error: ${data.message || data.error}`;
		}

		console.log("[Reddit-Auth] Formatting response data to markdown");
		const md = formatRedditData(data, subreddit, url);
		console.log("[Reddit-Auth] Formatted data length:", md.length);

		if (md.length < 100) {
			console.warn(
				"[Reddit-Auth] WARNING: Formatted content suspiciously short:",
				md,
			);
		}

		// Cache successful response
		if (md && md.length > 100) {
			console.log("[Reddit-Auth] Caching successful response");
			await env.MDA_CACHE.put(cacheKey, md, { expirationTtl: 3600 });
		}

		console.log("[Reddit-Auth] === COMPLETED AUTHENTICATED API FETCH ===");
		return md;
	} catch (error) {
		console.log("[Reddit-Auth] === ERROR IN AUTHENTICATED API FETCH ===");
		console.error("[Reddit-Auth] Error in fetchRedditAuthenticatedApi:", error);
		return `Error fetching Reddit authenticated content: ${error instanceof Error ? error.message : String(error)}`;
	}
}

/**
 * Main function to fetch and format Reddit subreddit content.
 * Tries public API first, then falls back to authenticated API if needed.
 * Handles caching.
 * @param url The Reddit URL.
 * @param env Cloudflare environment variables.
 * @returns Markdown string.
 */
export async function handleRedditURL(
	url: string,
	env: Env,
): Promise<{ url: string; md: string; error?: boolean }> {
	try {
		console.log(`[Reddit] === STARTING FETCH FOR URL: ${url} ===`);
		const match = url.match(/reddit\.com\/r\/([A-Za-z0-9_-]+)/i);
		if (!match) {
			console.error("[Reddit] Invalid URL format:", url);
			return { url, md: "Invalid Reddit URL format", error: true };
		}

		const subreddit = match[1];
		console.log("[Reddit] Extracted subreddit:", subreddit);

		const cacheKey = `Reddit:${url}`;
		const cached = await env.MDA_CACHE.get(cacheKey);
		if (cached) {
			console.log("[Reddit] Using cached content for:", url);
			return { url, md: cached };
		}
		console.log("[Reddit] No cache found, proceeding with API fetch for:", url);

		// Try public API first
		console.log("[Reddit] Attempting public API fetch...");
		const publicApiResult = await fetchRedditPublicApi(
			subreddit,
			url,
			env,
			cacheKey,
		);
		console.log(
			"[Reddit] Public API result - isRateLimited:",
			publicApiResult.isRateLimited,
			"Has content:",
			!!publicApiResult.md,
		);

		if (!publicApiResult.isRateLimited && publicApiResult.md) {
			console.log("[Reddit] Public API successful, returning content.");
			// Cache handled within fetchRedditPublicApi
			return { url, md: publicApiResult.md };
		}

		if (publicApiResult.isRateLimited) {
			console.log(
				"[Reddit] Public API rate limited, attempting authenticated request...",
			);
		} else {
			console.log(
				"[Reddit] Public API failed or returned no content, attempting authenticated request...",
		);
		}

		// Try authenticated API as fallback
		const authResultMd = await fetchRedditAuthenticatedApi(
			subreddit,
			url,
			env,
			cacheKey,
		);
		console.log("[Reddit] Authenticated API completed, response length:", authResultMd.length);

		const hasErrorIndicators = authResultMd.includes("Failed to") ||
			authResultMd.includes("Error") ||
			authResultMd.includes("limit") || // covers rate limit or request limit
			authResultMd.includes("failed") || // covers general failure
			authResultMd.includes("not configured") || // credentials missing
			authResultMd.includes("authenticate"); // auth failure

		console.log(
			"[Reddit] Auth result contains error indicators:",
			hasErrorIndicators,
		);

		// Cache handled within fetchRedditAuthenticatedApi

		console.log(`[Reddit] === COMPLETED FETCH FOR URL: ${url} ===`);
		return { url, md: authResultMd, error: hasErrorIndicators };
	} catch (error) {
		console.log("[Reddit] === ERROR IN MAIN HANDLER ===");
		console.error("[Reddit] Error in handleRedditURL:", error);
		return {
			url,
			md: `Error processing Reddit URL: ${error instanceof Error ? error.message : String(error)}`,
			error: true,
		};
	}
} 