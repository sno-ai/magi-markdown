export const DIGEST_ALGORITHMS = new Set(['sha256', 'sha384', 'sha512']);
export const CLI_VERSION = '1.1.0';
export const LLMIX_PROVIDERS = new Set([
	'openai',
	'anthropic',
	'google',
	'deepseek',
	'openrouter',
	'deepinfra',
	'novita',
	'together',
	'sno-gpu',
]);
export const LLMIX_MODULE_NAME = /^(?:_default|[a-z][a-z0-9_]{0,63})$/;
export const LLMIX_PRESET_NAME = /^(?:_base[a-z0-9_]*|[a-z][a-z0-9_]{0,63})$/;
export const INTEGRITY_PAYLOAD_TYPE = 'application/vnd.mda.integrity+json';
export const GITHUB_ACTIONS_ISSUER = 'https://token.actions.githubusercontent.com';
export const GITHUB_REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
export const GITHUB_REF = /^refs\/(?:heads|tags)\/\S+$/;
export const SIGSTORE_REKOR_URL = 'https://rekor.sigstore.dev';
export const DIGEST_PATTERN = /^sha(?:256|384|512):[a-f0-9]+$/;
export const LLMIX_SNIPPET_FORMATS = new Set(['json', 'env', 'kubernetes', 'github-actions', 'terraform', 'typescript', 'python', 'rust']);
