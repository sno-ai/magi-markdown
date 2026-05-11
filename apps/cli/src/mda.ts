import { createHash, randomBytes } from 'node:crypto';
import {
	closeSync,
	existsSync,
	linkSync,
	mkdirSync,
	openSync,
	readFileSync,
	readdirSync,
	renameSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import yaml from 'js-yaml';

import {
	EXIT,
	MCP_BOUNDARY,
	MDA_EXTENDED,
	TARGET_ORDER,
	TARGETS,
	diag,
	usage,
	type CommandResult,
	type Diagnostic,
	type ExitCode,
	type ExtractResult,
	type MaybeTarget,
	type Target,
} from './types.js';

let schemaRegistry: ReturnType<typeof buildSchemaRegistry> | null = null;

export function makeScaffold(name: string) {
	return `---\nname: ${quoteYaml(name)}\ndescription: \"Describe what this Markdown AI document does.\"\n---\n# ${name}\n\nDescribe the instructions, workflow, or capability here.\n`;
}

export function makeLlmixPresetScaffold(moduleName: string, presetName: string, provider: string, model: string) {
	const artifactName = `llmix-${moduleName.replace(/^_/, '').replace(/_/g, '-')}-${presetName.replace(/^_/, '').replace(/_/g, '-')}`;
	return renderMarkdown(
		{
			name: artifactName,
			description: `LLMix preset ${moduleName}/${presetName}`,
			metadata: {
				'snoai-llmix': {
					module: moduleName,
					preset: presetName,
					common: {
						provider,
						model,
					},
				},
			},
		},
		`# ${moduleName}/${presetName}\n\nDescribe when this LLMix preset should be used.\n`,
	);
}

export function resolveTarget(
	file: string,
	target: MaybeTarget,
): { ok: true; target: Target } | { ok: false; result: (command: string, file: string) => CommandResult } {
	if (target !== 'auto') return { ok: true, target };
	const base = file.split(/[\\/]/).pop() ?? file;
	if (extname(base) === '.mda') return { ok: true, target: 'source' };
	if (base === 'SKILL.md' || base === 'AGENTS.md' || base === 'MCP-SERVER.md') return { ok: true, target: base };
	if (extname(base) === '.md') {
		return {
			ok: false,
			result: (command, f) =>
				usage(command, `Ambiguous Markdown target for ${f}; pass --target source|SKILL.md|AGENTS.md|MCP-SERVER.md`, { file: f }),
		};
	}
	return {
		ok: false,
		result: (command, f) =>
			usage(command, `Could not auto-detect target for ${f}; pass --target source|SKILL.md|AGENTS.md|MCP-SERVER.md`, { file: f }),
	};
}

export function parseTarget(value: string): MaybeTarget | null {
	if (value === 'auto') return 'auto';
	if ((TARGETS as string[]).includes(value)) return value as Target;
	return null;
}

export function normalizeCompileTarget(value: string): Target | null {
	if (value === 'SKILL.md' || value === 'skill' || value === 'skill-md') return 'SKILL.md';
	if (value === 'AGENTS.md' || value === 'agents' || value === 'agents-md') return 'AGENTS.md';
	if (value === 'MCP-SERVER.md' || value === 'mcp' || value === 'mcp-server-md') return 'MCP-SERVER.md';
	return null;
}

export function readArtifact(file: string): { ok: true; extract: ExtractResult } | { ok: false; diagnostic: Diagnostic } {
	try {
		return { ok: true, extract: extractFrontmatterStrict(readFileSync(file)) };
	} catch (error) {
		return { ok: false, diagnostic: diag('io-error', error instanceof Error ? error.message : String(error), { path: file }) };
	}
}

function extractFrontmatterStrict(buf: Buffer): ExtractResult {
	let bytes = buf;
	if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) bytes = bytes.slice(3);
	let decoded: string;
	try {
		decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
	} catch (error) {
		return { kind: 'error', code: 'invalid-encoding', message: error instanceof Error ? error.message : String(error) };
	}
	const normalizedText = decoded.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	if (!normalizedText.startsWith('---\n')) return { kind: 'no-frontmatter', body: normalizedText, normalizedText };

	let index = 4;
	let closeStart = -1;
	let closeEnd = -1;
	while (index <= normalizedText.length) {
		const nextNewline = normalizedText.indexOf('\n', index);
		const lineEnd = nextNewline === -1 ? normalizedText.length : nextNewline;
		const line = normalizedText.slice(index, lineEnd);
		if (line === '---') {
			closeStart = index;
			closeEnd = nextNewline === -1 ? normalizedText.length : nextNewline + 1;
			break;
		}
		if (nextNewline === -1) break;
		index = nextNewline + 1;
	}
	if (closeStart === -1) return { kind: 'error', code: 'unterminated-frontmatter', message: 'opening --- without matching closing fence' };

	const fmStr = normalizedText.slice(4, closeStart);
	const body = normalizedText.slice(closeEnd);
	try {
		return { kind: 'ok', frontmatter: yaml.load(fmStr) ?? null, body, normalizedText };
	} catch (error) {
		return { kind: 'error', code: 'frontmatter-yaml-parse-error', message: error instanceof Error ? error.message : String(error) };
	}
}

