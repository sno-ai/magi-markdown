import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync, sign as cryptoSign } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const app = resolve(import.meta.dirname, '..');
const repo = resolve(app, '../..');
const tmp = mkdtempSync(join(tmpdir(), 'mda-package-smoke-'));
const packDir = join(tmp, 'pack');
const project = join(tmp, 'project');
const INTEGRITY_PAYLOAD_TYPE = 'application/vnd.mda.integrity+json';
const expectedPackageVersion = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8')).version;

mkdirSync(packDir, { recursive: true });
mkdirSync(project, { recursive: true });
writeFileSync(join(project, 'package.json'), JSON.stringify({ private: true, type: 'module' }, null, 2));

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd ?? project,
		encoding: 'utf8',
	});
	const expectedStatus = options.status ?? 0;
	assert.equal(result.status, expectedStatus, `${command} ${args.join(' ')}\nstdout=${result.stdout}\nstderr=${result.stderr}`);
	if (!options.allowRepositoryOutput) {
		assert.equal(result.stdout.includes(repo), false, `${command} ${args.join(' ')} leaked repo path in stdout`);
		assert.equal(result.stderr.includes(repo), false, `${command} ${args.join(' ')} leaked repo path in stderr`);
	}
	return result;
}

function json(bin, args, status = 0) {
	const result = run(bin, [...args, '--json'], { status });
	assert.equal(result.stderr, '');
	return JSON.parse(result.stdout);
}

function stableJson(value) {
	if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
	if (value && typeof value === 'object') {
		return `{${Object.keys(value)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
			.join(',')}}`;
	}
	return JSON.stringify(value);
}

function digestJson(value) {
	return `sha256:${createHash('sha256').update(stableJson(value)).digest('hex')}`;
}

function dssePae(payloadType, payload) {
	return Buffer.concat([
		Buffer.from(`DSSEv1 ${Buffer.byteLength(payloadType, 'utf8')} ${payloadType} ${payload.length} `, 'utf8'),
		payload,
	]);
}

function signatureForPayloadType(privateKey, payloadType, digest) {
	const payload = Buffer.from(JSON.stringify({ integrity: { algorithm: 'sha256', digest } }), 'utf8');
	return cryptoSign(null, dssePae(payloadType, payload), privateKey).toString('base64');
}

function writeJson(path, value) {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, JSON.stringify(value, null, 2));
}

function snippetOutputPath(format) {
	const extensions = {
		json: 'json',
		env: 'env',
		kubernetes: 'yaml',
		'github-actions': 'yaml',
		terraform: 'tf',
		typescript: 'ts',
		python: 'py',
		rust: 'rs',
	};
	return join(project, 'release', `llmix-trust-snippet.${format}.${extensions[format]}`);
}

run('pnpm', ['pack', '--pack-destination', packDir], { cwd: app, allowRepositoryOutput: true });
const tarballs = readdirSync(packDir).filter((file) => file.endsWith('.tgz'));
assert.equal(tarballs.length, 1);
run('pnpm', ['add', join(packDir, tarballs[0])], { cwd: project });

const bin = join(project, 'node_modules', '.bin', process.platform === 'win32' ? 'mda.cmd' : 'mda');
assert.equal(existsSync(bin), true);

run(bin, ['--help']);
assert.equal(run(bin, ['--version']).stdout, `${expectedPackageVersion}\n`);
assert.equal(json(bin, ['--version']).version, expectedPackageVersion);
assert.equal(json(bin, ['conformance', '--level', 'V']).ok, true);
assert.equal(json(bin, ['conformance', '--level', 'C']).ok, true);

const source = join(project, 'authoring', 'search_summary', 'openai_fast.mda');
mkdirSync(dirname(source), { recursive: true });
assert.equal(
	json(bin, [
		'init',
		'--template',
		'llmix-preset',
		'--module',
		'search_summary',
		'--preset',
		'openai_fast',
		'--provider',
		'openai',
		'--model',
		'gpt-5-mini',
		'--out',
		source,
	]).ok,
	true,
);
assert.equal(json(bin, ['validate', source, '--target', 'source']).ok, true);
const integrity = json(bin, ['integrity', 'compute', source, '--target', 'source', '--write']);
assert.equal(integrity.ok, true);
assert.equal(json(bin, ['integrity', 'verify', source, '--target', 'source']).ok, true);

