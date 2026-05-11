import { existsSync, readdirSync, realpathSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

import { EXIT, commandResult, diag, ioError, usage, type CommandResult } from '../types.js';
import {
	atomicWrite,
	canonicalizeFromFile,
	computeDigest,
	isRecord,
	jcs,
	readArtifact,
	readJson,
	validateArtifact,
	validateJsonAgainst,
} from '../mda.js';
import {
	DIGEST_PATTERN,
	GITHUB_ACTIONS_ISSUER,
	GITHUB_REF,
	GITHUB_REPOSITORY,
	LLMIX_MODULE_NAME,
	LLMIX_PRESET_NAME,
	LLMIX_SNIPPET_FORMATS,
	SIGSTORE_REKOR_URL,
} from './constants.js';
import { runIntegrity } from './core-commands.js';
import {
	didWebDomainFromDid,
	runVerify,
	trustPolicyMinSignatures,
	verifySignatureEntries,
	type TrustedSignerIdentity,
} from './security-commands.js';
import { artifact, externalNextAction, nextAction, oneOption, parseOptions, unknownOptions } from './shared.js';

type TrustManifestEvidence = {
	expectedRootDigest: string;
	sourceSetDigest: string;
	releasePlanDigest: string;
	registryRootTrustPolicy: unknown;
	rekorPolicy: unknown;
	minimumRevision: string | null;
	minimumPublishedAt: string | null;
	highWatermark: string | null;
	registryRootSignerIdentity: unknown;
	registryRoot: {
		path: string;
		revision: string;
		publishedAt: string;
		highWatermark: string;
	};
	releasePlan: {
		path: string;
		sourceCount: number;
	};
};

export function runLlmix(args: string[]) {
	if (args[0] === 'trust' && args[1] === 'policy') return runLlmixTrustPolicy(args.slice(2));
	if (args[0] === 'trust' && args[1] === 'manifest') return runLlmixTrustManifest(args.slice(2));
	if (args[0] === 'trust' && args[1] === 'snippets') return runLlmixTrustSnippets(args.slice(2));
	if (args[0] === 'release' && args[1] === 'plan') return runLlmixReleasePlan(args.slice(2));
	return usage('llmix', 'Expected subcommand: llmix trust policy | llmix trust manifest | llmix trust snippets | llmix release plan');
}

function runLlmixTrustPolicy(args: string[]) {
	const parsed = parseOptions(args);
	const err = unknownOptions(parsed, ['--profile', '--domain', '--min-signatures', '--out', '--repo', '--workflow', '--ref']);
	if (err) return usage('llmix trust policy', err);
	if (parsed.positional.length !== 0) return usage('llmix trust policy', 'llmix trust policy takes no positional arguments');
	const profile = oneOption(parsed.options, '--profile');
	if (!profile) return usage('llmix trust policy', '--profile <profile> is required');
	if (profile === 'did-web') return runDidWebTrustPolicy(parsed.options);
	if (profile === 'github-actions') return runGithubActionsTrustPolicy(parsed.options);
	return commandResult(
		false,
		'llmix trust policy',
		EXIT.failure,
		[diag('trust_policy.unsupported_profile', `Unsupported trust policy profile: ${profile}`)],
		{
			summary: 'Trust policy profile is not supported',
			nextActions: [
				nextAction(
					'use-did-web-policy-profile',
					'Use did:web for local deterministic signing',
					'mda llmix trust policy --profile did-web --domain example.com --out release-trust-policy.json',
				),
				nextAction(
					'use-github-actions-policy-profile',
					'Use GitHub Actions Sigstore/Rekor for CI release signing',
					'mda llmix trust policy --profile github-actions --repo owner/repo --workflow release.yml --ref refs/heads/main --out release-trust-policy.json',
				),
			],
		},
	);
}

function runLlmixReleasePlan(args: string[]) {
	const parsed = parseOptions(args);
	const err = unknownOptions(parsed, ['--source', '--registry-dir', '--policy', '--out', '--did-document', '--offline-sigstore-fixture']);
	if (err) return usage('llmix release plan', err);
	if (parsed.positional.length !== 0) return usage('llmix release plan', 'llmix release plan takes no positional arguments');

	const sourceDir = oneOption(parsed.options, '--source');
	const registryDir = oneOption(parsed.options, '--registry-dir');
	const policyPath = oneOption(parsed.options, '--policy');
	const out = oneOption(parsed.options, '--out');
	if (!sourceDir) return usage('llmix release plan', '--source <dir> is required');
	if (!registryDir) return usage('llmix release plan', '--registry-dir <dir> is required');
	if (!policyPath) return usage('llmix release plan', '--policy <path> is required');
	if (!out) return usage('llmix release plan', '--out <file> is required');
	if (existsSync(out))
		return ioError('llmix release plan', `Refusing to overwrite existing file: ${out}`, { sourceDir, registryDir, policy: policyPath });

	const policy = readJson(policyPath);
	if (!policy.ok) return ioError('llmix release plan', policy.message, { sourceDir, registryDir, policy: policyPath });
	const policyValidation = validateJsonAgainst(policy.value, 'trustPolicy');
	if (!policyValidation.ok)
		return commandResult(false, 'llmix release plan', EXIT.failure, policyValidation.diagnostics, {
			sourceDir,
			registryDir,
			policy: policyPath,
		});

	const sourceRoot = resolve(sourceDir);
	const scanned = scanMdaSources(sourceRoot);
	if (!scanned.ok) return ioError('llmix release plan', scanned.message, { sourceDir, registryDir, policy: policyPath });
	if (scanned.files.length === 0) {
		return commandResult(false, 'llmix release plan', EXIT.failure, [diag('llmix.no_sources', 'No .mda sources found under --source')], {
			summary: 'LLMix release plan blocked',
			nextActions: [
				nextAction(
					'add-llmix-source',
					'Add signed LLMix .mda preset sources and retry',
					`mda llmix release plan --source ${sourceDir} --registry-dir ${registryDir} --policy ${policyPath} --out ${out}`,
				),
			],
			sourceDir,
			registryDir,
			policy: policyPath,
			written: false,
		});
	}

	const diagnostics: ReturnType<typeof diag>[] = [];
	const sources: Record<string, unknown>[] = [];
	const plannedRegistryEntries = new Map<string, string>();
	const didDocument = oneOption(parsed.options, '--did-document');
	const sigstoreFixture = oneOption(parsed.options, '--offline-sigstore-fixture');
	for (const file of scanned.files) {
		const sourceRelativePath = relativePath(sourceRoot, file);
		const validation = validateArtifact(file, 'source');
		if (!validation.ok) {
			diagnostics.push(...validation.diagnostics.map((d) => ({ ...d, path: file })));
			continue;
		}
		const integrity = runIntegrity(['verify', file, '--target', 'source']);
		if (!integrity.ok) {
			diagnostics.push(...integrity.diagnostics.map((d) => ({ ...d, path: file })));
			continue;
		}
		const verifyArgs = [file, '--target', 'source', '--policy', policyPath];
		if (didDocument) verifyArgs.push('--did-document', didDocument);
		if (sigstoreFixture) verifyArgs.push('--offline-sigstore-fixture', sigstoreFixture);
		const verified = runVerify(verifyArgs);
		if (!verified.ok) {
			diagnostics.push(...verified.diagnostics.map((d) => ({ ...d, path: file })));
			continue;
		}
		const artifactRead = readArtifact(file);
		if (!artifactRead.ok || artifactRead.extract.kind !== 'ok' || !isRecord(artifactRead.extract.frontmatter)) {
			diagnostics.push(diag('llmix.source_unreadable', 'Source frontmatter could not be read after verification', { path: file }));
			continue;
		}
		const identity = llmixPresetIdentity(artifactRead.extract.frontmatter);
		if (!identity) {
			diagnostics.push(
				diag('llmix.release_identity_missing', 'Source is missing a valid metadata.snoai-llmix module and preset', { path: file }),
			);
			continue;
		}
		const canonical = canonicalizeFromFile(file, 'source', null);
		if (!canonical.ok) {
			diagnostics.push(...canonical.diagnostics.map((d) => ({ ...d, path: file })));
			continue;
		}
		const signerIdentity = firstTrustedSignerIdentity(verified.trustedSignerIdentities);
		if (!signerIdentity) {
			diagnostics.push(
				diag('trust_policy.no_trusted_signature', 'Verified source did not return a trusted signer identity', { path: file }),
			);
			continue;
		}
		const expectedRegistryEntryIdentity = `${identity.module}/${identity.preset}`;
		const existingSourcePath = plannedRegistryEntries.get(expectedRegistryEntryIdentity);
		if (existingSourcePath) {
			diagnostics.push(
				diag(
					'llmix.duplicate_registry_entry',
					`Multiple sources target registry entry ${expectedRegistryEntryIdentity}; first source is ${existingSourcePath}`,
					{ path: file },
				),
			);
			continue;
		}
		plannedRegistryEntries.set(expectedRegistryEntryIdentity, sourceRelativePath);
		sources.push({
			module: identity.module,
			preset: identity.preset,
			sourcePath: sourceRelativePath,
			canonicalSourceDigest: computeDigest(canonical.bytes, 'sha256'),
			signaturePayloadDigest: signerIdentity.payloadDigest,
			signerIdentity,
			expectedRegistryEntryIdentity,
			expectedRegistryEntryPath: `${identity.module}/${identity.preset}.json`,
		});
	}

	if (diagnostics.length > 0) {
		return commandResult(false, 'llmix release plan', EXIT.failure, diagnostics, {
			summary: 'LLMix release plan blocked',
			nextActions: [
				nextAction(
					'fix-source-validation',
					'Fix validation, integrity, and signature diagnostics before release planning',
					`mda validate <source.mda> --target source`,
				),
				nextAction(
					'verify-source-signature',
					'Verify each signed preset with the selected trust policy',
					`mda verify <signed.mda> --target source --policy ${policyPath}`,
				),
			],
			sourceDir,
			registryDir,
			policy: policyPath,
			sourceCount: scanned.files.length,
			written: false,
		});
	}

	sources.sort(
		(left, right) =>
			String(left.expectedRegistryEntryIdentity).localeCompare(String(right.expectedRegistryEntryIdentity)) ||
			String(left.sourcePath).localeCompare(String(right.sourcePath)),
	);
	const sourceSetDigest = computeDigest(Buffer.from(jcs({ sources }), 'utf8'), 'sha256');
	const releasePlan = {
		version: 1,
		kind: 'llmix-release-plan',
		sourceDir,
		registryDir,
		policy: policyPath,
		sourceSetDigest,
		sources,
		checklist: [
			{ id: 'source-validation', ok: true, count: sources.length },
			{ id: 'integrity-verification', ok: true, count: sources.length },
			{ id: 'signature-verification', ok: true, count: sources.length },
			{
				id: 'registry-publish',
				ok: false,
				external: true,
				reason: 'Publish with LLMix trustedRuntime=true using this verified source set.',
			},
		],
		publish: {
			external: true,
			trustedRuntime: true,
			next: 'Run the LLMix registry publisher with this verified source set, then sign the registry root before generating the trust manifest.',
		},
	};

	try {
		atomicWrite(out, `${JSON.stringify(releasePlan, null, 2)}\n`);
	} catch (error) {
		return ioError('llmix release plan', error instanceof Error ? error.message : String(error), {
			sourceDir,
			registryDir,
			policy: policyPath,
			out,
			written: false,
		});
	}

	return commandResult(true, 'llmix release plan', EXIT.ok, [], {
		summary: `Wrote LLMix release plan for ${sources.length} source(s)`,
		artifacts: [artifact('llmix-release-plan', out, undefined, sourceSetDigest)],
		nextActions: [
			externalNextAction(
				'publish-llmix-registry',
				'Publish the verified source set with LLMix trustedRuntime=true',
				'use the LLMix registry publisher, then sign the registry root',
			),
			externalNextAction(
				'prepare-trust-manifest-inputs',
				'After registry publication, collect the signed registry root and root trust policy for trust manifest generation',
				'wait for the signed registry root evidence before running the trust manifest step',
				false,
			),
		],
		message: `wrote ${out}`,
		sourceDir,
		registryDir,
		policy: policyPath,
		out,
		sourceSetDigest,
		sourceCount: sources.length,
		releasePlan,
		written: true,
	});
}

function runLlmixTrustManifest(args: string[]) {
	const parsed = parseOptions(args);
	const err = unknownOptions(parsed, [
		'--registry-dir',
		'--registry-root',
		'--release-plan',
		'--policy',
		'--expected-root-digest',
		'--derive-root-digest',
		'--minimum-revision',
		'--minimum-published-at',
		'--high-watermark',
		'--out',
		'--did-document',
		'--offline-sigstore-fixture',
	]);
	if (err) return usage('llmix trust manifest', err);
	if (parsed.positional.length !== 0) return usage('llmix trust manifest', 'llmix trust manifest takes no positional arguments');

	const registryDir = oneOption(parsed.options, '--registry-dir');
	const registryRootPath = oneOption(parsed.options, '--registry-root');
	const releasePlanPath = oneOption(parsed.options, '--release-plan');
	const policyPath = oneOption(parsed.options, '--policy');
	const out = oneOption(parsed.options, '--out');
	const expectedRootDigestOption = oneOption(parsed.options, '--expected-root-digest');
	const deriveRootDigest = parsed.flags.has('--derive-root-digest');
	if (!registryDir) return usage('llmix trust manifest', '--registry-dir <dir> is required');
	if (!registryRootPath) return usage('llmix trust manifest', '--registry-root <file> is required');
	if (!releasePlanPath) return usage('llmix trust manifest', '--release-plan <file> is required');
	if (!policyPath) return usage('llmix trust manifest', '--policy <path> is required');
	if (!out) return usage('llmix trust manifest', '--out <file> is required');
	if (Boolean(expectedRootDigestOption) === deriveRootDigest)
		return usage('llmix trust manifest', 'Choose exactly one: --expected-root-digest <digest> or --derive-root-digest');
	if (expectedRootDigestOption && !DIGEST_PATTERN.test(expectedRootDigestOption))
		return usage('llmix trust manifest', '--expected-root-digest must be a sha256/sha384/sha512 digest');
	if (existsSync(out))
		return ioError('llmix trust manifest', `Refusing to overwrite existing file: ${out}`, {
			registryDir,
			registryRoot: registryRootPath,
			out,
		});
	if (pathResolvesInsideDir(out, registryDir)) {
		return commandResult(
			false,
			'llmix trust manifest',
			EXIT.failure,
			[diag('llmix.manifest_inside_registry', '--out must resolve outside --registry-dir')],
			{
				summary: 'LLMix trust manifest output must be outside the registry directory',
				nextActions: [
					nextAction(
						'write-external-manifest',
						'Write the deployment trust manifest outside config/llm or the selected registry directory',
						`mda llmix trust manifest --registry-dir ${registryDir} --registry-root ${registryRootPath} --release-plan ${releasePlanPath} --policy ${policyPath} --derive-root-digest --out release/llmix-trust.json`,
					),
				],
				registryDir,
				out,
				written: false,
			},
		);
	}

	const policy = readJson(policyPath);
	if (!policy.ok)
		return ioError('llmix trust manifest', policy.message, { registryDir, registryRoot: registryRootPath, policy: policyPath });
	const policyValidation = validateJsonAgainst(policy.value, 'trustPolicy');
	if (!policyValidation.ok)
		return commandResult(false, 'llmix trust manifest', EXIT.failure, policyValidation.diagnostics, {
			registryDir,
			registryRoot: registryRootPath,
			policy: policyPath,
			written: false,
		});
	const releasePlan = readJson(releasePlanPath);
	if (!releasePlan.ok) return ioError('llmix trust manifest', releasePlan.message, { releasePlan: releasePlanPath, written: false });
	const registryRoot = readJson(registryRootPath);
	if (!registryRoot.ok) return ioError('llmix trust manifest', registryRoot.message, { registryRoot: registryRootPath, written: false });

	const diagnostics: ReturnType<typeof diag>[] = [];
	const rootEvidence = validateRegistryRootEvidence(registryRoot.value);
	diagnostics.push(...rootEvidence.diagnostics);
	const releasePlanEvidence = validateReleasePlanEvidence(releasePlan.value);
	diagnostics.push(...releasePlanEvidence.diagnostics);
	if (rootEvidence.ok && releasePlanEvidence.ok) {
		const expectedRootDigest = expectedRootDigestOption ?? rootEvidence.rootDigest;
		if (expectedRootDigest !== rootEvidence.rootDigest) {
			diagnostics.push(diag('llmix.root_digest_mismatch', 'Expected root digest does not match signed registry-root evidence'));
		}
		diagnostics.push(
			...freshnessDiagnostics(rootEvidence.root, {
				minimumRevision: oneOption(parsed.options, '--minimum-revision'),
				minimumPublishedAt: oneOption(parsed.options, '--minimum-published-at'),
				highWatermark: oneOption(parsed.options, '--high-watermark'),
			}),
		);
		diagnostics.push(...sourceSetDiagnostics(rootEvidence.root, releasePlanEvidence.releasePlan));
		const signatureVerification = verifySignatureEntries(
			rootEvidence.root.signatures,
			rootEvidence.root.integrity,
			policy.value,
			oneOption(parsed.options, '--did-document'),
			oneOption(parsed.options, '--offline-sigstore-fixture'),
		);
		if (signatureVerification.malformed) {
			diagnostics.push(diag('signature.invalid_entry', 'Registry-root signature entry is malformed'));
		} else if (signatureVerification.trusted.size === 0) {
			diagnostics.push(
				...(signatureVerification.rejectedTrusted.length > 0
					? signatureVerification.rejectedTrusted
					: [diag('trust_policy.no_trusted_signature', 'No registry-root signature matched the trust policy')]),
			);
		} else {
			const minSignatures = trustPolicyMinSignatures(policy.value);
			if (signatureVerification.trusted.size < minSignatures) {
				diagnostics.push(
					diag(
						'trust_policy.insufficient_trusted_signatures',
						`${signatureVerification.trusted.size} trusted signer identities < ${minSignatures}`,
					),
				);
			}
		}
		if (diagnostics.length === 0) {
			const trustedSignerIdentity = firstTrustedSignerIdentity(signatureVerification.trustedSignerIdentities);
			const manifest = {
				version: 1,
				kind: 'llmix-trust-manifest',
				expectedRootDigest,
				sourceSetDigest: rootEvidence.root.sourceSetDigest,
				releasePlanDigest: computeDigest(Buffer.from(jcs(releasePlan.value), 'utf8'), 'sha256'),
				registryRootTrustPolicy: policy.value,
				rekorPolicy: isRecord(policy.value) && isRecord(policy.value.rekor) ? policy.value.rekor : null,
				minimumRevision: oneOption(parsed.options, '--minimum-revision') ?? null,
				minimumPublishedAt: oneOption(parsed.options, '--minimum-published-at') ?? null,
				highWatermark: oneOption(parsed.options, '--high-watermark') ?? rootEvidence.root.highWatermark,
				registryRootSignerIdentity: trustedSignerIdentity,
				registryRoot: {
					path: registryRootPath,
					revision: rootEvidence.root.revision,
					publishedAt: rootEvidence.root.publishedAt,
					highWatermark: rootEvidence.root.highWatermark,
				},
				releasePlan: { path: releasePlanPath, sourceCount: releasePlanEvidence.releasePlan.sources.length },
			};
			try {
				atomicWrite(out, `${JSON.stringify(manifest, null, 2)}\n`);
			} catch (error) {
				return ioError('llmix trust manifest', error instanceof Error ? error.message : String(error), { out, written: false });
			}
			return commandResult(true, 'llmix trust manifest', EXIT.ok, [], {
				summary: 'Wrote external LLMix deployment trust manifest',
				artifacts: [artifact('llmix-trust-manifest', out, undefined, expectedRootDigest)],
				nextActions: [
					externalNextAction(
						'install-external-trust-manifest',
						'Install this external trust manifest in the deployment configuration outside config/llm',
						`copy ${out} into the deployment config path consumed by secure LLMix startup`,
						false,
					),
					externalNextAction(
						'deploy-signed-registry',
						'Deploy only the signed registry files covered by this manifest and release plan',
						`publish ${registryDir} with registry root ${registryRootPath} and release plan ${releasePlanPath}`,
						false,
					),
				],
				message: `wrote ${out}`,
				registryDir,
				registryRoot: registryRootPath,
				releasePlan: releasePlanPath,
				out,
				expectedRootDigest,
				sourceSetDigest: rootEvidence.root.sourceSetDigest,
				written: true,
			});
		}
	}

	return commandResult(false, 'llmix trust manifest', EXIT.failure, diagnostics, {
		summary: 'LLMix trust manifest blocked',
		nextActions: [
			nextAction(
				'fix-registry-root',
				'Fix registry-root evidence, signature, freshness, or source-set mismatches before writing deployment anchors',
				`mda llmix trust manifest --registry-dir ${registryDir} --registry-root ${registryRootPath} --release-plan ${releasePlanPath} --policy ${policyPath} --derive-root-digest --out ${out}`,
			),
		],
		registryDir,
		registryRoot: registryRootPath,
		releasePlan: releasePlanPath,
		out,
		written: false,
	});
}

function runLlmixTrustSnippets(args: string[]) {
	const parsed = parseOptions(args);
	const err = unknownOptions(parsed, ['--manifest', '--format', '--out']);
	if (err) return usage('llmix trust snippets', err);
	if (parsed.positional.length !== 0) return usage('llmix trust snippets', 'llmix trust snippets takes no positional arguments');

	const manifestPath = oneOption(parsed.options, '--manifest');
	const format = oneOption(parsed.options, '--format');
	const out = oneOption(parsed.options, '--out');
	if (!manifestPath) return usage('llmix trust snippets', '--manifest <path> is required');
	if (!format) return usage('llmix trust snippets', '--format <format> is required');
	if (!LLMIX_SNIPPET_FORMATS.has(format))
		return usage('llmix trust snippets', '--format must be json, env, kubernetes, github-actions, terraform, typescript, python, or rust');
	if (!out) return usage('llmix trust snippets', '--out <file> is required');
	if (existsSync(out)) {
		return ioError('llmix trust snippets', `Refusing to overwrite existing file: ${out}`, {
			manifest: manifestPath,
			format,
			out,
			written: false,
		});
	}

	const manifestRead = readJson(manifestPath);
	if (!manifestRead.ok) return ioError('llmix trust snippets', manifestRead.message, { manifest: manifestPath, out, written: false });
	const manifest = validateTrustManifestEvidence(manifestRead.value);
	if (!manifest.ok) {
		return commandResult(false, 'llmix trust snippets', EXIT.failure, manifest.diagnostics, {
			summary: 'LLMix trust snippet generation blocked',
			nextActions: [
				nextAction(
					'regenerate-trust-manifest',
					'Regenerate a valid external trust manifest before producing deployment snippets',
					'mda llmix trust manifest --registry-dir <registry> --registry-root <registry-root.json> --release-plan <release-plan.json> --policy <policy.json> --derive-root-digest --out release/llmix-trust.json',
				),
			],
			manifest: manifestPath,
			format,
			out,
			written: false,
		});
	}

	const content = renderLlmixTrustSnippet(format, manifestPath, manifest.manifest);
	try {
		atomicWrite(out, content);
	} catch (error) {
		return ioError('llmix trust snippets', error instanceof Error ? error.message : String(error), {
			manifest: manifestPath,
			format,
			out,
			written: false,
		});
	}

	return commandResult(true, 'llmix trust snippets', EXIT.ok, [], {
		summary: `Wrote ${format} LLMix deployment trust snippet`,
		artifacts: [artifact('llmix-trust-snippet', out)],
		nextActions: [
			externalNextAction(
				'install-deployment-snippet',
				'Install this snippet in deployment configuration outside config/llm',
				`wire ${out} into the deployment environment that starts secure LLMix`,
				false,
			),
			nextAction(
				'run-llmix-doctor',
				'Check the source, registry, and manifest before deployment',
				`mda doctor llmix --source <source-dir> --registry-dir <registry-dir> --manifest ${manifestPath}`,
				false,
			),
		],
		message: `wrote ${out}`,
		manifest: manifestPath,
		format,
		out,
		written: true,
	});
}

export function runDoctor(args: string[]) {
	if (args[0] !== 'llmix') return usage('doctor', 'Expected subcommand: doctor llmix');
	const parsed = parseOptions(args.slice(1));
	const err = unknownOptions(parsed, ['--source', '--registry-dir', '--manifest', '--did-document', '--offline-sigstore-fixture']);
	if (err) return usage('doctor llmix', err);
	if (parsed.positional.length !== 0) return usage('doctor llmix', 'doctor llmix takes no positional arguments');

	const sourceDir = oneOption(parsed.options, '--source');
	const registryDir = oneOption(parsed.options, '--registry-dir');
	const manifestPath = oneOption(parsed.options, '--manifest');
	const didDocumentPath = oneOption(parsed.options, '--did-document');
	const sigstoreFixturePath = oneOption(parsed.options, '--offline-sigstore-fixture');
	if (!sourceDir) return usage('doctor llmix', '--source <dir> is required');
	if (!registryDir) return usage('doctor llmix', '--registry-dir <dir> is required');
	if (!manifestPath) return usage('doctor llmix', '--manifest <path> is required');
	if (!existsSync(manifestPath)) {
		return commandResult(false, 'doctor llmix', EXIT.failure, [diag('llmix.manifest_missing', 'Trust manifest is missing')], {
			summary: 'LLMix doctor found release readiness issues',
			nextActions: [
				nextAction(
					'create-trust-manifest',
					'Generate the external deployment trust manifest before release',
					`mda llmix trust manifest --registry-dir ${registryDir} --registry-root <registry-root.json> --release-plan <release-plan.json> --policy <policy.json> --derive-root-digest --out ${manifestPath}`,
				),
			],
			sourceDir,
			registryDir,
			manifest: manifestPath,
			readOnly: true,
			written: false,
		});
	}

	const manifestRead = readJson(manifestPath);
	if (!manifestRead.ok)
		return ioError('doctor llmix', manifestRead.message, {
			sourceDir,
			registryDir,
			manifest: manifestPath,
			readOnly: true,
			written: false,
		});

	const diagnostics: ReturnType<typeof diag>[] = [];
	const checks: { id: string; ok: boolean }[] = [];
	if (pathResolvesInsideDir(manifestPath, registryDir)) {
		diagnostics.push(diag('llmix.manifest_inside_registry', '--manifest must resolve outside --registry-dir'));
		checks.push({ id: 'manifest-placement', ok: false });
	} else {
		checks.push({ id: 'manifest-placement', ok: true });
	}

	const manifest = validateTrustManifestEvidence(manifestRead.value);
	diagnostics.push(...manifest.diagnostics);
	checks.push({ id: 'trust-manifest-shape', ok: manifest.ok });
	if (manifest.ok) {
		const registryRootRead = readJson(manifest.manifest.registryRoot.path);
		if (!registryRootRead.ok)
			diagnostics.push(diag('filesystem.io', registryRootRead.message, { path: manifest.manifest.registryRoot.path }));
		const releasePlanRead = readJson(manifest.manifest.releasePlan.path);
		if (!releasePlanRead.ok) diagnostics.push(diag('filesystem.io', releasePlanRead.message, { path: manifest.manifest.releasePlan.path }));

		const rootEvidence = registryRootRead.ok ? validateRegistryRootEvidence(registryRootRead.value) : null;
		const releasePlanEvidence = releasePlanRead.ok ? validateReleasePlanEvidence(releasePlanRead.value) : null;
		if (rootEvidence) diagnostics.push(...rootEvidence.diagnostics);
		if (releasePlanEvidence) diagnostics.push(...releasePlanEvidence.diagnostics);
		checks.push({ id: 'registry-root-evidence', ok: Boolean(rootEvidence?.ok) });
		checks.push({ id: 'release-plan-evidence', ok: Boolean(releasePlanEvidence?.ok) });

		if (rootEvidence?.ok && releasePlanEvidence?.ok) {
			if (manifest.manifest.expectedRootDigest !== rootEvidence.rootDigest)
				diagnostics.push(diag('llmix.root_digest_mismatch', 'Trust manifest expectedRootDigest does not match registry-root evidence'));
			if (manifest.manifest.sourceSetDigest !== rootEvidence.root.sourceSetDigest)
				diagnostics.push(diag('llmix.source_set_digest_mismatch', 'Trust manifest sourceSetDigest does not match registry-root evidence'));
			if (manifest.manifest.releasePlanDigest !== computeDigest(Buffer.from(jcs(releasePlanRead.value), 'utf8'), 'sha256'))
				diagnostics.push(diag('llmix.release_plan_digest_mismatch', 'Trust manifest releasePlanDigest does not match release plan'));
			diagnostics.push(...sourceSetDiagnostics(rootEvidence.root, releasePlanEvidence.releasePlan));
			diagnostics.push(
				...freshnessDiagnostics(rootEvidence.root, {
					minimumRevision: manifest.manifest.minimumRevision,
					minimumPublishedAt: manifest.manifest.minimumPublishedAt,
					highWatermark: manifest.manifest.highWatermark,
				}),
			);
			const signatureVerification = verifySignatureEntries(
				rootEvidence.root.signatures,
				rootEvidence.root.integrity,
				manifest.manifest.registryRootTrustPolicy,
				didDocumentPath,
				sigstoreFixturePath,
			);
			if (signatureVerification.malformed) {
				diagnostics.push(diag('signature.invalid_entry', 'Registry-root signature entry is malformed'));
			} else if (signatureVerification.trusted.size < trustPolicyMinSignatures(manifest.manifest.registryRootTrustPolicy)) {
				diagnostics.push(
					...(signatureVerification.rejectedTrusted.length > 0
						? signatureVerification.rejectedTrusted
						: [diag('trust_policy.no_trusted_signature', 'Registry-root signatures do not match the embedded trust policy')]),
				);
			}
		}
		checks.push({
			id: 'registry-root-trust',
			ok: diagnostics.length === 0 && Boolean(rootEvidence?.ok && releasePlanEvidence?.ok),
		});
	}

	const sourceReadiness = doctorSourceReadiness(sourceDir);
	diagnostics.push(...sourceReadiness.diagnostics);
	checks.push({ id: 'source-readiness', ok: sourceReadiness.ok });

	if (diagnostics.length > 0) {
		return commandResult(false, 'doctor llmix', EXIT.failure, diagnostics, {
			summary: 'LLMix doctor found release readiness issues',
			nextActions: [
				nextAction(
					'fix-llmix-release-state',
					'Fix the reported source, registry, manifest, freshness, or placement issue and run doctor again',
					`mda doctor llmix --source ${sourceDir} --registry-dir ${registryDir} --manifest ${manifestPath}`,
				),
			],
			sourceDir,
			registryDir,
			manifest: manifestPath,
			checks,
			readOnly: true,
			written: false,
		});
	}

	return commandResult(true, 'doctor llmix', EXIT.ok, [], {
		summary: 'LLMix release state is ready for secure deployment',
		nextActions: [
			externalNextAction(
				'deploy-secure-llmix',
				'Deploy the signed registry with the external trust manifest and generated deployment snippet',
				'use the deployment system that mounts the manifest outside config/llm',
				false,
			),
		],
		sourceDir,
		registryDir,
		manifest: manifestPath,
		checks,
		sourceCount: sourceReadiness.sourceCount,
		readOnly: true,
		written: false,
	});
}

function validateTrustManifestEvidence(value: unknown) {
	const diagnostics: ReturnType<typeof diag>[] = [];
	if (!isRecord(value)) {
		return { ok: false as const, diagnostics: [diag('llmix.trust_manifest_invalid', 'Trust manifest must be a JSON object')] };
	}
	if (value.kind !== 'llmix-trust-manifest')
		diagnostics.push(diag('llmix.trust_manifest_invalid', 'Trust manifest kind must be llmix-trust-manifest'));
	if (value.version !== 1) diagnostics.push(diag('llmix.trust_manifest_invalid', 'Trust manifest version must be 1'));
	if (typeof value.expectedRootDigest !== 'string' || !DIGEST_PATTERN.test(value.expectedRootDigest))
		diagnostics.push(diag('llmix.trust_manifest_invalid', 'Trust manifest expectedRootDigest must be a digest'));
	if (typeof value.sourceSetDigest !== 'string' || !DIGEST_PATTERN.test(value.sourceSetDigest))
		diagnostics.push(diag('llmix.trust_manifest_invalid', 'Trust manifest sourceSetDigest must be a digest'));
	if (typeof value.releasePlanDigest !== 'string' || !DIGEST_PATTERN.test(value.releasePlanDigest))
		diagnostics.push(diag('llmix.trust_manifest_invalid', 'Trust manifest releasePlanDigest must be a digest'));
	if (!isNullableString(value.minimumRevision))
		diagnostics.push(diag('llmix.trust_manifest_invalid', 'Trust manifest minimumRevision must be a string or null'));
	if (!isNullableString(value.minimumPublishedAt))
		diagnostics.push(diag('llmix.trust_manifest_invalid', 'Trust manifest minimumPublishedAt must be a string or null'));
	if (!isNullableString(value.highWatermark))
		diagnostics.push(diag('llmix.trust_manifest_invalid', 'Trust manifest highWatermark must be a string or null'));
	if (!isRecord(value.registryRoot)) {
		diagnostics.push(diag('llmix.trust_manifest_invalid', 'Trust manifest registryRoot must be an object'));
	} else {
		if (typeof value.registryRoot.path !== 'string' || value.registryRoot.path.length === 0)
			diagnostics.push(diag('llmix.trust_manifest_invalid', 'Trust manifest registryRoot.path must be a non-empty string'));
		if (typeof value.registryRoot.revision !== 'string' || value.registryRoot.revision.length === 0)
			diagnostics.push(diag('llmix.trust_manifest_invalid', 'Trust manifest registryRoot.revision must be a non-empty string'));
		if (typeof value.registryRoot.publishedAt !== 'string' || Number.isNaN(Date.parse(value.registryRoot.publishedAt)))
			diagnostics.push(diag('llmix.trust_manifest_invalid', 'Trust manifest registryRoot.publishedAt must be an ISO timestamp'));
		if (typeof value.registryRoot.highWatermark !== 'string' || value.registryRoot.highWatermark.length === 0)
			diagnostics.push(diag('llmix.trust_manifest_invalid', 'Trust manifest registryRoot.highWatermark must be a non-empty string'));
	}
	if (!isRecord(value.releasePlan)) {
		diagnostics.push(diag('llmix.trust_manifest_invalid', 'Trust manifest releasePlan must be an object'));
	} else {
		if (typeof value.releasePlan.path !== 'string' || value.releasePlan.path.length === 0)
			diagnostics.push(diag('llmix.trust_manifest_invalid', 'Trust manifest releasePlan.path must be a non-empty string'));
		const sourceCount = value.releasePlan.sourceCount;
		if (typeof sourceCount !== 'number' || !Number.isInteger(sourceCount) || sourceCount < 0)
			diagnostics.push(diag('llmix.trust_manifest_invalid', 'Trust manifest releasePlan.sourceCount must be a non-negative integer'));
	}
	if (diagnostics.length > 0) return { ok: false as const, diagnostics };
	return { ok: true as const, diagnostics, manifest: value as TrustManifestEvidence };
}

function isNullableString(value: unknown) {
	return value === null || typeof value === 'string';
}

function renderLlmixTrustSnippet(format: string, manifestPath: string, manifest: TrustManifestEvidence) {
	const vars = {
		LLMIX_TRUST_MANIFEST: manifestPath,
		LLMIX_EXPECTED_ROOT_DIGEST: manifest.expectedRootDigest,
		LLMIX_SOURCE_SET_DIGEST: manifest.sourceSetDigest,
		LLMIX_RELEASE_PLAN_DIGEST: manifest.releasePlanDigest,
		LLMIX_REGISTRY_ROOT: manifest.registryRoot.path,
		LLMIX_RELEASE_PLAN: manifest.releasePlan.path,
		LLMIX_HIGH_WATERMARK: manifest.highWatermark ?? '',
	};
	if (format === 'json') return `${JSON.stringify(vars, null, 2)}\n`;
	if (format === 'env')
		return `${Object.entries(vars)
			.map(([key, value]) => `${key}=${JSON.stringify(value)}`)
			.join('\n')}\n`;
	if (format === 'kubernetes') {
		return [
			'apiVersion: v1',
			'kind: ConfigMap',
			'metadata:',
			'  name: llmix-trust',
			'data:',
			...Object.entries(vars).map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`),
			'',
		].join('\n');
	}
	if (format === 'github-actions') {
		return ['env:', ...Object.entries(vars).map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`), ''].join('\n');
	}
	if (format === 'terraform') {
		return [
			'locals {',
			'  llmix_trust = {',
			...Object.entries(vars).map(([key, value]) => `    ${key} = ${JSON.stringify(value)}`),
			'  }',
			'}',
			'',
		].join('\n');
	}
	if (format === 'typescript') return `export const llmixTrust = ${JSON.stringify(vars, null, 2)} as const;\n`;
	if (format === 'python') return `LLMIX_TRUST = ${JSON.stringify(vars, null, 2)}\n`;
	return `${Object.entries(vars)
		.map(([key, value]) => `pub const ${key}: &str = ${JSON.stringify(value)};`)
		.join('\n')}\n`;
}