export function validateArtifact(file: string, target: Target) {
	const read = readArtifact(file);
	if (!read.ok) return { ok: false, diagnostics: [read.diagnostic] };
	const ext = read.extract;
	if (ext.kind === 'error') return { ok: false, diagnostics: [diag(ext.code, ext.message, { path: file })] };
	if (ext.kind === 'no-frontmatter') {
		if (target !== 'AGENTS.md') {
			return { ok: false, diagnostics: [diag('missing-required-frontmatter', `${target} requires YAML frontmatter`, { path: file })] };
		}
		if (ext.body.trim().length === 0) {
			return {
				ok: false,
				diagnostics: [diag('missing-required-body', 'AGENTS.md without frontmatter requires a non-empty body', { path: file })],
			};
		}
	}

	const fm = ext.kind === 'ok' ? (ext.frontmatter ?? {}) : {};
	const diagnostics: Diagnostic[] = [];
	diagnostics.push(...validateJsonAgainst(fm, schemaKeyForTarget(target)).diagnostics);

	const text = ext.kind === 'ok' ? ext.normalizedText : ext.normalizedText;
	const relationships = extractFootnoteRelationships(text);
	for (const rel of relationships) {
		if ('error' in rel) diagnostics.push(diag('relationship-footnote-json-parse-error', rel.error, { path: file }));
		else diagnostics.push(...validateJsonAgainst(rel.value, 'relationship').diagnostics);
	}

	if (isRecord(fm)) {
		diagnostics.push(...checkSignatureDigestEquality(fm));
		if (target === 'source') diagnostics.push(...validateLlmixNamespace(fm));
	}

	return { ok: diagnostics.length === 0, diagnostics };
}

function schemaKeyForTarget(target: Target) {
	if (target === 'source') return 'source';
	if (target === 'SKILL.md') return 'skill';
	if (target === 'AGENTS.md') return 'agents';
	return 'mcp';
}

export function validateJsonAgainst(value: unknown, key: 'source' | 'skill' | 'agents' | 'mcp' | 'trustPolicy' | 'relationship') {
	const registry = getSchemas();
	const validator = registry.validators[key];
	const ok = validator(value);
	return {
		ok: Boolean(ok),
		diagnostics: ok
			? []
			: (validator.errors ?? []).slice(0, 5).map((error) =>
					diag('schema-validation-error', `${error.instancePath || '(root)'} ${error.message}`, {
						schema: error.schemaPath,
						instancePath: error.instancePath,
					}),
				),
	};
}

function getSchemas() {
	schemaRegistry ??= buildSchemaRegistry();
	return schemaRegistry;
}

function buildSchemaRegistry() {
	const schemaDir = findAsset('schemas');
	const ajv = new Ajv2020({ allErrors: true, strict: false });
	const add = addFormats as unknown as ((a: Ajv2020) => void) & { default?: (a: Ajv2020) => void };
	(add.default ?? add)(ajv);
	for (const file of walk(schemaDir, (name) => name.endsWith('.schema.json'))) {
		const schema = JSON.parse(readFileSync(file, 'utf8'));
		ajv.addSchema(schema, schema.$id);
	}
	const byFile = (name: string) => {
		const schema = JSON.parse(readFileSync(join(schemaDir, name), 'utf8'));
		const validator = ajv.getSchema(schema.$id) ?? ajv.compile(schema);
		if (!validator) throw new Error(`schema did not compile: ${name}`);
		return validator;
	};
	return {
		schemaDir,
		validators: {
			source: byFile('frontmatter-source.schema.json'),
			skill: byFile('frontmatter-skill-md.schema.json'),
			agents: byFile('frontmatter-agents-md.schema.json'),
			mcp: byFile('frontmatter-mcp-server-md.schema.json'),
			trustPolicy: byFile('mda-trust-policy.schema.json'),
			relationship: byFile('relationship-footnote.schema.json'),
		},
	};
}

export function findAsset(name: 'schemas' | 'conformance') {
	const here = dirname(fileURLToPath(import.meta.url));
	for (const candidate of [here, resolve(here, '..'), resolve(here, '../../..'), process.cwd()]) {
		const path = resolve(candidate, name);
		if (existsSync(path)) return path;
	}
	throw new Error(`Could not locate ${name}`);
}

function walk(dir: string, accept: (name: string) => boolean): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walk(path, accept));
		else if (accept(entry.name)) out.push(path);
	}
	return out;
}

function extractFootnoteRelationships(text: string): Array<{ value: unknown } | { error: string }> {
	const re = /^\[\^[^\]]+\]:\s*(\{[^\n]*\})\s*$/gm;
	const out: Array<{ value: unknown } | { error: string }> = [];
	let match: RegExpExecArray | null;
	while ((match = re.exec(text)) !== null) {
		try {
			out.push({ value: JSON.parse(match[1]) });
		} catch (error) {
			out.push({ error: error instanceof Error ? error.message : String(error) });
		}
	}
	return out;
}

function checkSignatureDigestEquality(fm: Record<string, unknown>) {
	const sigs = fm.signatures;
	const integrity = fm.integrity;
	if (!Array.isArray(sigs) || !isRecord(integrity) || typeof integrity.digest !== 'string') return [];
	const diagnostics: Diagnostic[] = [];
	sigs.forEach((sig, index) => {
		if (isRecord(sig) && sig['payload-digest'] !== integrity.digest) {
			diagnostics.push(diag('signature-digest-mismatch', `signatures[${index}].payload-digest must equal integrity.digest`));
		}
	});
	return diagnostics;
}