const { privateKey: didPrivateKey, publicKey: didPublicKey } = generateKeyPairSync('ed25519');
const did = 'did:web:tools.example.com';
const didKeyId = `${did}#release-key`;
const didKeyFile = join(project, 'fixtures', 'did-private-key.pem');
const didDocument = join(project, 'fixtures', 'did.json');
mkdirSync(dirname(didKeyFile), { recursive: true });
writeFileSync(didKeyFile, didPrivateKey.export({ format: 'pem', type: 'pkcs8' }));
writeJson(didDocument, {
	id: did,
	verificationMethod: [
		{
			id: didKeyId,
			type: 'JsonWebKey2020',
			controller: did,
			publicKeyJwk: didPublicKey.export({ format: 'jwk' }),
		},
	],
});

const didPolicy = join(project, 'release', 'did-web-policy.json');
mkdirSync(dirname(didPolicy), { recursive: true });
assert.equal(
	json(bin, [
		'release',
		'trust',
		'policy',
		'--target',
		'llmix-registry',
		'--profile',
		'did-web',
		'--domain',
		'tools.example.com',
		'--out',
		didPolicy,
	]).ok,
	true,
);

const didSigned = join(project, 'release-source-set', 'search_summary', 'openai_fast.mda');
mkdirSync(dirname(didSigned), { recursive: true });
assert.equal(
	json(bin, ['sign', source, '--profile', 'did-web', '--did', did, '--key-id', didKeyId, '--key-file', didKeyFile, '--out', didSigned]).ok,
	true,
);
assert.equal(json(bin, ['verify', didSigned, '--target', 'source', '--policy', didPolicy, '--did-document', didDocument]).ok, true);

const { privateKey: githubPrivateKey, publicKey: githubPublicKey } = generateKeyPairSync('ed25519');
const githubPolicy = join(project, 'release', 'github-actions-policy.json');
assert.equal(
	json(bin, [
		'release',
		'trust',
		'policy',
		'--target',
		'llmix-registry',
		'--profile',
		'github-actions',
		'--repo',
		'sno-ai/llmix',
		'--workflow',
		'release.yml',
		'--ref',
		'refs/tags/v1.1.0',
		'--out',
		githubPolicy,
	]).ok,
	true,
);
const githubFixture = join(project, 'fixtures', 'github-actions-sigstore.json');
writeJson(githubFixture, {
	issuer: 'https://token.actions.githubusercontent.com',
	subject: 'repo:sno-ai/llmix:ref:refs/tags/v1.1.0',
	repository: 'sno-ai/llmix',
	workflow: 'release.yml',
	ref: 'refs/tags/v1.1.0',
	keyId: 'github-actions-release-key',
	algorithm: 'ed25519',
	publicKeyPem: githubPublicKey.export({ format: 'pem', type: 'spki' }),
	privateKeyPem: githubPrivateKey.export({ format: 'pem', type: 'pkcs8' }),
	expectedPayloadDigest: integrity.digest,
	rekor: {
		url: 'https://rekor.sigstore.dev',
		logId: 'package-smoke-rekor-log',
		logIndex: 1100,
		payloadDigest: integrity.digest,
	},
});
const githubSigned = join(project, 'release', 'github-actions-signed.mda');
assert.equal(
	json(bin, [
		'sign',
		source,
		'--profile',
		'github-actions',
		'--repo',
		'sno-ai/llmix',
		'--workflow',
		'release.yml',
		'--ref',
		'refs/tags/v1.1.0',
		'--rekor',
		'--offline-sigstore-fixture',
		githubFixture,
		'--out',
		githubSigned,
	]).ok,
	true,
);
assert.equal(
	json(bin, ['verify', githubSigned, '--target', 'source', '--policy', githubPolicy, '--offline-sigstore-fixture', githubFixture]).ok,
	true,
);

const compiled = join(project, 'compiled');
mkdirSync(compiled, { recursive: true });
assert.equal(
	json(bin, [
		'compile',
		didSigned,
		'--target',
		'SKILL.md',
		'AGENTS.md',
		'MCP-SERVER.md',
		'--out-dir',
		compiled,
		'--integrity',
		'--manifest',
		join(compiled, 'manifest.json'),
	]).ok,
	true,
);
assert.equal(json(bin, ['validate', join(compiled, 'SKILL.md'), '--target', 'SKILL.md']).ok, true);
assert.equal(json(bin, ['validate', join(compiled, 'AGENTS.md'), '--target', 'AGENTS.md']).ok, true);
assert.equal(json(bin, ['validate', join(compiled, 'MCP-SERVER.md'), '--target', 'MCP-SERVER.md']).ok, true);
assert.equal(
	json(bin, [
		'integrity',
		'verify',
		join(compiled, 'MCP-SERVER.md'),
		'--target',
		'MCP-SERVER.md',
		'--sidecar',
		join(compiled, 'mcp-server.json'),
	]).ok,
	true,
);