function doctorSourceReadiness(sourceDir: string) {
	const diagnostics: ReturnType<typeof diag>[] = [];
	const scanned = scanMdaSources(resolve(sourceDir));
	if (!scanned.ok) return { ok: false, diagnostics: [diag('filesystem.io', scanned.message)], sourceCount: 0 };
	if (scanned.files.length === 0) {
		return {
			ok: false,
			diagnostics: [diag('llmix.no_sources', 'No .mda sources found under --source')],
			sourceCount: 0,
		};
	}
	for (const file of scanned.files) {
		const validation = validateArtifact(file, 'source');
		if (!validation.ok) diagnostics.push(...validation.diagnostics.map((d) => ({ ...d, path: file })));
		const integrity = runIntegrity(['verify', file, '--target', 'source']);
		if (!integrity.ok) diagnostics.push(...integrity.diagnostics.map((d) => ({ ...d, path: file })));
	}
	return { ok: diagnostics.length === 0, diagnostics, sourceCount: scanned.files.length };
}

type RegistryRootEvidence = {
	revision: string;
	publishedAt: string;
	highWatermark: string;
	sourceSetDigest: string;
	sources: Record<string, unknown>[];
	integrity: { algorithm: 'sha256'; digest: string };
	signatures: unknown[];
};

type ReleasePlanEvidence = {
	sourceSetDigest: string;
	sources: Record<string, unknown>[];
};