const LLMIX_PROVIDERS = new Set(['openai', 'anthropic', 'google', 'deepseek', 'openrouter', 'deepinfra', 'novita', 'together', 'sno-gpu']);
const LLMIX_COMMON_KEYS = new Set([
	'provider',
	'model',
	'maxOutputTokens',
	'temperature',
	'topP',
	'topK',
	'presencePenalty',
	'frequencyPenalty',
	'stopSequences',
	'seed',
	'maxRetries',
	'enableThinking',
	'keepThinkingOutput',
]);
const LLMIX_MODULE_NAME = /^(?:_default|[a-z][a-z0-9_]{0,63})$/;
const LLMIX_PRESET_NAME = /^(?:_base[a-z0-9_]*|[a-z][a-z0-9_]{0,63})$/;
const LLMIX_NAMESPACE_KEYS = new Set(['module', 'preset', 'common', 'providerOptions', 'caching']);
const LLMIX_CACHING_KEYS = new Set(['strategy', 'key', 'ttl', 'maxItems']);
const LLMIX_CACHING_STRATEGIES = new Set(['native', 'gateway', 'disabled', 'redis', 'redis-or-memory', 'memory']);

function validateLlmixNamespace(fm: Record<string, unknown>) {
	const metadata = isRecord(fm.metadata) ? fm.metadata : null;
	const namespace = metadata && isRecord(metadata['snoai-llmix']) ? metadata['snoai-llmix'] : null;
	if (!namespace) return [];
	const diagnostics: Diagnostic[] = [];
	for (const key of Object.keys(namespace)) {
		if (!LLMIX_NAMESPACE_KEYS.has(key))
			diagnostics.push(diag('llmix.unknown_namespace_key', `metadata.snoai-llmix.${key} is not a supported key`));
	}

	const common = isRecord(namespace.common) ? namespace.common : null;
	if (namespace.module !== undefined && (typeof namespace.module !== 'string' || !LLMIX_MODULE_NAME.test(namespace.module))) {
		diagnostics.push(diag('llmix.invalid_identifier', 'metadata.snoai-llmix.module must be _default or a lowercase snake_case identifier'));
	}
	if (namespace.preset !== undefined && (typeof namespace.preset !== 'string' || !LLMIX_PRESET_NAME.test(namespace.preset))) {
		diagnostics.push(diag('llmix.invalid_identifier', 'metadata.snoai-llmix.preset must be _base* or a lowercase snake_case identifier'));
	}
	if (!common) {
		diagnostics.push(diag('llmix.missing_common', 'metadata.snoai-llmix.common is required'));
	} else {
		for (const key of Object.keys(common)) {
			if (!LLMIX_COMMON_KEYS.has(key))
				diagnostics.push(diag('llmix.unknown_common_key', `metadata.snoai-llmix.common.${key} is not supported`));
		}
		if (typeof common.provider !== 'string' || !LLMIX_PROVIDERS.has(common.provider)) {
			diagnostics.push(diag('llmix.invalid_provider', 'metadata.snoai-llmix.common.provider must be a supported provider'));
		}
		if (typeof common.model !== 'string' || common.model.trim().length === 0) {
			diagnostics.push(diag('llmix.invalid_model', 'metadata.snoai-llmix.common.model must be a non-empty string'));
		}
		validateOptionalNumber(common, 'temperature', 0, 2, diagnostics);
		validateOptionalNumber(common, 'topP', 0, 1, diagnostics);
		validateOptionalPositiveInteger(common, 'maxOutputTokens', diagnostics);
		validateOptionalPositiveInteger(common, 'topK', diagnostics);
		validateOptionalNonNegativeInteger(common, 'maxRetries', diagnostics);
	}

	if (namespace.providerOptions !== undefined) {
		if (!isRecord(namespace.providerOptions))
			diagnostics.push(diag('llmix.invalid_provider_options', 'metadata.snoai-llmix.providerOptions must be an object'));
		else {
			for (const [provider, options] of Object.entries(namespace.providerOptions)) {
				if (!LLMIX_PROVIDERS.has(provider) || !isRecord(options)) {
					diagnostics.push(
						diag('llmix.invalid_provider_options', `metadata.snoai-llmix.providerOptions.${provider} must be a supported provider object`),
					);
				}
			}
		}
	}

	if (namespace.caching !== undefined) {
		if (!isRecord(namespace.caching)) diagnostics.push(diag('llmix.invalid_caching', 'metadata.snoai-llmix.caching must be an object'));
		else {
			for (const key of Object.keys(namespace.caching)) {
				if (!LLMIX_CACHING_KEYS.has(key))
					diagnostics.push(diag('llmix.unknown_caching_key', `metadata.snoai-llmix.caching.${key} is not supported`));
			}
			if (typeof namespace.caching.strategy !== 'string' || !LLMIX_CACHING_STRATEGIES.has(namespace.caching.strategy)) {
				diagnostics.push(diag('llmix.invalid_caching', 'metadata.snoai-llmix.caching.strategy must be a supported strategy'));
			}
			validateOptionalPositiveInteger(namespace.caching, 'ttl', diagnostics);
			validateOptionalPositiveInteger(namespace.caching, 'maxItems', diagnostics);
		}
	}

	return diagnostics;
}

