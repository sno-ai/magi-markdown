import { type Page, type Browser as PuppeteerBrowser } from '@cloudflare/puppeteer';
import { type Tweet } from 'react-tweet/api';
import type { Env } from '../types';
import { TWITTER_TIMEOUT, LOAD_MORE_TWEETS_SCROLL_AMOUNT, LOAD_MORE_TWEETS_SCROLL_DELAY } from '../constants';

/**
 * Fetches data for a single tweet using the Twitter syndication API.
 * @param tweetID The ID of the tweet.
 * @param env Cloudflare environment variables.
 * @returns Tweet data or null if fetching fails.
 */
async function getTweet(tweetID: string, env: Env): Promise<Tweet | null> {
	// Use cache first
	const cacheKey = `Twitter:${tweetID}`;
	const cacheFind = await env.MD_CACHE.get(cacheKey + ':raw');
	if (cacheFind) {
		console.log(`[Twitter] Using cached raw tweet data for ${tweetID}`);
		try {
			return JSON.parse(cacheFind);
		} catch (e) {
			console.error(`[Twitter] Failed to parse cached JSON for ${tweetID}:`, e);
			// If parsing fails, proceed to fetch again
		}
	}

	console.log(`[Twitter] No cache or parse failed for raw data ${tweetID}, fetching from API`);
	try {
		const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetID}&lang=en&features=tfw_timeline_list%3A%3Btfw_follower_count_sunset%3Atrue%3Btfw_tweet_edit_backend%3Aon%3Btfw_refsrc_session%3Aon%3Btfw_fosnr_soft_interventions_enabled%3Aon%3Btfw_show_birdwatch_pivots_enabled%3Aon%3Btfw_show_business_verified_badge%3Aon%3Btfw_duplicate_scribes_to_settings%3Aon%3Btfw_use_profile_image_shape_enabled%3Aon%3Btfw_show_blue_verified_badge%3Aon%3Btfw_legacy_timeline_sunset%3Atrue%3Btfw_show_gov_verified_badge%3Aon%3Btfw_show_business_affiliate_badge%3Aon%3Btfw_tweet_edit_frontend%3Aon&token=4c2mmul6mnh`;

		const resp = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
				Accept: 'application/json',
				'Accept-Language': 'en-US,en;q=0.5',
				'Accept-Encoding': 'gzip, deflate, br',
				Connection: 'keep-alive',
				'Upgrade-Insecure-Requests': '1',
				'Cache-Control': 'max-age=0',
				TE: 'Trailers',
			},
		});
		console.log(`[Twitter] API response status for ${tweetID}: ${resp.status}`);

		if (!resp.ok) {
			console.error(`[Twitter] API error for ${tweetID}: ${resp.status} ${resp.statusText}`);
			return null;
		}

		const data = (await resp.json()) as Tweet;

		// Cache the raw tweet data
		await env.MD_CACHE.put(cacheKey + ':raw', JSON.stringify(data), { expirationTtl: 3600 });
		console.log(`[Twitter] Cached raw tweet data for ${tweetID}`);

		return data;
	} catch (error) {
		console.error(`[Twitter] Error fetching tweet ${tweetID}:`, error);
		return null;
	}
}

/**
 * Handles scraping a Twitter profile page.
 * @param url The profile URL.
 * @param browser The Puppeteer browser instance.
 * @param env Cloudflare environment variables.
 * @returns Markdown content or error object.
 */
export async function handleTwitterProfilePage(url: string, browser: PuppeteerBrowser, env: Env): Promise<{ url: string, md: string, error?: boolean }> {
	const cacheKey = `TwitterProfile:${url}`;
	const cached = await env.MD_CACHE.get(cacheKey);
	if (cached) {
		console.log(`[Twitter] Using cached profile content for ${url}`);
		return { url, md: cached };
	}

	console.log(`[Twitter] No cache found for profile ${url}, scraping...`);
	const username = url.split('/').pop() || url.split('/')[url.split('/').length - 2]; // Handle trailing slash
	let page: Page | null = null;
	try {
		page = await browser.newPage();
		await page.goto(url, { waitUntil: 'networkidle0', timeout: TWITTER_TIMEOUT * 2 }); // Longer timeout for profiles

		// Wait for tweets to load
		try {
			await page.waitForSelector('article', { timeout: TWITTER_TIMEOUT });
		} catch (e) {
			console.warn(`[Twitter] Timeout or error waiting for articles on profile ${url}. Trying to proceed.`);
			// Attempt to extract basic profile info even if tweets don't load
		}

		// Scroll down to load more tweets if possible
		try {
			await page.evaluate((scrollAmount, scrollDelay) => {
				window.scrollBy(0, scrollAmount);
				return new Promise(resolve => setTimeout(resolve, scrollDelay));
			}, LOAD_MORE_TWEETS_SCROLL_AMOUNT, LOAD_MORE_TWEETS_SCROLL_DELAY);
		} catch (scrollError) {
			console.warn(`[Twitter] Error scrolling profile page ${url}:`, scrollError);
		}

		const profileContent = await page.evaluate((profileUsername) => {
			const tweets = Array.from(document.querySelectorAll('article')).map(tweet => {
				const rawText = tweet.innerText;

				// Attempt to isolate tweet text more reliably
				let tweetText = '';
				const textElement = tweet.querySelector('[data-testid="tweetText"]');
				if (textElement) {
					tweetText = (textElement as HTMLElement).innerText;
				} else {
					// Fallback: try to clean up the full article text
					tweetText = rawText
						.split(/\n(?:Reply|Retweet|Like|Share|View|\d+|Follow)|\d+K|\d+M/)[0] // Try to split common action words or metrics
						.replace(/\s+/g, ' ') // Normalize whitespace
						.trim();
				}

				// Basic cleanup
				tweetText = tweetText
					.replace(/\u00A0/g, ' ')    // Replace non-breaking space
					.replace(/[·•]/g, '-')      // Replace any kind of dots/bullets with simple dash
					.replace(/\s*-\s*/g, ' - ') // Normalize spacing around dash
					.replace(/[""]/g, '"')      // Replace smart quotes
					.replace(/['']/g, "'")      // Replace smart apostrophes
					.trim();

				return tweetText;
			}).filter(text => text && text.length > 10).slice(0, 10); // Filter short/empty strings

			const profileNameElement = document.querySelector('[data-testid="UserName"]');
			const profileName = profileNameElement ? (profileNameElement.textContent?.split('\n')[0] || '').trim() : profileUsername;
			const bio = document.querySelector('[data-testid="UserDescription"]')?.textContent?.trim() || 'No bio found.';

			return {
				profileName,
				bio,
				tweets
			};
		}, username);

		let profileMd = `# ${profileContent.profileName} (@${username})\n\n${profileContent.bio}\n\n`;
		if (profileContent.tweets.length > 0) {
			profileMd += `## Recent Tweets\n\n${profileContent.tweets.map((tweet, index) => `### Tweet ${index + 1}\n${tweet}`).join('\n\n')}`;
		} else {
			profileMd += `## Recent Tweets\n\nNo tweets found or could not be extracted.`;
		}
		profileMd += `\n\nProfile URL: ${url}`;

		await env.MD_CACHE.put(cacheKey, profileMd, { expirationTtl: 1800 }); // Cache profile for 30 mins
		console.log(`[Twitter] Cached profile content for ${url}`);
		return { url, md: profileMd };

	} catch (error) {
		console.error(`[Twitter] Error processing profile ${url}:`, error);
		return { url, md: `Failed to fetch profile ${url}: ${error instanceof Error ? error.message : String(error)}`, error: true };
	} finally {
		if (page) {
			try {
				await page.close();
			} catch (closeError) {
				console.error(`[Twitter] Error closing page for profile ${url}:`, closeError);
			}
		}
	}
}