function validateRegistryRootEvidence(value: unknown) {
	const diagnostics: ReturnType<typeof diag>[] = [];
	if (!isRecord(value)) {
		return { ok: false as const, diagnostics: [diag('llmix.registry_root_invalid', 'Registry-root evidence must be a JSON object')] };
	}
	if (value.kind !== 'llmix-registry-root')
		diagnostics.push(diag('llmix.registry_root_invalid', 'Registry-root kind must be llmix-registry-root'));
	if (value.version !== 1) diagnostics.push(diag('llmix.registry_root_invalid', 'Registry-root version must be 1'));
	if (typeof value.revision !== 'string' || value.revision.length === 0)
		diagnostics.push(diag('llmix.registry_root_invalid', 'Registry-root revision must be a non-empty string'));
	if (typeof value.publishedAt !== 'string' || Number.isNaN(Date.parse(value.publishedAt)))
		diagnostics.push(diag('llmix.registry_root_invalid', 'Registry-root publishedAt must be an ISO timestamp'));
	if (typeof value.highWatermark !== 'string' || value.highWatermark.length === 0)
		diagnostics.push(diag('llmix.registry_root_invalid', 'Registry-root highWatermark must be a non-empty string'));
	if (typeof value.sourceSetDigest !== 'string' || !DIGEST_PATTERN.test(value.sourceSetDigest))
		diagnostics.push(diag('llmix.registry_root_invalid', 'Registry-root sourceSetDigest must be a digest'));
	const sources = Array.isArray(value.sources) ? value.sources : null;
	if (!sources) {
		diagnostics.push(diag('llmix.registry_root_invalid', 'Registry-root sources must be an array'));
	} else {
		for (const [index, source] of sources.entries()) {
			if (!isRecord(source)) diagnostics.push(diag('llmix.registry_root_invalid', `Registry-root sources[${index}] must be a JSON object`));
		}
	}
	if (!isRecord(value.integrity) || value.integrity.algorithm !== 'sha256' || typeof value.integrity.digest !== 'string') {
		diagnostics.push(diag('llmix.registry_root_invalid', 'Registry-root integrity must contain sha256 digest'));
	}
	if (!Array.isArray(value.signatures) || value.signatures.length === 0)
		diagnostics.push(diag('missing-required-signature', 'Registry-root evidence requires signatures[]'));
	const rootDigest = computeDigest(Buffer.from(jcs(unsignedRegistryRoot(value)), 'utf8'), 'sha256');
	if (isRecord(value.integrity) && typeof value.integrity.digest === 'string' && value.integrity.digest !== rootDigest) {
		diagnostics.push(diag('integrity.mismatch', 'Registry-root integrity digest does not match canonical evidence bytes'));
	}
	if (diagnostics.length > 0) return { ok: false as const, diagnostics };
	const root: RegistryRootEvidence = {
		revision: value.revision as string,
		publishedAt: value.publishedAt as string,
		highWatermark: value.highWatermark as string,
		sourceSetDigest: value.sourceSetDigest as string,
		sources: sources as Record<string, unknown>[],
		integrity: value.integrity as { algorithm: 'sha256'; digest: string },
		signatures: value.signatures as unknown[],
	};
	return {
		ok: true as const,
		diagnostics,
		rootDigest,
		root,
	};
}

