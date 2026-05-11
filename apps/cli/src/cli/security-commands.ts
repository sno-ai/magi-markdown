import { createPrivateKey, createPublicKey, sign as cryptoSign, verify as cryptoVerify, type KeyObject } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

import { EXIT, commandResult, diag, ioError, usage } from '../types.js';
import {
	atomicReplace,
	atomicWrite,
	computeDigest,
	isRecord,
	jcs,
	parseTarget,
	readArtifact,
	readJson,
	renderArtifact,
	resolveTarget,
	validateArtifact,
	validateJsonAgainst,
} from '../mda.js';
import { DIGEST_PATTERN, GITHUB_ACTIONS_ISSUER, GITHUB_REF, GITHUB_REPOSITORY, INTEGRITY_PAYLOAD_TYPE } from './constants.js';
import { runIntegrity } from './core-commands.js';
import { artifact, externalNextAction, nextAction, oneOption, parseOptions, unknownOptions } from './shared.js';

type SignatureEntry = Record<string, unknown> & {
	signer: string;
	'key-id': string;
	'payload-digest': string;
	algorithm: string;
	signature: string;
	'payload-type'?: string;
	'rekor-log-id'?: string;
	'rekor-log-index'?: number;
};

type SigstoreFixture = {
	issuer: string;
	subject: string;
	repository: string;
	workflow: string;
	ref: string;
	environment?: string;
	jobWorkflowRef?: string;
	keyId: string;
	algorithm: 'ed25519';
	publicKeyPem: string;
	privateKeyPem?: string;
	expectedPayloadDigest: string;
	rekor: {
		url: string;
		logId: string;
		logIndex: number;
		payloadDigest: string;
	};
};

export type TrustedSignerIdentity = {
	type: 'did-web' | 'sigstore-oidc';
	signer: string;
	keyId: string;
	payloadDigest: string;
	subject?: string;
	rekorLogId?: string;
	rekorLogIndex?: number;
};

function integrityPayloadBytes(integrity: Record<string, unknown>) {
	return Buffer.from(jcs({ integrity: { algorithm: integrity.algorithm, digest: integrity.digest } }), 'utf8');
}

function dssePae(payloadType: string, payload: Buffer) {
	return Buffer.concat([
		Buffer.from(`DSSEv1 ${Buffer.byteLength(payloadType, 'utf8')} ${payloadType} ${payload.length} `, 'utf8'),
		payload,
	]);
}

export function didWebDomainFromDid(did: string) {
	if (!did.startsWith('did:web:')) return null;
	const domain = did.slice('did:web:'.length).split(':')[0];
	if (!/^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$/.test(domain)) return null;
	return domain;
}

function signerDomain(signer: string) {
	return signer.startsWith('did-web:') ? signer.slice('did-web:'.length) : null;
}

function sigstoreIssuer(signer: string) {
	return signer.startsWith('sigstore-oidc:') ? signer.slice('sigstore-oidc:'.length) : null;
}

function keyAlgorithm(key: KeyObject) {
	return key.asymmetricKeyType === 'ed25519' ? 'ed25519' : null;
}

function publicKeyFingerprint(key: KeyObject) {
	return computeDigest(key.export({ format: 'der', type: 'spki' }), 'sha256');
}

function policyAllowsDidWeb(policy: unknown, domain: string) {
	return (
		isRecord(policy) &&
		Array.isArray(policy.trustedSigners) &&
		policy.trustedSigners.some((entry) => isRecord(entry) && entry.type === 'did-web' && entry.domain === domain)
	);
}

function policyAllowsSigstore(policy: unknown, fixture: SigstoreFixture) {
	if (!isRecord(policy) || !Array.isArray(policy.trustedSigners)) return false;
	return policy.trustedSigners.some((entry) => {
		if (!isRecord(entry) || entry.type !== 'sigstore-oidc') return false;
		if (entry.issuer !== fixture.issuer || entry.subject !== fixture.subject) return false;
		if (entry.repository !== undefined && entry.repository !== fixture.repository) return false;
		if (entry.workflow !== undefined && entry.workflow !== fixture.workflow) return false;
		if (entry.ref !== undefined && entry.ref !== fixture.ref) return false;
		if (entry.environment !== undefined && entry.environment !== fixture.environment) return false;
		if (entry.jobWorkflowRef !== undefined && entry.jobWorkflowRef !== fixture.jobWorkflowRef) return false;
		return true;
	});
}

function trustPolicyDiagnostics(policy: unknown, diagnostics: ReturnType<typeof diag>[]) {
	if (!isRecord(policy) || !Array.isArray(policy.trustedSigners)) return diagnostics;
	const hasEnvironmentOnlyGithubActions = policy.trustedSigners.some((entry) => {
		if (!isRecord(entry) || entry.type !== 'sigstore-oidc') return false;
		if (entry.issuer !== GITHUB_ACTIONS_ISSUER || typeof entry.environment !== 'string') return false;
		const hasRefBinding = typeof entry.repository === 'string' && typeof entry.workflow === 'string' && typeof entry.ref === 'string';
		const hasJobWorkflowBinding = typeof entry.repository === 'string' && typeof entry.jobWorkflowRef === 'string';
		return !hasRefBinding && !hasJobWorkflowBinding;
	});
	if (!hasEnvironmentOnlyGithubActions) return diagnostics;
	return [
		diag(
			'trust_policy.environment_only_not_supported',
			'GitHub Actions trust policy must bind repository and exact ref or jobWorkflowRef; environment alone is not supported',
		),
		...diagnostics,
	];
}