function validateOptionalNumber(record: Record<string, unknown>, key: string, min: number, max: number, diagnostics: Diagnostic[]) {
	if (record[key] === undefined) return;
	if (typeof record[key] !== 'number' || !Number.isFinite(record[key]) || Number(record[key]) < min || Number(record[key]) > max) {
		diagnostics.push(diag('llmix.invalid_common', `metadata.snoai-llmix.common.${key} must be a number from ${min} to ${max}`));
	}
}

function validateOptionalPositiveInteger(record: Record<string, unknown>, key: string, diagnostics: Diagnostic[]) {
	if (record[key] === undefined) return;
	if (!Number.isInteger(record[key]) || Number(record[key]) <= 0) {
		diagnostics.push(diag('llmix.invalid_common', `${key} must be a positive integer`));
	}
}

function validateOptionalNonNegativeInteger(record: Record<string, unknown>, key: string, diagnostics: Diagnostic[]) {
	if (record[key] === undefined) return;
	if (!Number.isInteger(record[key]) || Number(record[key]) < 0) {
		diagnostics.push(diag('llmix.invalid_common', `${key} must be a non-negative integer`));
	}
}

export function canonicalizeFromFile(
	file: string,
	target: Target,
	sidecar: string | null,
): { ok: true; bytes: Buffer; files: string[] } | { ok: false; exitCode: ExitCode; diagnostics: Diagnostic[]; files: string[] } {
	if (target === 'MCP-SERVER.md' && !sidecar) {
		return {
			ok: false,
			exitCode: EXIT.usage,
			diagnostics: [diag('missing-required-sidecar', 'MCP-SERVER.md canonicalization requires --sidecar <path>')],
			files: [file],
		};
	}
	const markdown = canonicalizeMarkdownFile(file);
	if (!markdown.ok) return { ok: false, exitCode: EXIT.failure, diagnostics: markdown.diagnostics, files: [file] };
	if (target !== 'MCP-SERVER.md') return { ok: true, bytes: markdown.bytes, files: [file] };
	const sidecarRead = readJson(sidecar!);
	if (!sidecarRead.ok)
		return { ok: false, exitCode: EXIT.io, diagnostics: [diag('io-error', sidecarRead.message)], files: [file, sidecar!] };
	return {
		ok: true,
		bytes: Buffer.concat([markdown.bytes, Buffer.from(MCP_BOUNDARY), Buffer.from(jcs(sidecarRead.value))]),
		files: [file, sidecar!],
	};
}

function canonicalizeMarkdownFile(file: string): { ok: true; bytes: Buffer } | { ok: false; diagnostics: Diagnostic[] } {
	const read = readArtifact(file);
	if (!read.ok) return { ok: false, diagnostics: [read.diagnostic] };
	if (read.extract.kind === 'error') return { ok: false, diagnostics: [diag(read.extract.code, read.extract.message)] };
	if (read.extract.kind !== 'ok' || !isRecord(read.extract.frontmatter)) {
		return { ok: false, diagnostics: [diag('missing-required-frontmatter', 'Canonicalization requires frontmatter')] };
	}
	const fm = { ...read.extract.frontmatter };
	delete fm.integrity;
	delete fm.signatures;
	const body = normalizeCanonicalBody(read.extract.body);
	return { ok: true, bytes: Buffer.from(`---\n${jcs(fm)}\n---\n${body}`) };
}

function normalizeCanonicalBody(body: string) {
	if (body.length === 0) return '';
	const lines = body
		.replace(/\r\n/g, '\n')
		.replace(/\r/g, '\n')
		.split('\n')
		.map((line) => line.replace(/[ \t]+$/g, ''));
	let normalized = lines.join('\n').replace(/\n*$/g, '');
	if (normalized.length > 0) normalized += '\n';
	return normalized;
}

export function computeDigest(bytes: Buffer, algorithm: string) {
	return `${algorithm}:${createHash(algorithm).update(bytes).digest('hex')}`;
}

export function compileTargets(
	frontmatter: Record<string, unknown>,
	body: string,
	targets: Target[],
	outDir: string,
	includeIntegrity: boolean,
) {
	const outputs: Array<{ path: string; bytes: string }> = [];
	const diagnostics: Diagnostic[] = [];
	const uniqueTargets = TARGET_ORDER.filter((target) => targets.includes(target));
	for (const target of uniqueTargets) {
		const fm = targetFrontmatter(frontmatter, target);
		mirrorFootnoteRelationships(fm, body);
		const outPath = join(outDir, target);
		let bytes = renderMarkdown(fm, body);
		if (target === 'MCP-SERVER.md') {
			const sidecar = makeMcpSidecar(fm);
			if (includeIntegrity) {
				fm.integrity = {
					algorithm: 'sha256',
					digest: computeDigest(
						Buffer.concat([canonicalizeRenderedMarkdown(fm, body), Buffer.from(MCP_BOUNDARY), Buffer.from(jcs(sidecar))]),
						'sha256',
					),
				};
				bytes = renderMarkdown(fm, body);
			}
			diagnostics.push(...validateRenderedFrontmatter(fm, target));
			outputs.push({ path: outPath, bytes });
			outputs.push({ path: join(outDir, 'mcp-server.json'), bytes: `${JSON.stringify(sidecar, null, 2)}\n` });
			continue;
		}
		if (includeIntegrity) {
			fm.integrity = { algorithm: 'sha256', digest: computeDigest(canonicalizeRenderedMarkdown(fm, body), 'sha256') };
			bytes = renderMarkdown(fm, body);
		}
		diagnostics.push(...validateRenderedFrontmatter(fm, target));
		outputs.push({ path: outPath, bytes });
	}
	return diagnostics.length
		? { ok: false as const, diagnostics, planned: outputs.map((o) => o.path) }
		: { ok: true as const, outputs, diagnostics };
}