function unsignedRegistryRoot(root: Record<string, unknown>) {
	const unsigned: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(root)) {
		if (key !== 'integrity' && key !== 'signatures') unsigned[key] = value;
	}
	return unsigned;
}

function validateReleasePlanEvidence(value: unknown) {
	const diagnostics: ReturnType<typeof diag>[] = [];
	if (!isRecord(value)) {
		return { ok: false as const, diagnostics: [diag('llmix.release_plan_invalid', 'Release plan must be a JSON object')] };
	}
	if (value.kind !== 'llmix-release-plan')
		diagnostics.push(diag('llmix.release_plan_invalid', 'Release plan kind must be llmix-release-plan'));
	if (typeof value.sourceSetDigest !== 'string' || !DIGEST_PATTERN.test(value.sourceSetDigest))
		diagnostics.push(diag('llmix.release_plan_invalid', 'Release plan sourceSetDigest must be a digest'));
	const sources = Array.isArray(value.sources) ? value.sources : null;
	if (!sources) {
		diagnostics.push(diag('llmix.release_plan_invalid', 'Release plan sources must be an array'));
	} else {
		for (const [index, source] of sources.entries()) {
			if (!isRecord(source)) diagnostics.push(diag('llmix.release_plan_invalid', `Release plan sources[${index}] must be a JSON object`));
		}
	}
	if (diagnostics.length > 0) return { ok: false as const, diagnostics };
	const releasePlan: ReleasePlanEvidence = {
		sourceSetDigest: value.sourceSetDigest as string,
		sources: sources as Record<string, unknown>[],
	};
	return {
		ok: true as const,
		diagnostics,
		releasePlan,
	};
}

