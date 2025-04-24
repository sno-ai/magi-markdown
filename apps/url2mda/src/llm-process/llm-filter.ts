import type { Env } from '../types';

	/**
	 * Applies LLM filtering to the provided markdown content.
	 */
  export async function applyLlmFilter(md: string, env: Env): Promise<string> {
		try {
			console.log(`[DO LLM Filter] Running LLM filter on content (length: ${md.length})`);
			const answer = (await env.AI.run('@cf/qwen/qwen1.5-14b-chat-awq', {
				prompt: `You are an expert Markdown filtering assistant. Remove all extraneous sections (ads, navigation, footers, sidebars, 
				unrelated links) and any inappropriate content. Preserve only the core content: titles, headings, paragraphs, lists, code blocks, 
				and inline formatting. Do not include explanations, commentary, metadata, or markdown fences.
			Input:${md}
			Output:`,
			})) as { response: string };

			console.log(`[DO LLM Filter] Filtered content length: ${answer.response.length}`);
			// Basic check if filtering significantly reduced content, might indicate issues
			if (md.length > 100 && answer.response.length < md.length * 0.1) {
				console.warn('[DO LLM Filter] LLM filter drastically reduced content size. Check output quality.');
			}
			// Trim potential leading/trailing whitespace or newlines from LLM output
			return answer.response.trim();
		} catch (error) {
			console.error('[DO LLM Filter] Error during LLM filtering:', error);
			// Return original markdown if filtering fails
			return md;
		}
	}