/**
 * Handles fetching and formatting an individual tweet page.
 * @param url The tweet URL.
 * @param env Cloudflare environment variables.
 * @returns Markdown content or error object.
 */
export async function handleTwitterTweetPage(url: string, env: Env): Promise<{ url: string, md: string, error?: boolean }> {
	const urlParts = url.split('/');
	const tweetID = urlParts.pop()?.split('?')[0]; // Get last part and remove query params
	if (!tweetID || !/^[0-9]+$/.test(tweetID)) {
		console.error(`[Twitter] Invalid tweet ID extracted from ${url}: ${tweetID}`);
		return { url, md: `Invalid tweet URL or could not extract Tweet ID: ${url}`, error: true };
	}

	const cacheKey = `TwitterTweet:${tweetID}`;
	const cachedMd = await env.MD_CACHE.get(cacheKey);
	if (cachedMd) {
		console.log(`[Twitter] Using cached tweet content for ${tweetID}`);
		return { url, md: cachedMd };
	}

	console.log(`[Twitter] No cache found for tweet ${tweetID}, fetching data...`);
	const tweet = await getTweet(tweetID, env);

	if (!tweet || typeof tweet !== 'object' || tweet.text === undefined) {
		console.error(`[Twitter] Tweet data not found or invalid for ${tweetID}`);
		// Optionally try scraping as a fallback?
		return { url, md: `Tweet not found or failed to fetch: ${tweetID}`, error: true };
	}

	// Format the tweet data into markdown
	const tweetMd = `## Tweet from @${tweet.user?.name ?? tweet.user?.screen_name ?? 'Unknown'} (${new Date(tweet.created_at).toLocaleString()})\n\n${tweet.text}\n\n${tweet.photos ? tweet.photos.map((photo) => `![Image](${photo.url})`).join('\n') : ''}\n\n**Stats:** Likes: ${tweet.favorite_count ?? 0}, Replies/Retweets: ${tweet.conversation_count ?? 0}\n\n**Tweet URL:** ${url}`;
	// Removed raw JSON from default output for cleaner MD
	// Add raw data to cache if needed for debugging:
	// await env.MD_CACHE.put(cacheKey + ':raw', JSON.stringify(tweet), { expirationTtl: 3600 });

	await env.MD_CACHE.put(cacheKey, tweetMd, { expirationTtl: 3600 }); // Cache formatted tweet for 1 hour
	console.log(`[Twitter] Cached formatted tweet content for ${tweetID}`);

	return { url, md: tweetMd };
} 