function policyMentionsSigstoreIssuer(policy: unknown, issuer: string) {
	return (
		isRecord(policy) &&
		Array.isArray(policy.trustedSigners) &&
		policy.trustedSigners.some((entry) => isRecord(entry) && entry.type === 'sigstore-oidc' && entry.issuer === issuer)
	);
}

export function trustPolicyMinSignatures(policy: unknown) {
	return isRecord(policy) && Number.isInteger(policy.minSignatures) ? Number(policy.minSignatures) : 1;
}

function asSignatureEntry(value: unknown): SignatureEntry | null {
	if (!isRecord(value)) return null;
	if (typeof value.signer !== 'string') return null;
	if (typeof value['key-id'] !== 'string') return null;
	if (typeof value['payload-digest'] !== 'string') return null;
	if (typeof value.algorithm !== 'string') return null;
	if (typeof value.signature !== 'string') return null;
	return value as SignatureEntry;
}

function payloadTypeDiagnostic(signature: SignatureEntry) {
	if (signature['payload-type'] === undefined || signature['payload-type'] === INTEGRITY_PAYLOAD_TYPE) return null;
	return diag('signature.payload_type_mismatch', `Signature payload-type must be ${INTEGRITY_PAYLOAD_TYPE}`);
}

export function verifySignatureEntries(
	signatures: unknown[],
	integrity: { algorithm: string; digest: string },
	policy: unknown,
	didDocumentPath: string | null,
	sigstoreFixturePath: string | null,
) {
	const payload = integrityPayloadBytes(integrity);
	const sigstoreFixture = sigstoreFixturePath ? readSigstoreFixture(sigstoreFixturePath, false) : null;
	const trusted = new Set<string>();
	const trustedSignerIdentities: TrustedSignerIdentity[] = [];
	const rejectedTrusted: ReturnType<typeof diag>[] = [];
	for (const rawSignature of signatures) {
		const signature = asSignatureEntry(rawSignature);
		if (!signature) return { malformed: true as const, trusted, trustedSignerIdentities, rejectedTrusted };
		const domain = signerDomain(signature.signer);
		if (domain) {
			if (!policyAllowsDidWeb(policy, domain)) continue;
			if (signature['payload-digest'] !== integrity.digest) {
				rejectedTrusted.push(diag('signature.digest_mismatch', 'Signature payload digest does not match the expected integrity digest'));
				continue;
			}
			const payloadTypeError = payloadTypeDiagnostic(signature);
			if (payloadTypeError) {
				rejectedTrusted.push(payloadTypeError);
				continue;
			}
			const keyResult = publicKeyFromDidDocument(didDocumentPath, signature['key-id'], `did:web:${domain}`);
			if (!keyResult.ok) {
				rejectedTrusted.push(...keyResult.diagnostics);
				continue;
			}
			if (signature.algorithm !== keyAlgorithm(keyResult.key)) {
				rejectedTrusted.push(
					diag('signature.unsupported_algorithm', `Signature algorithm ${signature.algorithm} does not match the DID public key`),
				);
				continue;
			}
			const ok = cryptoVerify(null, dssePae(INTEGRITY_PAYLOAD_TYPE, payload), keyResult.key, Buffer.from(signature.signature, 'base64'));
			if (!ok) {
				rejectedTrusted.push(diag('signature.verification_failed', `Signature verification failed for ${signature['key-id']}`));
				continue;
			}
			const identityKey = `did-web:${domain}\n${keyResult.keyFingerprint}`;
			if (!trusted.has(identityKey)) {
				trusted.add(identityKey);
				trustedSignerIdentities.push({
					type: 'did-web',
					signer: `did-web:${domain}`,
					keyId: keyResult.methodId,
					payloadDigest: signature['payload-digest'],
				});
			}
			continue;
		}

		const issuer = sigstoreIssuer(signature.signer);
		if (!issuer || !policyMentionsSigstoreIssuer(policy, issuer)) continue;
		if (signature['payload-digest'] !== integrity.digest) {
			rejectedTrusted.push(diag('signature.digest_mismatch', 'Signature payload digest does not match the expected integrity digest'));
			continue;
		}
		const payloadTypeError = payloadTypeDiagnostic(signature);
		if (payloadTypeError) {
			rejectedTrusted.push(payloadTypeError);
			continue;
		}
		if (!sigstoreFixture) {
			rejectedTrusted.push(
				diag('sigstore.fixture_required', '--offline-sigstore-fixture <path> is required for deterministic Sigstore verification'),
			);
			continue;
		}
		if (!sigstoreFixture.ok) {
			rejectedTrusted.push(...sigstoreFixture.diagnostics);
			continue;
		}
		const fixture = sigstoreFixture.fixture;
		if (fixture.issuer !== issuer || fixture.keyId !== signature['key-id'] || !policyAllowsSigstore(policy, fixture)) {
			rejectedTrusted.push(diag('sigstore.identity_mismatch', 'Sigstore fixture identity does not match the signature and trust policy'));
			continue;
		}
		const policyRekor = isRecord(policy) && isRecord(policy.rekor) ? policy.rekor : null;
		if (!policyRekor || policyRekor.url !== fixture.rekor.url) {
			rejectedTrusted.push(diag('rekor.policy_mismatch', 'Trust policy Rekor URL does not match the Sigstore fixture'));
			continue;
		}
		if (fixture.expectedPayloadDigest !== integrity.digest || fixture.rekor.payloadDigest !== integrity.digest) {
			rejectedTrusted.push(
				diag('sigstore.fixture_digest_mismatch', 'Sigstore fixture digest does not match the expected integrity digest'),
			);
			continue;
		}
		if (signature['rekor-log-id'] === undefined || signature['rekor-log-index'] === undefined) {
			rejectedTrusted.push(diag('rekor.evidence_missing', 'Signature is missing required Rekor evidence'));
			continue;
		}
		if (signature['rekor-log-id'] !== fixture.rekor.logId || signature['rekor-log-index'] !== fixture.rekor.logIndex) {
			rejectedTrusted.push(diag('rekor.evidence_mismatch', 'Signature Rekor evidence does not match the Sigstore fixture'));
			continue;
		}
		let publicKey: KeyObject;
		try {
			publicKey = createPublicKey(fixture.publicKeyPem);
		} catch (error) {
			rejectedTrusted.push(diag('sigstore.fixture_invalid', error instanceof Error ? error.message : String(error)));
			continue;
		}
		if (signature.algorithm !== fixture.algorithm || signature.algorithm !== keyAlgorithm(publicKey)) {
			rejectedTrusted.push(diag('signature.unsupported_algorithm', 'Signature algorithm does not match the Sigstore fixture public key'));
			continue;
		}
		const ok = cryptoVerify(null, dssePae(INTEGRITY_PAYLOAD_TYPE, payload), publicKey, Buffer.from(signature.signature, 'base64'));
		if (!ok) {
			rejectedTrusted.push(diag('signature.verification_failed', `Signature verification failed for ${signature['key-id']}`));
			continue;
		}
		const identityKey = `sigstore-oidc:${fixture.issuer}\n${fixture.subject}\n${signature['key-id']}`;
		if (!trusted.has(identityKey)) {
			trusted.add(identityKey);
			trustedSignerIdentities.push({
				type: 'sigstore-oidc',
				signer: `sigstore-oidc:${fixture.issuer}`,
				subject: fixture.subject,
				keyId: signature['key-id'],
				payloadDigest: signature['payload-digest'],
				rekorLogId: fixture.rekor.logId,
				rekorLogIndex: fixture.rekor.logIndex,
			});
		}
	}
	return { malformed: false as const, trusted, trustedSignerIdentities, rejectedTrusted };
}

