// Handoff unit tests
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildHandoffArtifact, shouldHandoff, formatHandoffForPrompt } from '../handoff.js';

describe('handoff', () => {
	it('should build a structured artifact', () => {
		const artifact = buildHandoffArtifact({
			objective: 'Deploy microservice',
			priorDecisions: ['Use Docker Hub', 'Port 8080'],
			currentState: 'CI passing, waiting on approval',
			nextSteps: ['Get approval', 'Merge PR']
		});
		assert.equal(artifact.objective, 'Deploy microservice');
		assert.equal(artifact.priorDecisions.length, 2);
		assert.equal(artifact.remainingSteps.length, 2);
		assert.ok(artifact.timestamp);
	});

	it('should trigger handoff at 85%', () => {
		assert.ok(shouldHandoff(0.9, true));
		assert.ok(shouldHandoff(0.5, true));
		assert.ok(shouldHandoff(0.9, false));
		assert.ok(!shouldHandoff(0.5, false));
	});

	it('should format artifact as readable prompt', () => {
		const artifact = buildHandoffArtifact({
			objective: 'Fix bug',
			priorDecisions: ['Root cause is off-by-one'],
			currentState: 'Fix applied',
			nextSteps: ['Verify fix', 'Run tests']
		});
		const prompt = formatHandoffForPrompt(artifact);
		assert.ok(prompt.includes('## Session Handoff'));
		assert.ok(prompt.includes('Fix bug'));
		assert.ok(prompt.includes('Root cause is off-by-one'));
		assert.ok(prompt.includes('Verify fix'));
		assert.ok(prompt.includes('Run tests'));
	});
});
