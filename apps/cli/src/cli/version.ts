import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

let cachedVersion: string | null = null;

export function getCliVersion(): string {
	if (cachedVersion) return cachedVersion;
	const packageJsonPath = resolve(dirname(fileURLToPath(import.meta.url)), '../package.json');
	const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: unknown };
	if (typeof packageJson.version !== 'string' || packageJson.version.trim() === '') {
		throw new Error(`Invalid CLI package version in ${packageJsonPath}`);
	}
	cachedVersion = packageJson.version;
	return cachedVersion;
}