function readSigstoreFixture(path: string, requirePrivateKey: boolean) {
	const read = readJson(path);
	if (!read.ok) return { ok: false as const, diagnostics: [diag('sigstore.fixture_unavailable', read.message)] };
	const value = read.value;
	const errors: ReturnType<typeof diag>[] = [];
	const requireString = (name: string) => {
		const field = isRecord(value) ? value[name] : undefined;
		if (typeof field !== 'string' || field.length === 0)
			errors.push(diag('sigstore.fixture_invalid', `${name} must be a non-empty string`));
		return typeof field === 'string' ? field : '';
	};
	if (!isRecord(value)) {
		return { ok: false as const, diagnostics: [diag('sigstore.fixture_invalid', 'Sigstore fixture must be a JSON object')] };
	}
	const fixture: SigstoreFixture = {
		issuer: requireString('issuer'),
		subject: requireString('subject'),
		repository: requireString('repository'),
		workflow: requireString('workflow'),
		ref: requireString('ref'),
		keyId: requireString('keyId'),
		algorithm: 'ed25519',
		publicKeyPem: requireString('publicKeyPem'),
		expectedPayloadDigest: requireString('expectedPayloadDigest'),
		rekor: {
			url: '',
			logId: '',
			logIndex: -1,
			payloadDigest: '',
		},
	};
	if (typeof value.environment === 'string' && value.environment.length > 0) fixture.environment = value.environment;
	if (typeof value.jobWorkflowRef === 'string' && value.jobWorkflowRef.length > 0) fixture.jobWorkflowRef = value.jobWorkflowRef;
	if (typeof value.privateKeyPem === 'string' && value.privateKeyPem.length > 0) fixture.privateKeyPem = value.privateKeyPem;
	if (value.algorithm !== 'ed25519') errors.push(diag('sigstore.fixture_invalid', 'algorithm must be ed25519'));
	if (!GITHUB_REPOSITORY.test(fixture.repository)) errors.push(diag('sigstore.fixture_invalid', 'repository must be owner/repo'));
	if (!GITHUB_REF.test(fixture.ref)) errors.push(diag('sigstore.fixture_invalid', 'ref must be an exact refs/heads/* or refs/tags/* ref'));
	if (!DIGEST_PATTERN.test(fixture.expectedPayloadDigest))
		errors.push(diag('sigstore.fixture_invalid', 'expectedPayloadDigest must be a sha256/sha384/sha512 digest'));
	if (requirePrivateKey && !fixture.privateKeyPem) errors.push(diag('sigstore.fixture_invalid', 'privateKeyPem is required for signing'));
	if (!isRecord(value.rekor)) {
		errors.push(diag('sigstore.fixture_invalid', 'rekor must be an object'));
	} else {
		fixture.rekor = {
			url: typeof value.rekor.url === 'string' ? value.rekor.url : '',
			logId: typeof value.rekor.logId === 'string' ? value.rekor.logId : '',
			logIndex: Number(value.rekor.logIndex),
			payloadDigest: typeof value.rekor.payloadDigest === 'string' ? value.rekor.payloadDigest : '',
		};
		if (!fixture.rekor.url) errors.push(diag('sigstore.fixture_invalid', 'rekor.url must be a non-empty string'));
		if (!fixture.rekor.logId) errors.push(diag('sigstore.fixture_invalid', 'rekor.logId must be a non-empty string'));
		if (!Number.isInteger(fixture.rekor.logIndex) || fixture.rekor.logIndex < 0)
			errors.push(diag('sigstore.fixture_invalid', 'rekor.logIndex must be a non-negative integer'));
		if (!DIGEST_PATTERN.test(fixture.rekor.payloadDigest))
			errors.push(diag('sigstore.fixture_invalid', 'rekor.payloadDigest must be a sha256/sha384/sha512 digest'));
	}
	return errors.length > 0 ? { ok: false as const, diagnostics: errors } : { ok: true as const, fixture };
}

