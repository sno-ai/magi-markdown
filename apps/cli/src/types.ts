export type Severity = "error" | "warning";
export type Target = "source" | "SKILL.md" | "AGENTS.md" | "MCP-SERVER.md";
export type MaybeTarget = Target | "auto";
export type ExitCode = 0 | 1 | 2 | 3 | 4;

export type Diagnostic = {
  code: string;
  message: string;
  severity: Severity;
  path?: string;
  rule?: string;
  schema?: string;
  instancePath?: string;
};

export type Globals = {
  json: boolean;
  quiet: boolean;
  verbose: boolean;
  color: boolean;
  noNext: boolean;
};

export type Artifact = {
  path?: string;
  kind: string;
  target?: Target | "source";
  digest?: string;
};

export type NextAction = {
  id: string;
  required: boolean;
  reason: string;
  command?: string;
  external?: string;
};

export type ExtractResult =
  | { kind: "ok"; frontmatter: unknown; body: string; normalizedText: string }
  | { kind: "no-frontmatter"; body: string; normalizedText: string }
  | { kind: "error"; code: string; message: string };

export type CommandResult = Record<string, unknown> & {
  ok: boolean;
  command: string;
  exitCode: ExitCode;
  summary: string;
  artifacts: Artifact[];
  diagnostics: Diagnostic[];
  nextActions: NextAction[];
};

export const EXIT = {
  ok: 0 as const,
  failure: 1 as const,
  usage: 2 as const,
  io: 3 as const,
  internal: 4 as const
};

export const TARGETS: Target[] = ["source", "SKILL.md", "AGENTS.md", "MCP-SERVER.md"];
export const MDA_EXTENDED = [
  "doc-id",
  "title",
  "version",
  "requires",
  "depends-on",
  "author",
  "tags",
  "created-date",
  "updated-date",
  "relationships"
];
export const TARGET_ORDER: Target[] = ["SKILL.md", "AGENTS.md", "MCP-SERVER.md"];
export const MCP_BOUNDARY = "\n--MDA-FILE-BOUNDARY--\n";

export function commandResult(ok: boolean, command: string, exitCode: ExitCode, diagnostics: Diagnostic[], extra: Record<string, unknown> = {}): CommandResult {
  const stableDiagnostics = diagnostics.map(stabilizeDiagnosticCode);
  return {
    ok,
    command,
    exitCode,
    summary: ok ? `${command} completed` : `${command} failed`,
    artifacts: [],
    diagnostics: stableDiagnostics,
    nextActions: [],
    ...extra
  };
}

export function diag(code: string, message: string, extra: Partial<Diagnostic> = {}): Diagnostic {
  return { code, message, severity: "error", ...extra };
}

function stabilizeDiagnosticCode(diagnostic: Diagnostic): Diagnostic {
  return { ...diagnostic, code: stableDiagnosticCode(diagnostic.code) };
}

function stableDiagnosticCode(code: string): string {
  if (/^(input|schema|integrity|signature|trust_policy|sigstore|rekor|did_web|llmix|compat|filesystem|conformance)\./.test(code)) {
    return code;
  }
  const mapped = DIAGNOSTIC_CODE_MAP[code];
  if (mapped) return mapped;
  return `input.${code.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase() || "unknown"}`;
}

const DIAGNOSTIC_CODE_MAP: Record<string, string> = {
  "usage-error": "input.usage",
  "invalid-encoding": "input.invalid_encoding",
  "unterminated-frontmatter": "input.unterminated_frontmatter",
  "frontmatter-yaml-parse-error": "input.frontmatter_yaml_parse",
  "missing-required-frontmatter": "input.missing_required_frontmatter",
  "missing-required-body": "input.missing_required_body",
  "invalid-json": "input.invalid_json",
  "io-error": "filesystem.io",
  "rollback-error": "filesystem.rollback",
  "schema-validation-error": "schema.validation",
  "relationship-footnote-json-parse-error": "schema.relationship_footnote_json_parse",
  "missing-required-sidecar": "integrity.missing_required_sidecar",
  "missing-required-integrity": "integrity.missing_required",
  "unsupported-integrity-algorithm": "integrity.unsupported_algorithm",
  "integrity-mismatch": "integrity.mismatch",
  "missing-required-signature": "signature.missing_required",
  "signature-digest-mismatch": "signature.digest_mismatch",
  "signature-verification-unavailable": "signature.verification_unavailable",
  "signing-unavailable": "signature.signing_unavailable",
  "trust-policy-violation": "trust_policy.violation",
  "no-trusted-signature": "trust_policy.no_trusted_signature",
  "insufficient-trusted-signatures": "trust_policy.insufficient_trusted_signatures",
  "fixture-missing": "conformance.fixture_missing",
  "conformance-manifest-invalid": "conformance.manifest_invalid",
  "extraction-mismatch": "conformance.extraction_mismatch",
  "expected-error-mismatch": "conformance.expected_error_mismatch",
  "compile-fixture-unavailable": "conformance.compile_fixture_unavailable",
  "internal-error": "input.internal_error"
};

export function usage(command: string, message: string, extra: Record<string, unknown> = {}): CommandResult {
  return commandResult(false, command, EXIT.usage, [diag("usage-error", message)], {
    summary: `${command} usage error`,
    nextActions: [{
      id: "show-help",
      required: true,
      reason: "Review command usage",
      command: "mda --help"
    }],
    ...extra
  });
}

export function ioError(command: string, message: string, extra: Record<string, unknown> = {}): CommandResult {
  return commandResult(false, command, EXIT.io, [diag("io-error", message)], {
    summary: `${command} IO error`,
    nextActions: [{
      id: "fix-filesystem",
      required: true,
      reason: "Fix the filesystem path or permissions and retry",
      command: `mda ${command}`
    }],
    ...extra
  });
}
