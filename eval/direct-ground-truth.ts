// Ground-truth comparison for the direct (OpenAI-SDK) eval runner.
//
// `groundTruth` is a normalized value: number, string, or tagged shape
// (number/contains/any). The model often wraps a number in prose, so we
// extract the first numeric token when the expected value is numeric.

export type CheckResult = { pass: boolean; reason: string };

export type GroundTruth =
	| number
	| string
	| { kind: 'number'; expected: number; tolerance?: number }
	| { kind: 'any'; values: string[] }
	| { kind: 'contains'; substr: string; caseInsensitive?: boolean };

function extractFirstInt(s: string): number | null {
	// Prefer a "stand-alone" integer (not part of a longer digit run).
	const m = s.match(/(?<![.\d])(\d+)(?![.\d])/);
	return m ? Number(m[1]) : null;
}

function checkNumber(answer: string, expected: number, tolerance = 0): CheckResult {
	const got = extractFirstInt(answer);
	if (got === null) {
		return { pass: false, reason: `no integer found in answer (expected ${expected})` };
	}
	if (Math.abs(got - expected) > tolerance) {
		return { pass: false, reason: `got ${got}, expected ${expected}` };
	}
	return { pass: true, reason: `answer contains ${got}` };
}

function checkString(answer: string, expected: string): CheckResult {
	const a = answer.trim();
	if (a === expected) return { pass: true, reason: 'exact match' };
	if (a.toLowerCase() === expected.toLowerCase()) return { pass: true, reason: 'case-insensitive match' };
	if (a.toLowerCase().includes(expected.toLowerCase())) {
		return { pass: true, reason: `answer contains "${expected}"` };
	}
	return { pass: false, reason: `expected substring "${expected}", got "${a.slice(0, 120)}"` };
}

export function checkAnswer(answer: string, groundTruth: GroundTruth): CheckResult {
	const a = answer ?? '';
	if (typeof groundTruth === 'number') return checkNumber(a, groundTruth);
	if (typeof groundTruth === 'string') return checkString(a, groundTruth);
	switch (groundTruth.kind) {
		case 'number':
			return checkNumber(a, groundTruth.expected, groundTruth.tolerance ?? 0);
		case 'contains':
			return checkString(a, groundTruth.substr);
		case 'any': {
			for (const v of groundTruth.values) {
				const r = checkString(a, v);
				if (r.pass) return { pass: true, reason: `matched "${v}"` };
			}
			return {
				pass: false,
				reason: `expected one of [${groundTruth.values.join(', ')}], got "${a.slice(0, 120)}"`
			};
		}
	}
}