function freshnessDiagnostics(
	root: RegistryRootEvidence,
	requirements: { minimumRevision: string | null; minimumPublishedAt: string | null; highWatermark: string | null },
) {
	const diagnostics: ReturnType<typeof diag>[] = [];
	if (requirements.minimumRevision) {
		const comparison = compareMonotonicRequirement(root.revision, requirements.minimumRevision, 'revision');
		if (!comparison.ok) diagnostics.push(...comparison.diagnostics);
		else if (comparison.value < 0)
			diagnostics.push(diag('llmix.freshness_revision_rollback', 'Registry-root revision is below minimumRevision'));
	}
	if (requirements.minimumPublishedAt) {
		const publishedAt = Date.parse(root.publishedAt);
		const minimumPublishedAt = Date.parse(requirements.minimumPublishedAt);
		if (Number.isNaN(minimumPublishedAt))
			diagnostics.push(diag('llmix.freshness_invalid', '--minimum-published-at must be an ISO timestamp'));
		else if (publishedAt < minimumPublishedAt)
			diagnostics.push(diag('llmix.freshness_published_at_rollback', 'Registry-root publishedAt is below minimumPublishedAt'));
	}
	if (requirements.highWatermark) {
		const comparison = compareMonotonicRequirement(root.highWatermark, requirements.highWatermark, 'highWatermark');
		if (!comparison.ok) diagnostics.push(...comparison.diagnostics);
		else if (comparison.value < 0)
			diagnostics.push(diag('llmix.high_watermark_rollback', 'Registry-root highWatermark is below the required high-watermark'));
	}
	return diagnostics;
}