function publicKeyFromDidDocument(didDocumentPath: string | null, keyId: string, expectedDid: string) {
	if (!didDocumentPath) {
		return {
			ok: false as const,
			diagnostics: [diag('did_web.document_unavailable', '--did-document <path> is required for local did:web verification')],
		};
	}
	const document = readJson(didDocumentPath);
	if (!document.ok) {
		return { ok: false as const, diagnostics: [diag('did_web.document_unavailable', document.message)] };
	}
	if (!isRecord(document.value) || !Array.isArray(document.value.verificationMethod)) {
		return { ok: false as const, diagnostics: [diag('did_web.document_invalid', 'DID document must contain verificationMethod[]')] };
	}
	if (document.value.id !== expectedDid) {
		return { ok: false as const, diagnostics: [diag('did_web.document_invalid', `DID document id must be ${expectedDid}`)] };
	}
	if (keyId.startsWith('did:') && !keyId.startsWith(`${expectedDid}#`)) {
		return { ok: false as const, diagnostics: [diag('did_web.document_invalid', `DID key ${keyId} is not anchored to ${expectedDid}`)] };
	}
	const fragment = keyId.startsWith('#') ? keyId : keyId.includes('#') ? `#${keyId.split('#').pop()}` : keyId;
	const fullKeyId = fragment.startsWith('#') ? `${expectedDid}${fragment}` : null;
	const method = document.value.verificationMethod.find(
		(entry) => isRecord(entry) && (entry.id === keyId || entry.id === fragment || entry.id === fullKeyId),
	);
	if (!isRecord(method)) {
		return { ok: false as const, diagnostics: [diag('did_web.key_not_found', `DID document does not contain key id ${keyId}`)] };
	}
	if (typeof method.id !== 'string' || (!method.id.startsWith(`${expectedDid}#`) && !method.id.startsWith('#'))) {
		return { ok: false as const, diagnostics: [diag('did_web.document_invalid', `DID key ${keyId} is not anchored to ${expectedDid}`)] };
	}
	if (method.controller !== expectedDid) {
		return { ok: false as const, diagnostics: [diag('did_web.document_invalid', `DID key ${keyId} controller must be ${expectedDid}`)] };
	}
	const methodId = method.id.startsWith('#') ? `${expectedDid}${method.id}` : method.id;
	try {
		if (isRecord(method.publicKeyJwk)) {
			const key = createPublicKey({ key: method.publicKeyJwk, format: 'jwk' } as Parameters<typeof createPublicKey>[0]);
			return {
				ok: true as const,
				key,
				methodId,
				keyFingerprint: publicKeyFingerprint(key),
			};
		}
		if (typeof method.publicKeyPem === 'string') {
			const key = createPublicKey(method.publicKeyPem);
			return { ok: true as const, key, methodId, keyFingerprint: publicKeyFingerprint(key) };
		}
		return { ok: false as const, diagnostics: [diag('did_web.key_not_found', `DID key ${keyId} has no supported public key material`)] };
	} catch (error) {
		return { ok: false as const, diagnostics: [diag('did_web.key_invalid', error instanceof Error ? error.message : String(error))] };
	}
}

