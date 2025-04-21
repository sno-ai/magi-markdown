declare class Readability {
  constructor(document: any, options?: {
    charThreshold?: number;
    keepClasses?: boolean;
    nbTopCandidates?: number;
  });
  parse(): {
    content: string;
    textContent: string;
    title: string;
    siteName?: string;
    byline?: string;
    dir?: string;
    lang?: string;
  };
}

declare class TurndownService {
  constructor();
  turndown(html: string | Node): string;
}

// Add a Document interface for custom cloneNode result
interface ClonedDocument extends Node {
  querySelectorAll(selectors: string): NodeListOf<Element>;
}

// Extend the Env interface
interface Env extends Cloudflare.Env {
  BACKEND_SECURITY_TOKEN: string;
  REDDIT_CLIENT_ID: string;
  REDDIT_CLIENT_SECRET: string;
} 