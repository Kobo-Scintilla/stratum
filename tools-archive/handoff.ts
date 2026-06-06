// Handoff mechanism for context overflow recovery.
// When context reaches ~85% and compression can't keep up,
// builds a structured artifact and prepares for a new session.

export interface HandoffArtifact {
	objective: string;
	timestamp: string;
	constraints: string[];
	priorDecisions: Array<{ decision: string; rationale: string }>;
	currentState: {
		status: string;
		pendingTasks: string[];
		completedTasks: string[];
	};
	remainingSteps: string[];
	knowledgeRefs: string[];
}

export function buildHandoffArtifact(params: {
	objective: string;
	priorDecisions: string[];
	currentState: string;
	nextSteps: string[];
}): HandoffArtifact {
	return {
		objective: params.objective,
		timestamp: new Date().toISOString(),
		constraints: [],
		priorDecisions: params.priorDecisions.map((d) => ({
			decision: d,
			rationale: 'Captured at handoff'
		})),
		currentState: {
			status: params.currentState,
			pendingTasks: params.nextSteps,
			completedTasks: params.priorDecisions
		},
		remainingSteps: params.nextSteps,
		knowledgeRefs: []
	};
}

export function shouldHandoff(contextFillRatio: number, pendingCompaction: boolean): boolean {
	return contextFillRatio >= 0.85 || pendingCompaction;
}

export function formatHandoffForPrompt(artifact: HandoffArtifact): string {
	return [
		'## Session Handoff',
		'',
		`**Objective:** ${artifact.objective}`,
		`**Timestamp:** ${artifact.timestamp}`,
		'',
		'### Current State',
		artifact.currentState.status,
		'',
		'### Prior Decisions',
		...artifact.priorDecisions.map((d) => `- **${d.decision}** — ${d.rationale}`),
		'',
		'### Remaining Steps',
		...artifact.remainingSteps.map((s, i) => `${i + 1}. ${s}`),
		'',
		'Use search() to recover full details from previous sessions.',
		'Use execute() to continue working on remaining steps.'
	].join('\n');
}