type MonotonicValue = { kind: 'integer'; value: string } | { kind: 'timestamp'; value: number };

function compareMonotonicRequirement(actual: string, requirement: string, label: string) {
	const actualValue = parseMonotonicValue(actual, `registry-root ${label}`);
	const requiredValue = parseMonotonicValue(requirement, `required ${label}`);
	const diagnostics = [...actualValue.diagnostics, ...requiredValue.diagnostics];
	if (!actualValue.ok || !requiredValue.ok) return { ok: false as const, diagnostics };
	if (actualValue.value.kind !== requiredValue.value.kind) {
		return {
			ok: false as const,
			diagnostics: [diag('llmix.freshness_invalid', `${label} and required ${label} must use the same monotonic format`)],
		};
	}
	return { ok: true as const, value: compareMonotonicValues(actualValue.value, requiredValue.value) };
}

function parseMonotonicValue(value: string, label: string) {
	if (/^(0|[1-9][0-9]*)$/.test(value)) {
		return { ok: true as const, diagnostics: [], value: { kind: 'integer', value } as MonotonicValue };
	}
	const compactUtc = value.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2})([0-9]{2})([0-9]{2})Z$/);
	const millis = compactUtc
		? Date.UTC(
				Number(compactUtc[1]),
				Number(compactUtc[2]) - 1,
				Number(compactUtc[3]),
				Number(compactUtc[4]),
				Number(compactUtc[5]),
				Number(compactUtc[6]),
			)
		: Date.parse(value);
	if (!Number.isNaN(millis)) {
		return { ok: true as const, diagnostics: [], value: { kind: 'timestamp', value: millis } as MonotonicValue };
	}
	return {
		ok: false as const,
		diagnostics: [
			diag(
				'llmix.freshness_invalid',
				`${label} must be a decimal integer, ISO timestamp, or compact UTC timestamp like 2026-05-09T120000Z`,
			),
		],
	};
}