export function runVerify(args: string[]) {
	const parsed = parseOptions(args);
	const err = unknownOptions(parsed, ['--target', '--sidecar', '--policy', '--did-document', '--offline-sigstore-fixture', '--offline']);
	if (err) return usage('verify', err);
	if (parsed.flags.has('--offline')) return usage('verify', 'verify --offline is not a stable MVP option');
	if (parsed.positional.length !== 1) return usage('verify', 'Expected one file: mda verify <file> --policy <path>');
	const policyPath = oneOption(parsed.options, '--policy');
	if (!policyPath) return usage('verify', '--policy <path> is required');

	const file = parsed.positional[0];
	const requestedTarget = parseTarget(oneOption(parsed.options, '--target') ?? 'auto');
	if (!requestedTarget) return usage('verify', '--target must be source, SKILL.md, AGENTS.md, MCP-SERVER.md, or auto');
	const targetResult = resolveTarget(file, requestedTarget);
	if (!targetResult.ok) return targetResult.result('verify', file);

	const policy = readJson(policyPath);
	if (!policy.ok) return ioError('verify', policy.message, { file, policy: policyPath });
	const policyValidation = validateJsonAgainst(policy.value, 'trustPolicy');
	if (!policyValidation.ok)
		return commandResult(false, 'verify', EXIT.failure, trustPolicyDiagnostics(policy.value, policyValidation.diagnostics), {
			file,
			policy: policyPath,
		});

	const validation = validateArtifact(file, targetResult.target);
	if (!validation.ok)
		return commandResult(false, 'verify', EXIT.failure, validation.diagnostics, { file, target: targetResult.target, policy: policyPath });

	const integrityArgs = ['verify', file, '--target', targetResult.target];
	const sidecar = oneOption(parsed.options, '--sidecar');
	if (sidecar) integrityArgs.push('--sidecar', sidecar);
	const integrity = runIntegrity(integrityArgs);
	if (!integrity.ok)
		return commandResult(false, 'verify', EXIT.failure, integrity.diagnostics, { file, target: targetResult.target, policy: policyPath });

	const signedArtifact = readArtifact(file);
	if (!signedArtifact.ok || signedArtifact.extract.kind !== 'ok' || !isRecord(signedArtifact.extract.frontmatter)) {
		return commandResult(false, 'verify', EXIT.failure, [diag('missing-required-frontmatter', 'Verification requires frontmatter')], {
			file,
			target: targetResult.target,
			policy: policyPath,
		});
	}
	if (!Array.isArray(signedArtifact.extract.frontmatter.signatures) || signedArtifact.extract.frontmatter.signatures.length === 0) {
		return commandResult(false, 'verify', EXIT.failure, [diag('missing-required-signature', 'Verification requires signatures[]')], {
			file,
			target: targetResult.target,
			policy: policyPath,
		});
	}
	const integrityField = signedArtifact.extract.frontmatter.integrity;
	if (!isRecord(integrityField) || typeof integrityField.algorithm !== 'string' || typeof integrityField.digest !== 'string') {
		return commandResult(false, 'verify', EXIT.failure, [diag('missing-required-integrity', 'Verification requires integrity')], {
			file,
			target: targetResult.target,
			policy: policyPath,
		});
	}
	const didDocumentPath = oneOption(parsed.options, '--did-document');
	const sigstoreFixturePath = oneOption(parsed.options, '--offline-sigstore-fixture');
	const signatureVerification = verifySignatureEntries(
		signedArtifact.extract.frontmatter.signatures,
		{ algorithm: integrityField.algorithm, digest: integrityField.digest },
		policy.value,
		didDocumentPath,
		sigstoreFixturePath,
	);
	if (signatureVerification.malformed) {
		return commandResult(false, 'verify', EXIT.failure, [diag('signature.invalid_entry', 'Signature entry is malformed')], {
			file,
			target: targetResult.target,
			policy: policyPath,
		});
	}
	const { trusted, trustedSignerIdentities, rejectedTrusted } = signatureVerification;
	if (trusted.size === 0) {
		const hasSigstoreRejection = rejectedTrusted.some((d) => d.code.startsWith('sigstore.') || d.code.startsWith('rekor.'));
		return commandResult(
			false,
			'verify',
			EXIT.failure,
			rejectedTrusted.length > 0 ? rejectedTrusted : [diag('no-trusted-signature', 'no signature matched the trust policy')],
			{
				summary: rejectedTrusted.length > 0 ? 'No trusted signature could be verified' : 'No trusted signature matched the policy',
				nextActions:
					rejectedTrusted.length > 0
						? hasSigstoreRejection
							? [
									nextAction(
										'provide-sigstore-fixture',
										'Provide the explicit Sigstore/Rekor fixture matching this release identity',
										`mda verify ${file} --policy ${policyPath} --offline-sigstore-fixture <sigstore-fixture.json>`,
									),
								]
							: [
									nextAction(
										'fix-did-document',
										'Provide the DID document containing the signature key',
										`mda verify ${file} --policy ${policyPath} --did-document <did-document.json>`,
									),
								]
						: [
								nextAction(
									'sign-with-trusted-identity',
									'Sign the artifact with a did:web identity allowed by the policy',
									`mda sign ${file} --profile did-web --did did:web:<domain> --key-id did:web:<domain>#<key> --key-file <private-key> --out signed.mda`,
								),
							],
				file,
				target: targetResult.target,
				policy: policyPath,
				rejectedSignatures: rejectedTrusted.length,
			},
		);
	}
	const minSignatures = trustPolicyMinSignatures(policy.value);
	if (trusted.size < minSignatures) {
		return commandResult(
			false,
			'verify',
			EXIT.failure,
			[diag('insufficient-trusted-signatures', `${trusted.size} trusted signer identities < ${minSignatures}`)],
			{
				summary: 'Trusted signature threshold was not met',
				nextActions: [
					nextAction(
						'add-signatures',
						'Add enough trusted signatures to satisfy minSignatures',
						`mda sign ${file} --profile did-web --did did:web:<domain> --key-id did:web:<domain>#<key> --key-file <private-key> --out signed.mda`,
					),
				],
				file,
				target: targetResult.target,
				policy: policyPath,
				trustedSignatures: trusted.size,
				rejectedSignatures: rejectedTrusted.length,
				minSignatures,
				trustedSignerIdentities,
			},
		);
	}
	return commandResult(true, 'verify', EXIT.ok, [], {
		summary: 'Signature verification passed',
		artifacts: [artifact('verified-signature', file, targetResult.target, String(integrityField.digest))],
		nextActions: [
			externalNextAction(
				'publish-artifact',
				'Use this verified artifact in the release flow',
				'continue to release-plan or trust-manifest generation',
				false,
			),
		],
		message: `verified ${trusted.size} trusted signature(s)`,
		file,
		target: targetResult.target,
		policy: policyPath,
		trustedSignatures: trusted.size,
		rejectedSignatures: rejectedTrusted.length,
		minSignatures,
		trustedSignerIdentities,
		payloadDigest: integrityField.digest,
	});
}

