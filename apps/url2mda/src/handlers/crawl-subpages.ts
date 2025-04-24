import { convertToMagiFormat } from '../magi-util/convert-magi';
import type { Browser as PuppeteerBrowser, Page } from '@cloudflare/puppeteer';
import { applyLlmFilter } from '../llm-process/llm-filter';
import type { Env } from '../types';

/**
 * Crawls subpages from a base URL and returns a unified MAGI document or JSON response
 */
export async function crawlSubpages(
  this: {
    browser?: PuppeteerBrowser;  // Make browser optional to match Browser class
    extractLinks: (page: Page, baseUrl: string) => Promise<string[]>;
    getWebsiteMarkdown: (options: { urls: string[] }) => Promise<Array<{ url: string; md: string; error?: boolean; status?: number; errorDetails?: string }>>;
    llmFilter: boolean;
    env: Env;
  },
  baseUrl: string,
  contentType: string
): Promise<Response> {
  let page: Page | null = null;
  try {
    if (!this.browser) {
      throw new Error('Browser instance not initialized');
    }

    console.log(`[DO Crawl] Starting crawl for base URL: ${baseUrl}`);
    page = await this.browser.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    const links = await this.extractLinks(page, baseUrl);
    console.log(`[DO Crawl] Found ${links.length} links on ${baseUrl}.`);
    await page.close(); 
    page = null;

    const uniqueLinks = Array.from(new Set(links)).slice(0, 10); // Limit to 10 unique links
    console.log(`[DO Crawl] Processing ${uniqueLinks.length} unique subpages.`);

    // Gather all URLs including the base URL
    const allUrls = [baseUrl, ...uniqueLinks];
    
    const results = await this.getWebsiteMarkdown({
      urls: allUrls,
    });

    // Apply LLM filtering if enabled (on results that use the default handler)
    if (this.llmFilter) {
      console.log(`[DO Crawl] Applying LLM filter to qualifying results`);
      for (const result of results) {
        if (!result.error && !result.md.startsWith('## Error')) {
          try {
            result.md = await applyLlmFilter(result.md, this.env);
          } catch (e) {
            console.error(`[DO Crawl] LLM filtering error for ${result.url}:`, e);
          }
        }
      }
    }

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
    
    // For JSON response, return the array of results as before
    if (contentType === 'json') {
      return new Response(JSON.stringify(magiResults), {
        status: status,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // For text response, combine into a single MAGI document
      // Find the main page result (should be the first URL)
      const mainResult = magiResults.find(r => r.url === baseUrl) || magiResults[0];
      
      // Start with the main document
      let combinedDocument = mainResult.md;
      
      // Append subpages as subsections (skipping the main page)
      const subpageResults = magiResults.filter(r => r.url !== baseUrl);
      if (subpageResults.length > 0) {
        combinedDocument += '\n\n## Related Subpages\n';
        
        for (const subpage of subpageResults) {
          if (!subpage.error) {
            // Extract title from the MAGI document (after the frontmatter)
            const subpageContent = subpage.md.split('---\n\n')[1] || subpage.md;
            const titleMatch = subpageContent.match(/^# (.+)$/m);
            const title = titleMatch ? titleMatch[1] : 'Untitled Subpage';
            
            // Add the subpage as a section with its URL
            combinedDocument += `\n\n### ${title} [URL](${subpage.url})\n\n`;
            
            // Add the subpage content without its front matter and without title
            let content = subpageContent;
            if (titleMatch) {
              content = content.replace(titleMatch[0], ''); // Remove the title
            }
            combinedDocument += content.trim();
          }
        }
      }
      
      return new Response(combinedDocument, {
        status: status,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
      });
    }
  } catch (error) {
    console.error(`[DO Crawl] Error crawling subpages for ${baseUrl}:`, error);
    if (contentType === 'json') {
      return new Response(JSON.stringify({ 
        error: 'Failed to crawl subpages',
        message: error instanceof Error ? error.message : String(error),
        url: baseUrl
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      return new Response(`Error processing ${baseUrl}: ${error instanceof Error ? error.message : String(error)}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
      });
    }
  } finally {
    if (page) {
      try { await page.close(); } catch (e) { console.error("[DO Crawl] Error closing page in finally block:", e); }
    }
  }
}