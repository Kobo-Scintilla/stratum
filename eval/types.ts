// Type definitions for the evaluation task suite.
//
// A Task is a self-contained evaluation unit: a prompt, a ground-truth check,
// and optional setup/teardown hooks for seeding fixtures.
//
// Tasks are designed to be runnable in two modes:
//   - with-tools: the model has access to execute/search/index/compress
//   - no-tools:   the model can only emit text (it has to do work in its head)
//
// The runner is intentionally minimal — the with-tools runner delegates to
// the live Flue agent, the no-tools runner wraps a plain LLM call. Task
// definitions stay mode-agnostic so the same task can be scored identically
// in both modes.

export type Difficulty = 'small' | 'medium' | 'large' | 'multi-step' | 'search-heavy';

export type Category =
	| 'lookup'
	| 'aggregate'
	| 'log-analysis'
	| 'refactor'
	| 'recall'
	| 'transform';

export type GroundTruth =
	| {
			kind: 'exact';
			/** The string the model's final answer must equal (after optional normalization). */
			value: string;
			/** Optional normalization applied to both the answer and the expected value before comparison. */
			normalize?: 'lower' | 'trim' | 'lower-trim';
	  }
	| {
			kind: 'contains';
			/** Strings that must appear in the model's final answer (case-sensitive substring match). */
			values: string[];
			/** Minimum number of `values` that must be present for the task to pass. */
			minMatches: number;
			/** Strings that must NOT appear in the final answer. Useful to penalize distractors. */
			mustNotContain?: string[];
	  }
	| {
			kind: 'regex';
			/** A JavaScript RegExp pattern the final answer must match. */
			pattern: string;
			/** Optional RegExp flags. Default: 'i' (case-insensitive). */
			flags?: string;
	  }
	| {
			kind: 'fileMatches';
			/** Path to the file whose content is checked. */
			path: string;
			/** Predicate evaluated against the file's full content. Return true to pass. */
			predicate: (content: string) => boolean;
	  };

export interface Task {
	/** Stable identifier, e.g. 'lookup-lines-pkg'. */
	id: string;
	/** Coarse difficulty tag used for reporting. */
	difficulty: Difficulty;
	/** Sub-category, used for filtering. */
	category: Category;
	/** The natural-language prompt the model receives verbatim. */
	prompt: string;
	/** Optional path to a fixture file the model must read/inspect. */
	seedFile?: string;
	/** One-line description of the expected behavior — used for human-readable reports. */
	expectedBehavior: string;
	/** Ground truth used to score the model's final answer. */
	groundTruth: GroundTruth;
	/** Optional setup hook — runs once before the task, e.g. to seed a fixture. */
	setup?: () => Promise<void>;
	/** Optional teardown hook — runs once after the task, e.g. to clean up /tmp files. */
	teardown?: () => Promise<void>;
}

/**
 * Result of running a single task. `pass` is the binary outcome; the other
 * fields provide the evidence to support reporting and debugging.
 */
export interface TaskResult {
	taskId: string;
	mode: 'with-tools' | 'no-tools';
	pass: boolean;
	answer: string;
	durationMs: number;
	detail?: string;
}
