import { EXIT, commandResult, usage } from '../types.js';
import { findAsset, runConformanceSuite } from '../mda.js';
import { nextAction, oneOption, parseOptions, unknownOptions } from './shared.js';

export function runConformance(args: string[]) {
	const parsed = parseOptions(args);
	const err = unknownOptions(parsed, ['--suite', '--level']);
	if (err) return usage('conformance', err);
	if (parsed.positional.length !== 0) return usage('conformance', 'conformance takes no positional arguments');
	const suite = oneOption(parsed.options, '--suite') ?? findAsset('conformance');
	const level = oneOption(parsed.options, '--level') ?? 'V';
	if (level !== 'V' && level !== 'C') return usage('conformance', '--level must be V or C');

	const report = runConformanceSuite(suite, level);
	return commandResult(report.ok, 'conformance', report.ok ? EXIT.ok : EXIT.failure, report.diagnostics, {
		summary: report.ok ? `Conformance Level ${level} passed` : `Conformance Level ${level} failed`,
		nextActions:
			report.ok && level === 'V'
				? [
						nextAction(
							'run-level-c',
							'Run compile conformance before release evidence',
							`mda conformance --suite ${suite} --level C`,
							false,
						),
					]
				: report.ok
					? []
					: [
							nextAction(
								'fix-conformance',
								'Fix failing fixtures and re-run conformance',
								`mda conformance --suite ${suite} --level ${level}`,
							),
						],
		suite,
		level,
		passCount: report.passCount,
		failCount: report.failCount,
		fixtures: report.fixtures,
	});
}
