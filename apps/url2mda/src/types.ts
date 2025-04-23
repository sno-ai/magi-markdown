
export interface Env {
	BROWSER: DurableObjectNamespace;
	MYBROWSER: Fetcher;
	MDA_CACHE: KVNamespace;
	RATELIMITER: RateLimit;
	AI: Ai;
	BACKEND_SECURITY_TOKEN: string;
	REDDIT_CLIENT_ID?: string;
	REDDIT_CLIENT_SECRET?: string;
}

// Add other shared types or interfaces here if needed 