const registryDir = join(project, 'registry');
mkdirSync(registryDir, { recursive: true });
const releasePlanOut = join(project, 'release', 'plan.json');
const releasePlanResult = json(bin, [
	'release',
	'prepare',
	'--target',
	'llmix-registry',
	'--source',
	join(project, 'release-source-set'),
	'--registry-dir',
	registryDir,
	'--policy',
	didPolicy,
	'--did-document',
	didDocument,
	'--out',
	releasePlanOut,
]);
assert.equal(releasePlanResult.ok, true);
const releasePlan = JSON.parse(readFileSync(releasePlanOut, 'utf8'));

const registryRootDir = join(registryDir, 'snapshots', '2026-05-11T000000Z');
const registryRootPath = join(registryRootDir, 'registry-root.json');
mkdirSync(registryRootDir, { recursive: true });
const registryRootBody = {
	version: 1,
	kind: 'llmix-registry-root',
	revision: '2026-05-11T000000Z',
	publishedAt: '2026-05-11T00:00:00Z',
	highWatermark: '2026-05-11T000000Z',
	sourceSetDigest: releasePlan.sourceSetDigest,
	sources: releasePlan.sources.map((sourceEntry) => ({
		registryEntryIdentity: sourceEntry.expectedRegistryEntryIdentity,
		registryEntryPath: sourceEntry.expectedRegistryEntryPath,
		canonicalSourceDigest: sourceEntry.canonicalSourceDigest,
		signaturePayloadDigest: sourceEntry.signaturePayloadDigest,
	})),
};
const registryRootDigest = digestJson(registryRootBody);
writeJson(registryRootPath, {
	...registryRootBody,
	integrity: { algorithm: 'sha256', digest: registryRootDigest },
	signatures: [
		{
			signer: 'did-web:tools.example.com',
			'key-id': didKeyId,
			algorithm: 'ed25519',
			'payload-type': INTEGRITY_PAYLOAD_TYPE,
			'payload-digest': registryRootDigest,
			signature: signatureForPayloadType(didPrivateKey, INTEGRITY_PAYLOAD_TYPE, registryRootDigest),
		},
	],
});

const trustManifestOut = join(project, 'release', 'llmix-trust.json');
assert.equal(
	json(bin, [
		'release',
		'finalize',
		'--target',
		'llmix-registry',
		'--registry-dir',
		registryDir,
		'--registry-root',
		registryRootPath,
		'--release-plan',
		releasePlanOut,
		'--policy',
		didPolicy,
		'--did-document',
		didDocument,
		'--derive-root-digest',
		'--minimum-revision',
		'2026-05-11T000000Z',
		'--minimum-published-at',
		'2026-05-11T00:00:00Z',
		'--high-watermark',
		'2026-05-11T000000Z',
		'--out',
		trustManifestOut,
	]).ok,
	true,
);

for (const format of ['json', 'env', 'kubernetes', 'github-actions', 'terraform', 'typescript', 'python', 'rust']) {
	const out = snippetOutputPath(format);
	const result = json(bin, [
		'release',
		'finalize',
		'--target',
		'llmix-registry',
		'--registry-dir',
		registryDir,
		'--manifest',
		trustManifestOut,
		'--snippet-format',
		format,
		'--snippet-out',
		out,
	]);
	assert.equal(result.ok, true);
	assert.match(readFileSync(out, 'utf8'), /LLMIX_TRUST_MANIFEST/);
}

assert.equal(
	json(bin, [
		'doctor',
		'release',
		'--target',
		'llmix-registry',
		'--source',
		join(project, 'release-source-set'),
		'--registry-dir',
		registryDir,
		'--release-plan',
		releasePlanOut,
		'--manifest',
		trustManifestOut,
		'--did-document',
		didDocument,
	]).ok,
	true,
);

console.log(`package smoke passed: ${project}`);