export function runSign(args: string[]) {
	const parsed = parseOptions(args);
	const err = unknownOptions(parsed, [
		'--target',
		'--sidecar',
		'--profile',
		'--did',
		'--key-id',
		'--key-file',
		'--method',
		'--key',
		'--identity',
		'--repo',
		'--workflow',
		'--ref',
		'--offline-sigstore-fixture',
		'--out',
		'--in-place',
		'--rekor',
	]);
	if (err) return usage('sign', err);
	if (parsed.positional.length !== 1)
		return usage(
			'sign',
			'Expected one file: mda sign <file> --profile did-web --did <did> --key-id <key-id> --key-file <path> (--out <file>|--in-place)',
		);
	const file = parsed.positional[0];
	const profile = oneOption(parsed.options, '--profile');
	const method = oneOption(parsed.options, '--method');
	if (profile === 'github-actions') return runGithubActionsSign(parsed);
	if (profile && profile !== 'did-web') return usage('sign', `Unsupported signing profile: ${profile}`);
	if (method && method !== 'did-web') return usage('sign', '--method did-web is the only compatibility alias');
	if (!profile && !method) return usage('sign', '--profile did-web is required');
	if (
		parsed.options.has('--repo') ||
		parsed.options.has('--workflow') ||
		parsed.options.has('--ref') ||
		parsed.options.has('--offline-sigstore-fixture') ||
		parsed.flags.has('--rekor')
	) {
		return usage('sign', 'GitHub Actions signing options require --profile github-actions');
	}
	const identity = oneOption(parsed.options, '--identity');
	const did = oneOption(parsed.options, '--did') ?? (identity ? `did:web:${identity}` : null);
	if (!did) return usage('sign', '--did <did> is required');
	const domain = didWebDomainFromDid(did);
	if (!domain) return usage('sign', '--did must be a did:web DID with a valid domain');
	const keyId = oneOption(parsed.options, '--key-id') ?? `${did}#default`;
	const keyFile = oneOption(parsed.options, '--key-file') ?? oneOption(parsed.options, '--key');
	if (!keyFile)
		return commandResult(false, 'sign', EXIT.usage, [diag('did_web.key_input_missing', '--key-file <path> is required')], {
			summary: 'sign usage error',
			nextActions: [
				nextAction(
					'provide-did-web-key',
					'Provide the explicit did:web private key file',
					`mda sign ${file} --profile did-web --did ${did} --key-id ${keyId} --key-file <private-key> --out signed.mda`,
				),
			],
			file,
			written: false,
		});
	const out = oneOption(parsed.options, '--out');
	const inPlace = parsed.flags.has('--in-place');
	if ((out && inPlace) || (!out && !inPlace)) return usage('sign', 'Choose exactly one output mode: --out <file> or --in-place');
	if (out && existsSync(out)) return ioError('sign', `Refusing to overwrite existing file: ${out}`, { file, out, written: false });

	const requestedTarget = parseTarget(oneOption(parsed.options, '--target') ?? 'auto');
	if (!requestedTarget) return usage('sign', '--target must be source, SKILL.md, AGENTS.md, MCP-SERVER.md, or auto');
	const targetResult = resolveTarget(file, requestedTarget);
	if (!targetResult.ok) return targetResult.result('sign', file);
	const sidecar = oneOption(parsed.options, '--sidecar');
	const integrityArgs = ['verify', file, '--target', targetResult.target];
	if (sidecar) integrityArgs.push('--sidecar', sidecar);
	const integrityResult = runIntegrity(integrityArgs);
	if (!integrityResult.ok) {
		return commandResult(false, 'sign', EXIT.failure, integrityResult.diagnostics, {
			summary: 'Signing requires valid recorded integrity',
			nextActions: [
				nextAction(
					'write-integrity',
					'Record integrity before signing',
					`mda integrity compute ${file} --target ${targetResult.target} --write`,
				),
			],
			file,
			target: targetResult.target,
			written: false,
		});
	}

	const input = readArtifact(file);
	if (!input.ok || input.extract.kind !== 'ok' || !isRecord(input.extract.frontmatter)) {
		return commandResult(false, 'sign', EXIT.failure, [diag('missing-required-frontmatter', 'Signing requires frontmatter')], {
			file,
			target: targetResult.target,
			written: false,
		});
	}
	const integrity = input.extract.frontmatter.integrity;
	if (!isRecord(integrity) || typeof integrity.digest !== 'string') {
		return commandResult(false, 'sign', EXIT.failure, [diag('missing-required-integrity', 'Signing requires integrity')], {
			file,
			target: targetResult.target,
			written: false,
		});
	}
	if (input.extract.frontmatter.signatures !== undefined && !Array.isArray(input.extract.frontmatter.signatures)) {
		return commandResult(false, 'sign', EXIT.failure, [diag('signature.invalid_entry', 'Existing signatures must be an array')], {
			file,
			target: targetResult.target,
			written: false,
		});
	}

	let privateKey: KeyObject;
	try {
		privateKey = createPrivateKey(readFileSync(keyFile));
	} catch (error) {
		return ioError('sign', error instanceof Error ? error.message : String(error), { file, keyFile, written: false });
	}
	const algorithm = keyAlgorithm(privateKey);
	if (!algorithm) {
		return commandResult(
			false,
			'sign',
			EXIT.failure,
			[diag('signature.unsupported_algorithm', 'Only Ed25519 did:web keys are supported in this release')],
			{ file, keyFile, written: false },
		);
	}

	const payload = integrityPayloadBytes(integrity);
	const signatureBytes = cryptoSign(null, dssePae(INTEGRITY_PAYLOAD_TYPE, payload), privateKey);
	const signature: SignatureEntry = {
		signer: `did-web:${domain}`,
		'key-id': keyId,
		'payload-digest': integrity.digest,
		algorithm,
		signature: signatureBytes.toString('base64'),
		'payload-type': INTEGRITY_PAYLOAD_TYPE,
	};
	const frontmatter = {
		...input.extract.frontmatter,
		signatures: [...(Array.isArray(input.extract.frontmatter.signatures) ? input.extract.frontmatter.signatures : []), signature],
	};
	const destination = inPlace ? file : out!;
	try {
		if (inPlace) atomicReplace(file, renderArtifact(frontmatter, input.extract.body));
		else atomicWrite(destination, renderArtifact(frontmatter, input.extract.body));
	} catch (error) {
		return ioError('sign', error instanceof Error ? error.message : String(error), { file, out: destination, written: false });
	}
	return commandResult(true, 'sign', EXIT.ok, [], {
		summary: 'did:web signature written',
		artifacts: [artifact('signed-artifact', destination, targetResult.target, String(integrity.digest))],
		nextActions: [
			nextAction(
				'verify-signature',
				'Verify the signed artifact with a trust policy',
				`mda verify ${destination} --policy <policy.json> --did-document <did-document.json>`,
			),
		],
		message: `signed ${destination}`,
		file,
		target: targetResult.target,
		profile: 'did-web',
		signer: `did-web:${domain}`,
		keyId,
		payloadDigest: integrity.digest,
		out: destination,
		written: true,
	});
}