function targetFrontmatter(source: Record<string, unknown>, target: Target) {
	const out: Record<string, unknown> = {};
	for (const key of ['name', 'description', 'license', 'compatibility']) {
		if (source[key] !== undefined) out[key] = clone(source[key]);
	}
	if (target === 'SKILL.md' && source['allowed-tools'] !== undefined) out['allowed-tools'] = clone(source['allowed-tools']);

	const metadata = isRecord(source.metadata) ? (clone(source.metadata) as Record<string, unknown>) : {};
	const mda = isRecord(metadata.mda) ? (clone(metadata.mda) as Record<string, unknown>) : {};
	for (const key of MDA_EXTENDED) {
		if (source[key] !== undefined) mda[key] = clone(source[key]);
	}
	if (target !== 'SKILL.md' && source['allowed-tools'] !== undefined) {
		const vendor = isRecord(metadata['claude-code']) ? (clone(metadata['claude-code']) as Record<string, unknown>) : {};
		vendor['allowed-tools'] = clone(source['allowed-tools']);
		metadata['claude-code'] = vendor;
	}
	if (Object.keys(mda).length > 0) metadata.mda = mda;
	if (Object.keys(metadata).length > 0) out.metadata = metadata;
	return out;
}

function renderMarkdown(frontmatter: Record<string, unknown>, body: string) {
	const rendered = yaml.dump(frontmatter, { lineWidth: -1, noRefs: true, sortKeys: false }).replace(/\n+$/g, '\n');
	return `---\n${rendered}---\n${body}`;
}

export function renderArtifact(frontmatter: Record<string, unknown>, body: string) {
	return renderMarkdown(frontmatter, body);
}

function canonicalizeRenderedMarkdown(frontmatter: Record<string, unknown>, body: string) {
	const fm = { ...frontmatter };
	delete fm.integrity;
	delete fm.signatures;
	return Buffer.from(`---\n${jcs(fm)}\n---\n${normalizeCanonicalBody(body)}`);
}

function makeMcpSidecar(fm: Record<string, unknown>) {
	const metadata = isRecord(fm.metadata) ? fm.metadata : {};
	const mda = isRecord(metadata.mda) ? metadata.mda : {};
	return {
		name: typeof fm.name === 'string' ? fm.name : 'mda-server',
		version: typeof mda.version === 'string' ? mda.version : '0.1.0',
		transport: 'stdio',
	};
}

function mirrorFootnoteRelationships(fm: Record<string, unknown>, body: string) {
	const relationships = extractFootnoteRelationships(body)
		.filter((item): item is { value: unknown } => 'value' in item)
		.map((item) => item.value);
	if (relationships.length === 0) return;
	const metadata = isRecord(fm.metadata) ? fm.metadata : {};
	const mda = isRecord(metadata.mda) ? metadata.mda : {};
	mda.relationships = relationships;
	metadata.mda = mda;
	fm.metadata = metadata;
}

function validateRenderedFrontmatter(fm: Record<string, unknown>, target: Target) {
	return validateJsonAgainst(fm, schemaKeyForTarget(target)).diagnostics;
}

export function runConformanceSuite(suite: string, level: string) {
	const manifestPath = join(suite, 'manifest.yaml');
	const manifestRead = readText(manifestPath);
	if (!manifestRead.ok) {
		return { ok: false, diagnostics: [diag('io-error', manifestRead.message)], passCount: 0, failCount: 1, fixtures: [] };
	}
	const manifest = yaml.load(manifestRead.text);
	if (!isRecord(manifest) || !Array.isArray(manifest.fixtures)) {
		return {
			ok: false,
			diagnostics: [diag('conformance-manifest-invalid', 'manifest.yaml must contain fixtures[]')],
			passCount: 0,
			failCount: 1,
			fixtures: [],
		};
	}
	const fixtures: Array<{ id: string; ok: boolean; diagnostics: Diagnostic[] }> = [];
	let compileFixtureCount = 0;
	for (const entry of manifest.fixtures) {
		if (!isRecord(entry) || typeof entry.id !== 'string') continue;
		if (entry.verdict === 'equal') {
			compileFixtureCount += 1;
			if (level === 'V') continue;
			fixtures.push(runCompileConformanceFixture(suite, entry));
			continue;
		}
		fixtures.push(runConformanceFixture(suite, entry));
	}
	if (level === 'C' && compileFixtureCount === 0) {
		fixtures.push({
			id: 'level-c-compile-coverage',
			ok: false,
			diagnostics: [diag('conformance.compile_fixtures_missing', 'Level C requires at least one compile/equality fixture')],
		});
	}
	const failures = fixtures.filter((f) => !f.ok);
	return {
		ok: failures.length === 0,
		diagnostics: failures.flatMap((f) => f.diagnostics.map((d) => ({ ...d, path: f.id }))),
		passCount: fixtures.length - failures.length,
		failCount: failures.length,
		fixtures,
	};
}