function compareMonotonicValues(actual: MonotonicValue, requirement: MonotonicValue) {
	if (actual.kind === 'timestamp' && requirement.kind === 'timestamp') return actual.value - requirement.value;
	if (actual.kind === 'integer' && requirement.kind === 'integer') {
		if (actual.value.length !== requirement.value.length) return actual.value.length - requirement.value.length;
		return actual.value.localeCompare(requirement.value);
	}
	return 0;
}

function sourceSetDiagnostics(root: RegistryRootEvidence, releasePlan: ReleasePlanEvidence) {
	const diagnostics: ReturnType<typeof diag>[] = [];
	if (root.sourceSetDigest !== releasePlan.sourceSetDigest) {
		diagnostics.push(diag('llmix.source_set_digest_mismatch', 'Registry-root sourceSetDigest does not match the release plan'));
	}
	const rootSources = new Map<string, Record<string, unknown>>();
	for (const source of root.sources) {
		const identity = registryEntryIdentity(source);
		if (!identity) {
			diagnostics.push(diag('llmix.registry_root_identity_mismatch', 'Registry-root source is missing registry entry identity'));
			continue;
		}
		if (rootSources.has(identity)) {
			diagnostics.push(diag('llmix.registry_root_duplicate_preset', `Registry-root has duplicate preset ${identity}`));
			continue;
		}
		rootSources.set(identity, source);
	}
	const releaseIdentities = new Set<string>();
	for (const source of releasePlan.sources) {
		const identity = registryEntryIdentity(source);
		if (!identity) {
			diagnostics.push(diag('llmix.release_plan_invalid', 'Release plan source is missing registry entry identity'));
			continue;
		}
		if (releaseIdentities.has(identity)) {
			diagnostics.push(diag('llmix.release_plan_duplicate_preset', `Release plan has duplicate preset ${identity}`));
			continue;
		}
		releaseIdentities.add(identity);
		const rootSource = rootSources.get(identity);
		if (!rootSource) {
			diagnostics.push(diag('llmix.registry_root_missing_preset', `Registry-root is missing preset ${identity}`));
			continue;
		}
		if (rootSource.canonicalSourceDigest !== source.canonicalSourceDigest) {
			diagnostics.push(diag('llmix.registry_root_stale_digest', `Registry-root digest for ${identity} does not match the release plan`));
		}
		if (rootSource.registryEntryPath !== source.expectedRegistryEntryPath) {
			diagnostics.push(diag('llmix.registry_root_identity_mismatch', `Registry-root path for ${identity} does not match the release plan`));
		}
	}
	for (const identity of rootSources.keys()) {
		if (!releaseIdentities.has(identity))
			diagnostics.push(diag('llmix.registry_root_extra_preset', `Registry-root has extra preset ${identity}`));
	}
	return diagnostics;
}

function registryEntryIdentity(source: Record<string, unknown>) {
	const identity = source.registryEntryIdentity ?? source.expectedRegistryEntryIdentity;
	return typeof identity === 'string' && identity.length > 0 ? identity : null;
}

function pathResolvesInsideDir(candidate: string, rootDir: string) {
	const root = realPathIfPossible(rootDir);
	const parent = realPathIfPossible(dirname(resolve(candidate)));
	const resolvedCandidate = join(parent, basename(candidate));
	return resolvedCandidate === root || resolvedCandidate.startsWith(`${root}${sep}`);
}

function realPathIfPossible(path: string) {
	try {
		return realpathSync(path);
	} catch {
		return resolve(path);
	}
}

