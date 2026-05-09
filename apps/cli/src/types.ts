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
};

export type ExtractResult =
  | { kind: "ok"; frontmatter: unknown; body: string; normalizedText: string }
  | { kind: "no-frontmatter"; body: string; normalizedText: string }
  | { kind: "error"; code: string; message: string };

export type CommandResult = Record<string, unknown> & {
  ok: boolean;
  command: string;
  exitCode: ExitCode;
  diagnostics: Diagnostic[];
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
  return { ok, command, exitCode, diagnostics, ...extra };
}

export function diag(code: string, message: string, extra: Partial<Diagnostic> = {}): Diagnostic {
  return { code, message, severity: "error", ...extra };
}

export function usage(command: string, message: string, extra: Record<string, unknown> = {}): CommandResult {
  return commandResult(false, command, EXIT.usage, [diag("usage-error", message)], extra);
}

export function ioError(command: string, message: string, extra: Record<string, unknown> = {}): CommandResult {
  return commandResult(false, command, EXIT.io, [diag("io-error", message)], extra);
}