function runCompileConformanceFixture(suite: string, entry: Record<string, unknown>) {
	const id = String(entry.id);
	const input = typeof entry.input === 'string' ? resolve(suite, entry.input) : null;
	const expectedDir = typeof entry.expected_dir === 'string' ? resolve(suite, entry.expected_dir) : null;
	const targetValues = Array.isArray(entry.targets) ? entry.targets.map((value) => normalizeCompileTarget(String(value))) : [];
	const targets = targetValues.filter((target): target is Target => target !== null);
	const diagnostics: Diagnostic[] = [];

	if (!input) diagnostics.push(diag('conformance.manifest_invalid', 'Compile fixture requires input'));
	if (!expectedDir) diagnostics.push(diag('conformance.manifest_invalid', 'Compile fixture requires expected_dir'));
	if (targets.length === 0 || targets.length !== targetValues.length) {
		diagnostics.push(diag('conformance.manifest_invalid', 'Compile fixture requires valid targets'));
	}
	if (diagnostics.length > 0) return { id, ok: false, diagnostics };

	const read = readArtifact(input!);
	if (!read.ok) return { id, ok: false, diagnostics: [read.diagnostic] };
	if (read.extract.kind !== 'ok' || !isRecord(read.extract.frontmatter)) {
		return { id, ok: false, diagnostics: [diag('conformance.compile_input_invalid', 'Compile fixture input must be source frontmatter')] };
	}
	const validation = validateArtifact(input!, 'source');
	if (!validation.ok) {
		return {
			id,
			ok: false,
			diagnostics: validation.diagnostics.map((diagnostic) => ({ ...diagnostic, code: 'conformance.compile_input_invalid' })),
		};
	}

	const outRoot = '__mda_conformance_out__';
	const staged = compileTargets(read.extract.frontmatter, read.extract.body, targets, outRoot, false);
	if (!staged.ok) {
		return {
			id,
			ok: false,
			diagnostics: staged.diagnostics.map((diagnostic) => ({ ...diagnostic, code: 'conformance.compile_failed' })),
		};
	}

	const actual = new Map<string, string>();
	for (const output of staged.outputs) actual.set(relative(outRoot, output.path).replace(/\\/g, '/'), output.bytes);

	const expectedFiles = listExpectedTree(expectedDir!);
	if (!expectedFiles.ok) return { id, ok: false, diagnostics: [expectedFiles.diagnostic] };

	const expected = new Map<string, string>();
	for (const file of expectedFiles.files) {
		const rel = relative(expectedDir!, file).replace(/\\/g, '/');
		const text = readText(file);
		if (!text.ok) return { id, ok: false, diagnostics: [diag('conformance.expected_missing', text.message)] };
		expected.set(rel, text.text);
	}

	for (const rel of expected.keys()) {
		if (!actual.has(rel)) diagnostics.push(diag('conformance.compile_output_missing', `Expected output was not emitted: ${rel}`));
	}
	for (const rel of actual.keys()) {
		if (!expected.has(rel)) diagnostics.push(diag('conformance.compile_output_extra', `Unexpected output was emitted: ${rel}`));
	}
	for (const [rel, expectedText] of expected.entries()) {
		const actualText = actual.get(rel);
		if (actualText === undefined) continue;
		const expectedNormalized = normalizeConformanceOutput(rel, expectedText);
		const actualNormalized = normalizeConformanceOutput(rel, actualText);
		if (!expectedNormalized.ok) diagnostics.push(expectedNormalized.diagnostic);
		else if (!actualNormalized.ok) diagnostics.push(actualNormalized.diagnostic);
		else if (expectedNormalized.bytes !== actualNormalized.bytes) {
			diagnostics.push(diag('conformance.compile_output_mismatch', `Compiled output differs from expected fixture: ${rel}`));
		}
	}

	return { id, ok: diagnostics.length === 0, diagnostics };
}