function scanMdaSources(root: string) {
	const files: string[] = [];
	try {
		const visit = (dir: string) => {
			for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
				const path = join(dir, entry.name);
				if (entry.isDirectory()) visit(path);
				else if (entry.isFile() && entry.name.endsWith('.mda')) files.push(path);
			}
		};
		visit(root);
		return { ok: true as const, files };
	} catch (error) {
		return { ok: false as const, message: error instanceof Error ? error.message : String(error) };
	}
}

function relativePath(root: string, file: string) {
	return relative(root, file).split(sep).join('/');
}

function llmixPresetIdentity(frontmatter: Record<string, unknown>) {
	const metadata = isRecord(frontmatter.metadata) ? frontmatter.metadata : null;
	const namespace = metadata && isRecord(metadata['snoai-llmix']) ? metadata['snoai-llmix'] : null;
	if (!namespace || typeof namespace.module !== 'string' || typeof namespace.preset !== 'string') return null;
	if (!LLMIX_MODULE_NAME.test(namespace.module) || !LLMIX_PRESET_NAME.test(namespace.preset)) return null;
	return { module: namespace.module, preset: namespace.preset };
}

function firstTrustedSignerIdentity(value: unknown): TrustedSignerIdentity | null {
	if (!Array.isArray(value)) return null;
	for (const entry of value) {
		if (!isRecord(entry)) continue;
		if (entry.type !== 'did-web' && entry.type !== 'sigstore-oidc') continue;
		if (typeof entry.signer !== 'string' || typeof entry.keyId !== 'string' || typeof entry.payloadDigest !== 'string') continue;
		const identity: TrustedSignerIdentity = {
			type: entry.type,
			signer: entry.signer,
			keyId: entry.keyId,
			payloadDigest: entry.payloadDigest,
		};
		if (typeof entry.subject === 'string') identity.subject = entry.subject;
		if (typeof entry.rekorLogId === 'string') identity.rekorLogId = entry.rekorLogId;
		if (typeof entry.rekorLogIndex === 'number') identity.rekorLogIndex = entry.rekorLogIndex;
		return identity;
	}
	return null;
}

function runDidWebTrustPolicy(options: Map<string, string[]>) {
	const profile = 'did-web';
	const domain = oneOption(options, '--domain');
	if (!domain || didWebDomainFromDid(`did:web:${domain}`) !== domain)
		return usage('llmix trust policy', '--domain must be a valid did:web domain');
	const minRaw = oneOption(options, '--min-signatures') ?? '1';
	const minSignatures = Number(minRaw);
	if (!Number.isInteger(minSignatures) || minSignatures < 1)
		return usage('llmix trust policy', '--min-signatures must be a positive integer');
	const policy = { version: 1, minSignatures, trustedSigners: [{ type: 'did-web', domain }] };
	const validation = validateJsonAgainst(policy, 'trustPolicy');
	if (!validation.ok)
		return commandResult(false, 'llmix trust policy', EXIT.failure, validation.diagnostics, { profile, domain, minSignatures });
	const out = oneOption(options, '--out');
	const write = writeTrustPolicy(out, policy, { profile, domain, minSignatures });
	if (!write.ok) return write;
	return commandResult(true, 'llmix trust policy', EXIT.ok, [], {
		summary: out ? `Wrote did:web trust policy to ${out}` : 'Generated did:web trust policy',
		artifacts: out ? [artifact('trust-policy', out)] : [],
		nextActions: out
			? [
					nextAction(
						'verify-signed-preset',
						'Verify a signed preset with this policy',
						`mda verify signed.mda --target source --policy ${out} --did-document did-web-document.json`,
					),
				]
			: [externalNextAction('save-trust-policy', 'Save this policy JSON before release verification', 'write the policy bytes to disk')],
		message: out ? `wrote ${out}` : JSON.stringify(policy, null, 2),
		profile,
		domain,
		minSignatures,
		policy,
		out,
		written: Boolean(out),
	});
}

function runGithubActionsTrustPolicy(options: Map<string, string[]>) {
	const profile = 'github-actions';
	const repo = oneOption(options, '--repo');
	const workflow = oneOption(options, '--workflow');
	const ref = oneOption(options, '--ref');
	if (!repo || !GITHUB_REPOSITORY.test(repo)) return usage('llmix trust policy', '--repo must be a GitHub repository in owner/repo form');
	if (!workflow || workflow.trim() !== workflow || workflow.length === 0)
		return usage('llmix trust policy', '--workflow must be a non-empty workflow file or identity');
	if (!ref || !GITHUB_REF.test(ref))
		return usage('llmix trust policy', '--ref must be an exact Git ref such as refs/heads/main or refs/tags/v1.1.0');

	const subject = `repo:${repo}:ref:${ref}`;
	const policy = {
		version: 1,
		trustedSigners: [
			{
				type: 'sigstore-oidc',
				issuer: GITHUB_ACTIONS_ISSUER,
				subject,
				repository: repo,
				workflow,
				ref,
			},
		],
		rekor: { url: SIGSTORE_REKOR_URL },
	};
	const validation = validateJsonAgainst(policy, 'trustPolicy');
	if (!validation.ok)
		return commandResult(false, 'llmix trust policy', EXIT.failure, validation.diagnostics, { profile, repo, workflow, ref });
	const out = oneOption(options, '--out');
	const write = writeTrustPolicy(out, policy, { profile, repo, workflow, ref });
	if (!write.ok) return write;
	return commandResult(true, 'llmix trust policy', EXIT.ok, [], {
		summary: out ? `Wrote GitHub Actions trust policy to ${out}` : 'Generated GitHub Actions trust policy',
		artifacts: out ? [artifact('trust-policy', out)] : [],
		nextActions: out
			? [
					nextAction(
						'sign-github-actions-release',
						'Sign the release artifact with GitHub Actions Sigstore/Rekor evidence',
						`mda sign release.mda --profile github-actions --repo ${repo} --workflow ${workflow} --ref ${ref} --rekor --offline-sigstore-fixture sigstore-fixture.json --out signed-release.mda`,
					),
					nextAction(
						'verify-github-actions-release',
						'Verify the signed release with this pinned policy',
						`mda verify signed-release.mda --policy ${out} --offline-sigstore-fixture sigstore-fixture.json`,
					),
				]
			: [externalNextAction('save-trust-policy', 'Save this policy JSON before release verification', 'write the policy bytes to disk')],
		message: out ? `wrote ${out}` : JSON.stringify(policy, null, 2),
		profile,
		repo,
		workflow,
		ref,
		policy,
		out,
		written: Boolean(out),
	});
}

function writeTrustPolicy(out: string | null | undefined, policy: unknown, context: Record<string, unknown>): CommandResult {
	if (!out) {
		return commandResult(true, 'llmix trust policy', EXIT.ok, [], { written: false });
	}
	if (existsSync(out))
		return commandResult(false, 'llmix trust policy', EXIT.io, [diag('filesystem.io', `Refusing to overwrite existing file: ${out}`)], {
			...context,
			out,
			written: false,
		});
	try {
		atomicWrite(out, `${JSON.stringify(policy, null, 2)}\n`);
	} catch (error) {
		return ioError('llmix trust policy', error instanceof Error ? error.message : String(error), {
			...context,
			out,
			written: false,
		});
	}
	return commandResult(true, 'llmix trust policy', EXIT.ok, [], { ...context, out, written: true });
}
