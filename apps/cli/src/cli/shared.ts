import { type Artifact, type CommandResult, type Globals, type NextAction, type Target } from '../types.js';

export function writeResult(result: CommandResult, globals: Globals) {
	if (globals.json) {
		process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
		return;
	}
	if (result.suppressOutput) return;
	if (globals.quiet) return;

	if (result.ok) {
		if (typeof result.message === 'string') process.stdout.write(`${result.message}\n`);
		else process.stdout.write(`ok: ${result.command}\n`);
		writeNextActions(result, globals);
		return;
	}

	for (const d of result.diagnostics) {
		process.stderr.write(`${d.code}: ${d.message}\n`);
	}
	writeNextActions(result, globals, process.stderr);
}

export function splitGlobals(argv: string[]) {
	const globals: Globals = { json: false, quiet: false, verbose: false, color: true, noNext: false };
	const args: string[] = [];
	for (const arg of argv) {
		if (arg === '--json') globals.json = true;
		else if (arg === '--quiet') globals.quiet = true;
		else if (arg === '--verbose') globals.verbose = true;
		else if (arg === '--no-color') globals.color = false;
		else if (arg === '--no-next') globals.noNext = true;
		else args.push(arg);
	}
	return { globals, args };
}

function writeNextActions(result: CommandResult, globals: Globals, stream: NodeJS.WriteStream = process.stdout) {
	if (globals.noNext || result.nextActions.length === 0) return;
	stream.write('Next:\n');
	for (const action of result.nextActions) {
		const marker = action.required ? '-' : '- optional:';
		if (action.command) stream.write(`${marker} ${action.reason}: ${action.command}\n`);
		else if (action.external) stream.write(`${marker} ${action.reason}: ${action.external}\n`);
		else stream.write(`${marker} ${action.reason}\n`);
	}
}

export function nextAction(id: string, reason: string, command: string, required = true): NextAction {
	return { id, required, reason, command };
}

export function externalNextAction(id: string, reason: string, external: string, required = true): NextAction {
	return { id, required, reason, external };
}

export function artifact(kind: string, path?: string, target?: Target | 'source', digest?: string): Artifact {
	return { kind, path, target, digest };
}

export function nextAfterValidate(file: string, target: Target): NextAction[] {
	if (target === 'source') {
		return [
			nextAction(
				'compile-source',
				'Compile the source into runtime Markdown',
				`mda compile ${file} --target SKILL.md AGENTS.md --out-dir out --integrity`,
			),
		];
	}
	return [nextAction('verify-integrity', 'Verify declared integrity before use', `mda integrity verify ${file} --target ${target}`, false)];
}

export function nextAfterCompile(paths: string[]): NextAction[] {
	const markdown = paths.find((path) => path.endsWith('SKILL.md') || path.endsWith('AGENTS.md') || path.endsWith('MCP-SERVER.md'));
	if (!markdown) return [];
	const target = targetForPath(markdown);
	if (!target) return [];
	return [
		nextAction('validate-output', 'Validate the first compiled output', `mda validate ${markdown} --target ${target}`),
		nextAction(
			'verify-output-integrity',
			'Verify compiled output integrity before publishing',
			`mda integrity verify ${markdown} --target ${target}`,
			false,
		),
	];
}

export function targetForPath(path: string): Target | undefined {
	if (path.endsWith('SKILL.md')) return 'SKILL.md';
	if (path.endsWith('AGENTS.md')) return 'AGENTS.md';
	if (path.endsWith('MCP-SERVER.md')) return 'MCP-SERVER.md';
	return undefined;
}

export function parseOptions(args: string[]) {
	const positional: string[] = [];
	const options = new Map<string, string[]>();
	const flags = new Set<string>();

	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i];
		if (!arg.startsWith('--')) {
			positional.push(arg);
			continue;
		}
		if (
			[
				'--out',
				'--target',
				'--out-dir',
				'--sidecar',
				'--algorithm',
				'--suite',
				'--level',
				'--policy',
				'--did-document',
				'--profile',
				'--did',
				'--key-id',
				'--key-file',
				'--method',
				'--key',
				'--identity',
				'--template',
				'--module',
				'--preset',
				'--provider',
				'--model',
				'--domain',
				'--min-signatures',
				'--repo',
				'--workflow',
				'--ref',
				'--offline-sigstore-fixture',
				'--source',
				'--registry-dir',
				'--registry-root',
				'--release-plan',
				'--manifest',
				'--format',
				'--snippet-format',
				'--snippet-out',
				'--expected-root-digest',
				'--minimum-revision',
				'--minimum-published-at',
				'--high-watermark',
			].includes(arg)
		) {
			const values: string[] = [];
			i += 1;
			while (i < args.length && !args[i].startsWith('--')) {
				values.push(...args[i].split(',').filter(Boolean));
				i += 1;
				if (arg !== '--target') break;
			}
			i -= 1;
			if (values.length === 0) return { error: `Missing value for ${arg}`, positional, options, flags };
			options.set(arg, [...(options.get(arg) ?? []), ...values]);
			continue;
		}
		if (['--integrity', '--in-place', '--offline', '--write', '--rekor', '--derive-root-digest', '--strict-compat'].includes(arg)) {
			flags.add(arg);
			continue;
		}
		return { error: `Unsupported flag: ${arg}`, positional, options, flags };
	}

	return { positional, options, flags };
}

export function oneOption(options: Map<string, string[]>, name: string) {
	const values = options.get(name);
	return values?.[0] ?? null;
}

export function unknownOptions(parsed: ReturnType<typeof parseOptions>, allowed: string[]) {
	if ('error' in parsed && parsed.error) return parsed.error;
	const allowedSet = new Set(allowed);
	for (const key of parsed.options.keys()) {
		if (!allowedSet.has(key)) return `Unsupported flag: ${key}`;
	}
	for (const key of parsed.flags.keys()) {
		if (!allowedSet.has(key)) return `Unsupported flag: ${key}`;
	}
	return null;
}