function runGithubActionsSign(parsed: ReturnType<typeof parseOptions>) {
	if (
		parsed.options.has('--method') ||
		parsed.options.has('--did') ||
		parsed.options.has('--key-id') ||
		parsed.options.has('--key-file') ||
		parsed.options.has('--key') ||
		parsed.options.has('--identity')
	) {
		return usage('sign', 'did:web signing options cannot be combined with --profile github-actions');
	}
	const file = parsed.positional[0];
	const repo = oneOption(parsed.options, '--repo');
	const workflow = oneOption(parsed.options, '--workflow');
	const ref = oneOption(parsed.options, '--ref');
	const fixturePath = oneOption(parsed.options, '--offline-sigstore-fixture');
	if (!repo || !GITHUB_REPOSITORY.test(repo)) return usage('sign', '--repo must be a GitHub repository in owner/repo form');
	if (!workflow || workflow.trim() !== workflow || workflow.length === 0)
		return usage('sign', '--workflow must be a non-empty workflow file or identity');
	if (!ref || !GITHUB_REF.test(ref)) return usage('sign', '--ref must be an exact Git ref such as refs/heads/main or refs/tags/v1.1.0');
	if (!parsed.flags.has('--rekor')) return usage('sign', '--rekor is required for --profile github-actions');
	if (!fixturePath) return usage('sign', '--offline-sigstore-fixture <path> is required for --profile github-actions');
	const out = oneOption(parsed.options, '--out');
	const inPlace = parsed.flags.has('--in-place');
	if ((out && inPlace) || (!out && !inPlace)) return usage('sign', 'Choose exactly one output mode: --out <file> or --in-place');
	if (out && existsSync(out)) return ioError('sign', `Refusing to overwrite existing file: ${out}`, { file, out, written: false });

	const requestedTarget = parseTarget(oneOption(parsed.options, '--target') ?? 'auto');
	if (!requestedTarget) return usage('sign', '--target must be source, SKILL.md, AGENTS.md, MCP-SERVER.md, or auto');
	const targetResult = resolveTarget(file, requestedTarget);
	if (!targetResult.ok) return targetResult.result('sign', file);
	const sidecar = oneOption(parsed.options, '--sidecar');
	const integrityArgs = ['verify', file, '--target', targetResult.target];
	if (sidecar) integrityArgs.push('--sidecar', sidecar);
	const integrityResult = runIntegrity(integrityArgs);
	if (!integrityResult.ok) {
		return commandResult(false, 'sign', EXIT.failure, integrityResult.diagnostics, {
			summary: 'Signing requires valid recorded integrity',
			nextActions: [
				nextAction(
					'write-integrity',
					'Record integrity before signing',
					`mda integrity compute ${file} --target ${targetResult.target} --write`,
				),
			],
			file,
			target: targetResult.target,
			written: false,
		});
	}

	const input = readArtifact(file);
	if (!input.ok || input.extract.kind !== 'ok' || !isRecord(input.extract.frontmatter)) {
		return commandResult(false, 'sign', EXIT.failure, [diag('missing-required-frontmatter', 'Signing requires frontmatter')], {
			file,
			target: targetResult.target,
			written: false,
		});
	}
	const integrity = input.extract.frontmatter.integrity;
	if (!isRecord(integrity) || typeof integrity.digest !== 'string') {
		return commandResult(false, 'sign', EXIT.failure, [diag('missing-required-integrity', 'Signing requires integrity')], {
			file,
			target: targetResult.target,
			written: false,
		});
	}
	if (input.extract.frontmatter.signatures !== undefined && !Array.isArray(input.extract.frontmatter.signatures)) {
		return commandResult(false, 'sign', EXIT.failure, [diag('signature.invalid_entry', 'Existing signatures must be an array')], {
			file,
			target: targetResult.target,
			written: false,
		});
	}

	const fixtureResult = readSigstoreFixture(fixturePath, true);
	if (!fixtureResult.ok) {
		return commandResult(false, 'sign', EXIT.failure, fixtureResult.diagnostics, {
			summary: 'Sigstore fixture is invalid',
			file,
			target: targetResult.target,
			fixture: fixturePath,
			written: false,
		});
	}
	const fixture = fixtureResult.fixture;
	const expectedSubject = `repo:${repo}:ref:${ref}`;
	if (
		fixture.issuer !== GITHUB_ACTIONS_ISSUER ||
		fixture.subject !== expectedSubject ||
		fixture.repository !== repo ||
		fixture.workflow !== workflow ||
		fixture.ref !== ref
	) {
		return commandResult(
			false,
			'sign',
			EXIT.failure,
			[diag('sigstore.identity_mismatch', 'Sigstore fixture identity does not match the requested GitHub Actions release identity')],
			{ file, target: targetResult.target, fixture: fixturePath, written: false },
		);
	}
	if (fixture.expectedPayloadDigest !== integrity.digest || fixture.rekor.payloadDigest !== integrity.digest) {
		return commandResult(
			false,
			'sign',
			EXIT.failure,
			[diag('sigstore.fixture_digest_mismatch', 'Sigstore fixture digest does not match artifact integrity digest')],
			{ file, target: targetResult.target, fixture: fixturePath, written: false },
		);
	}

	let privateKey: KeyObject;
	let publicKey: KeyObject;
	try {
		privateKey = createPrivateKey(fixture.privateKeyPem!);
		publicKey = createPublicKey(fixture.publicKeyPem);
	} catch (error) {
		return commandResult(
			false,
			'sign',
			EXIT.failure,
			[diag('sigstore.fixture_invalid', error instanceof Error ? error.message : String(error))],
			{
				file,
				target: targetResult.target,
				fixture: fixturePath,
				written: false,
			},
		);
	}
	if (keyAlgorithm(privateKey) !== fixture.algorithm || keyAlgorithm(publicKey) !== fixture.algorithm) {
		return commandResult(
			false,
			'sign',
			EXIT.failure,
			[diag('signature.unsupported_algorithm', 'Only Ed25519 GitHub Actions fixture keys are supported in this release')],
			{ file, target: targetResult.target, fixture: fixturePath, written: false },
		);
	}

	const payload = integrityPayloadBytes(integrity);
	const signatureBytes = cryptoSign(null, dssePae(INTEGRITY_PAYLOAD_TYPE, payload), privateKey);
	if (!cryptoVerify(null, dssePae(INTEGRITY_PAYLOAD_TYPE, payload), publicKey, signatureBytes)) {
		return commandResult(
			false,
			'sign',
			EXIT.failure,
			[diag('sigstore.fixture_invalid', 'Sigstore fixture public key does not match private key')],
			{
				file,
				target: targetResult.target,
				fixture: fixturePath,
				written: false,
			},
		);
	}
	const signature: SignatureEntry = {
		signer: `sigstore-oidc:${fixture.issuer}`,
		'key-id': fixture.keyId,
		'payload-digest': integrity.digest,
		algorithm: fixture.algorithm,
		signature: signatureBytes.toString('base64'),
		'payload-type': INTEGRITY_PAYLOAD_TYPE,
		'rekor-log-id': fixture.rekor.logId,
		'rekor-log-index': fixture.rekor.logIndex,
	};
	const frontmatter = {
		...input.extract.frontmatter,
		signatures: [...(Array.isArray(input.extract.frontmatter.signatures) ? input.extract.frontmatter.signatures : []), signature],
	};
	const destination = inPlace ? file : out!;
	try {
		if (inPlace) atomicReplace(file, renderArtifact(frontmatter, input.extract.body));
		else atomicWrite(destination, renderArtifact(frontmatter, input.extract.body));
	} catch (error) {
		return ioError('sign', error instanceof Error ? error.message : String(error), { file, out: destination, written: false });
	}
	return commandResult(true, 'sign', EXIT.ok, [], {
		summary: 'GitHub Actions Sigstore/Rekor signature written',
		artifacts: [artifact('signed-artifact', destination, targetResult.target, String(integrity.digest))],
		nextActions: [
			nextAction(
				'verify-github-actions-signature',
				'Verify the signed release artifact with the pinned trust policy and fixture',
				`mda verify ${destination} --policy <policy.json> --offline-sigstore-fixture ${fixturePath}`,
			),
		],
		message: `signed ${destination}`,
		file,
		target: targetResult.target,
		profile: 'github-actions',
		signer: `sigstore-oidc:${fixture.issuer}`,
		keyId: fixture.keyId,
		payloadDigest: integrity.digest,
		rekorLogId: fixture.rekor.logId,
		rekorLogIndex: fixture.rekor.logIndex,
		out: destination,
		written: true,
	});
}