function runConformanceFixture(suite: string, entry: Record<string, unknown>) {
	const id = String(entry.id);
	const fixturePath = resolve(suite, String(entry.path));
	const verdict = entry.verdict;
	const diagnostics: Diagnostic[] = [];
	const expectedError = typeof entry['expected-error'] === 'string' ? entry['expected-error'] : null;
	const extractionExpected = typeof entry['extraction-expected'] === 'string' ? entry['extraction-expected'] : null;
	if (!existsSync(fixturePath)) {
		return { id, ok: false, diagnostics: [diag('fixture-missing', `Missing fixture: ${fixturePath}`)] };
	}

	if (fixturePath.endsWith('.json')) {
		const json = readJson(fixturePath);
		if (!json.ok) diagnostics.push(diag('invalid-json', json.message));
		else diagnostics.push(...validateJsonAgainst(json.value, 'trustPolicy').diagnostics);
	} else {
		const schemaPaths = Array.isArray(entry.against) ? entry.against.map(String) : [];
		const target = inferTargetFromSchemas(schemaPaths, fixturePath);
		const read = readArtifact(fixturePath);
		if (!read.ok) diagnostics.push(read.diagnostic);
		else {
			const got = read.extract.kind === 'error' ? read.extract.code : read.extract.kind === 'no-frontmatter' ? 'no-frontmatter' : 'ok';
			if (extractionExpected && got !== extractionExpected)
				diagnostics.push(diag('extraction-mismatch', `Expected ${extractionExpected}, got ${got}`));
			if (extractionExpected && got === extractionExpected && schemaPaths.length === 0) {
				return { id, ok: true, diagnostics: [] };
			}
			if (!extractionExpected && read.extract.kind === 'error') diagnostics.push(diag(read.extract.code, read.extract.message));
			if (schemaPaths.length > 0 && read.extract.kind !== 'error') diagnostics.push(...validateArtifact(fixturePath, target).diagnostics);
		}
	}

	if (Array.isArray(entry['semantic-checks']) && entry['semantic-checks'].includes('trusted-runtime-policy')) {
		diagnostics.push(...runTrustedRuntimeConformance(suite, entry));
	}

	const accepted = diagnostics.length === 0;
	let ok = verdict === 'accept' ? accepted : !accepted;
	if (verdict === 'reject' && ok) {
		if (expectedError && !diagnostics.some((d) => d.code === expectedError)) {
			diagnostics.push(diag('expected-error-mismatch', `Expected rejection ${expectedError}, got ${diagnosticCodes(diagnostics)}`));
			ok = false;
		}
		if (extractionExpected && diagnostics.some((d) => d.code === 'extraction-mismatch')) {
			ok = false;
		}
	}
	return { id, ok, diagnostics: ok ? [] : diagnostics };
}

function diagnosticCodes(diagnostics: Diagnostic[]) {
	return diagnostics.length === 0 ? 'none' : diagnostics.map((d) => d.code).join(', ');
}

function inferTargetFromSchemas(schemaPaths: string[], file: string): Target {
	if (schemaPaths.some((s) => s.endsWith('frontmatter-skill-md.schema.json'))) return 'SKILL.md';
	if (schemaPaths.some((s) => s.endsWith('frontmatter-agents-md.schema.json'))) return 'AGENTS.md';
	if (schemaPaths.some((s) => s.endsWith('frontmatter-mcp-server-md.schema.json'))) return 'MCP-SERVER.md';
	return extname(file) === '.mda' ? 'source' : 'AGENTS.md';
}

function runTrustedRuntimeConformance(suite: string, entry: Record<string, unknown>) {
	const policyPath = typeof entry['runtime-policy'] === 'string' ? resolve(suite, entry['runtime-policy']) : null;
	if (!policyPath) return [diag('trust-policy-violation', 'trusted-runtime-policy requires runtime-policy')];
	const policy = readJson(policyPath);
	if (!policy.ok) return [diag('trust-policy-violation', policy.message)];
	const policyValidation = validateJsonAgainst(policy.value, 'trustPolicy');
	if (!policyValidation.ok) return policyValidation.diagnostics.map((d) => ({ ...d, code: 'trust-policy-violation' }));
	const artifact = readArtifact(resolve(suite, String(entry.path)));
	if (!artifact.ok || artifact.extract.kind !== 'ok' || !isRecord(artifact.extract.frontmatter))
		return [diag('missing-required-integrity', 'trusted-runtime requires frontmatter')];
	return checkTrustedRuntimePolicy(
		artifact.extract.frontmatter,
		policy.value,
		Array.isArray(entry['verified-identities']) ? entry['verified-identities'] : [],
	);
}

function checkTrustedRuntimePolicy(fm: Record<string, unknown>, policy: unknown, verifiedIdentities: unknown[]) {
	if (!isRecord(fm.integrity)) return [diag('missing-required-integrity', 'trusted-runtime requires integrity')];
	if (!Array.isArray(fm.signatures) || fm.signatures.length === 0)
		return [diag('missing-required-signature', 'trusted-runtime requires signatures[]')];
	const digestErrors = checkSignatureDigestEquality(fm);
	if (digestErrors.length) return digestErrors;
	const trusted = new Set<string>();
	for (const [index, sig] of fm.signatures.entries()) {
		if (!isRecord(sig) || typeof sig.signer !== 'string') continue;
		if (sig.signer.startsWith('did-web:')) {
			const domain = sig.signer.slice('did-web:'.length);
			if (policyAllowsDidWeb(policy, domain)) trusted.add(`did-web:${domain}`);
		}
		if (sig.signer.startsWith('sigstore-oidc:')) {
			const issuer = sig.signer.slice('sigstore-oidc:'.length);
			const identity = verifiedIdentities.find(
				(item) => isRecord(item) && item.type === 'sigstore-oidc' && item['signature-index'] === index,
			);
			if (isRecord(identity) && identity.issuer === issuer && policyAllowsSigstore(policy, identity)) {
				trusted.add(`sigstore-oidc:${identity.issuer}\n${identity.subject}`);
			}
		}
	}
	if (trusted.size === 0) return [diag('no-trusted-signature', 'no signature matched the trust policy')];
	const minSignatures = isRecord(policy) && Number.isInteger(policy.minSignatures) ? Number(policy.minSignatures) : 1;
	if (trusted.size < minSignatures)
		return [diag('insufficient-trusted-signatures', `${trusted.size} trusted signer identities < ${minSignatures}`)];
	return [];
}

