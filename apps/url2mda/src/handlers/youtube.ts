import type { Env } from '../types';

/**
 * Fetches simple metadata for a YouTube video URL.
 * Avoids browser interaction for reliability.
 * @param url The YouTube video URL.
 * @param env The Cloudflare environment variables.
 * @returns Markdown string with video metadata.
 */
export async function getYouTubeMetadata(url: string, env: Env): Promise<string> {
	// Use cache first
	const cacheKey = `Youtube:${url}`;
	const cached = await env.MD_CACHE.get(cacheKey);
	if (cached) {
		console.log('[YouTube] Using cached content for:', url);
		return cached;
	}

	console.log('[YouTube] No cache found, processing:', url);
	try {
		// Extract video ID
		let videoId = '';
		if (url.includes('youtube.com/watch')) {
			const urlObj = new URL(url);
			videoId = urlObj.searchParams.get('v') || '';
		} else if (url.includes('youtu.be/')) {
			videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
		}

		if (!videoId) {
			console.error('[YouTube] Could not extract video ID from:', url);
			return `# YouTube Video\n\nCould not extract video ID from: ${url}`;
		}

		// Create a simple, reliable response
		const md = `# YouTube Video\n\n## Information\n- **Video ID**: ${videoId}\n- **Direct Link**: ${url}\n- **Embed Code**: <iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>\n\nTo view this video, visit: ${url}`;
		
		console.log('[YouTube] Successfully generated metadata for:', videoId);
		// Cache the result
		await env.MD_CACHE.put(cacheKey, md, { expirationTtl: 3600 }); // Cache for 1 hour
		console.log('[YouTube] Cached metadata for:', url);

		return md;
	} catch (error) {
		console.error('[YouTube] Error processing:', url, error);
		return `# YouTube Video\n\nError processing: ${url}\n\n${error instanceof Error ? error.message : String(error)}`;
	}
} 