function policyAllowsDidWeb(policy: unknown, domain: string) {
	return (
		isRecord(policy) &&
		Array.isArray(policy.trustedSigners) &&
		policy.trustedSigners.some((s) => isRecord(s) && s.type === 'did-web' && s.domain === domain)
	);
}

function policyAllowsSigstore(policy: unknown, identity: Record<string, unknown>) {
	return (
		isRecord(policy) &&
		Array.isArray(policy.trustedSigners) &&
		policy.trustedSigners.some(
			(s) => isRecord(s) && s.type === 'sigstore-oidc' && s.issuer === identity.issuer && s.subject === identity.subject,
		)
	);
}

export function atomicWrite(path: string, bytes: string | Buffer) {
	const destination = resolve(path);
	const dir = dirname(destination);
	mkdirSync(dir, { recursive: true });
	const temp = join(dir, `.mda-${process.pid}-${Date.now()}-${randomBytes(8).toString('hex')}.tmp`);
	let fd: number | null = null;
	let createdTemp = false;
	try {
		fd = openSync(temp, 'wx', 0o600);
		createdTemp = true;
		writeFileSync(fd, bytes);
		closeSync(fd);
		fd = null;
		linkSync(temp, destination);
	} finally {
		if (fd !== null) {
			try {
				closeSync(fd);
			} catch {
				// best-effort cleanup
			}
		}
		if (createdTemp) rmSync(temp, { force: true });
	}
}

export function atomicReplace(path: string, bytes: string | Buffer) {
	const destination = resolve(path);
	const dir = dirname(destination);
	mkdirSync(dir, { recursive: true });
	const temp = join(dir, `.mda-${process.pid}-${Date.now()}-${randomBytes(8).toString('hex')}.tmp`);
	let fd: number | null = null;
	let createdTemp = false;
	try {
		fd = openSync(temp, 'wx', 0o600);
		createdTemp = true;
		writeFileSync(fd, bytes);
		closeSync(fd);
		fd = null;
		renameSync(temp, destination);
		createdTemp = false;
	} finally {
		if (fd !== null) {
			try {
				closeSync(fd);
			} catch {
				// best-effort cleanup
			}
		}
		if (createdTemp) rmSync(temp, { force: true });
	}
}

function readText(path: string) {
	try {
		return { ok: true as const, text: readFileSync(path, 'utf8') };
	} catch (error) {
		return { ok: false as const, message: error instanceof Error ? error.message : String(error) };
	}
}

function listExpectedTree(root: string): { ok: true; files: string[] } | { ok: false; diagnostic: Diagnostic } {
	const files: string[] = [];
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) walk(path);
			else if (entry.isFile()) files.push(path);
		}
	};
	try {
		walk(root);
		return { ok: true, files: files.sort() };
	} catch (error) {
		return {
			ok: false,
			diagnostic: diag('conformance.expected_missing', error instanceof Error ? error.message : String(error), { path: root }),
		};
	}
}

function normalizeConformanceOutput(path: string, text: string): { ok: true; bytes: string } | { ok: false; diagnostic: Diagnostic } {
	if (path.endsWith('.json')) {
		try {
			return { ok: true, bytes: jcs(JSON.parse(text)) };
		} catch (error) {
			return {
				ok: false,
				diagnostic: diag('conformance.expected_invalid_json', error instanceof Error ? error.message : String(error), { path }),
			};
		}
	}

	if (path.endsWith('.md') || path.endsWith('.mda')) {
		const extract = extractFrontmatterStrict(Buffer.from(text));
		if (extract.kind === 'error') return { ok: false, diagnostic: diag(extract.code, extract.message, { path }) };
		if (extract.kind === 'no-frontmatter') return { ok: true, bytes: normalizeCanonicalBody(extract.body) };
		return { ok: true, bytes: `---\n${jcs(extract.frontmatter)}\n---\n${normalizeCanonicalBody(extract.body.replace(/^\n+/, ''))}` };
	}

	return { ok: true, bytes: text.replace(/\r\n/g, '\n').replace(/\r/g, '\n') };
}

export function readJson(path: string) {
	try {
		return { ok: true as const, value: JSON.parse(readFileSync(path, 'utf8')) };
	} catch (error) {
		return { ok: false as const, message: error instanceof Error ? error.message : String(error) };
	}
}

export function jcs(value: unknown): string {
	if (value === null) return 'null';
	if (typeof value === 'string') return JSON.stringify(value);
	if (typeof value === 'number') {
		if (!Number.isFinite(value)) throw new Error('non-finite number cannot be canonicalized');
		return JSON.stringify(value);
	}
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	if (value instanceof Date) return JSON.stringify(value.toISOString());
	if (Array.isArray(value)) return `[${value.map(jcs).join(',')}]`;
	if (isRecord(value)) {
		return `{${Object.keys(value)
			.sort()
			.filter((key) => value[key] !== undefined)
			.map((key) => `${JSON.stringify(key)}:${jcs(value[key])}`)
			.join(',')}}`;
	}
	return 'null';
}

function clone<T>(value: T): T {
	if (value instanceof Date) return value.toISOString() as T;
	if (Array.isArray(value)) return value.map((item) => clone(item)) as T;
	if (isRecord(value)) {
		const out: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value)) out[key] = clone(item);
		return out as T;
	}
	return value;
}

function quoteYaml(value: string) {
	return JSON.stringify(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
