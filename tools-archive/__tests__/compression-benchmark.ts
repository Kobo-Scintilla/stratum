// Compression Benchmark
// Tests Headroom compression ratios and verifies no hallucination.
// Requires Headroom to be running at HEADROOM_URL (default: http://headroom:8787)
// Run: npx tsx app/src/lib/server/tools/__tests__/compression-benchmark.ts

const HEADROOM_URL = process.env.HEADROOM_URL || 'http://headroom:8787';

interface HeadroomResult {
	messages: unknown[];
	tokens_before: number;
	tokens_after: number;
	compression_ratio: number;
}

async function compressViaHeadroom(messages: unknown[]): Promise<HeadroomResult> {
	const res = await fetch(`${HEADROOM_URL}/v1/compress`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ messages, model: 'claude-sonnet-4-5-20250929' })
	});
	if (!res.ok) throw new Error(`Headroom returned ${res.status}`);
	return res.json();
}

// ── Test Data ──────────────────────────────────────────────────────

function generateToolOutput(schema: string, rows: number): string {
	const items: string[] = [];
	for (let i = 0; i < rows; i++) {
		items.push(JSON.stringify({
			id: i,
			name: `item_${i}`,
			status: i % 3 === 0 ? 'error' : 'ok',
			value: Math.random() * 1000,
			tags: ['test', `group_${i % 10}`],
			timestamp: new Date().toISOString()
		}));
	}
	return '[\n' + items.join(',\n') + '\n]';
}

function generateCodeOutput(): string {
	return `def calculate_metrics(data_frame, aggregation_period="daily", include_outliers=False):
    """Calculate aggregated metrics for a given data frame.
    
    Args:
        data_frame: Input DataFrame with columns [timestamp, value, category]
        aggregation_period: "daily", "weekly", or "monthly"
        include_outliers: Whether to include outlier values in calculation
    
    Returns:
        dict with aggregated statistics
    """
    import pandas as pd
    import numpy as np
    
    # Validate input
    if data_frame.empty:
        return {"error": "Empty data frame"}
    
    # Group by period
    df = data_frame.copy()
    df["period"] = df["timestamp"].dt.to_period(aggregation_period[0].upper())
    
    # Calculate aggregates
    result = {
        "mean": df["value"].mean(),
        "median": df["value"].median(),
        "std": df["value"].std(),
        "min": df["value"].min(),
        "max": df["value"].max(),
        "count": len(df),
        "unique_categories": df["category"].nunique(),
    }
    
    # Outlier handling
    if include_outliers:
        q1 = df["value"].quantile(0.25)
        q3 = df["value"].quantile(0.75)
        iqr = q3 - q1
        outliers = df[(df["value"] < q1 - 1.5 * iqr) | (df["value"] > q3 + 1.5 * iqr)]
        result["outliers"] = len(outliers)
        result["outlier_percentage"] = round(len(outliers) / len(df) * 100, 2)
    
    # Per-category breakdown
    category_stats = df.groupby("category").agg({
        "value": ["mean", "count"]
    }).to_dict()
    result["by_category"] = category_stats
    
    return result
`;
}

function generateConversation(turns: number) {
	const messages: unknown[] = [{ role: 'system', content: 'You are a helpful assistant.' }];
	for (let i = 0; i < turns; i++) {
		messages.push({ role: 'user', content: `Question ${i}: What is the status of deployment ${i}?` });
		messages.push({
			role: 'assistant',
			content: [
				{ type: 'tool_use', id: `tool_${i}`, name: 'execute', input: { language: 'shell', code: `echo "checking deployment ${i}"` } }
			]
		});
		messages.push({
			role: 'tool',
			tool_call_id: `tool_${i}`,
			content: i % 2 === 0 ? generateToolOutput('status', 100) : generateCodeOutput()
		});
		messages.push({
			role: 'assistant',
			content: `Deployment ${i} status: ${i % 2 === 0 ? 'running' : 'failed'}. Check logs for details.`
		});
	}
	return messages;
}

// ── Benchmark Suite ────────────────────────────────────────────────

async function runBenchmark() {
	console.log('=== Compression Benchmark ===\n');
	console.log(`Headroom URL: ${HEADROOM_URL}`);

	// Test 1: Small conversation (5 turns)
	console.log('\n--- Test 1: Small conversation (5 turns, 20 messages) ---');
	const small = generateConversation(5);
	try {
		const result = await compressViaHeadroom(small);
		console.log(`  Before: ${result.tokens_before} tokens`);
		console.log(`  After:  ${result.tokens_after} tokens`);
		console.log(`  Ratio:  ${(result.compression_ratio * 100).toFixed(1)}%`);
		console.log(`  Saved:  ${(result.tokens_before - result.tokens_after).toLocaleString()} tokens`);
	} catch (e) {
		console.log(`  SKIP: Headroom unavailable (${e})`);
	}

	// Test 2: JSON-heavy conversation (20 turns)
	console.log('\n--- Test 2: JSON-heavy conversation (20 turns, 80 messages) ---');
	const jsonHeavy = generateConversation(20);
	try {
		const result = await compressViaHeadroom(jsonHeavy);
		console.log(`  Before: ${result.tokens_before} tokens`);
		console.log(`  After:  ${result.tokens_after} tokens`);
		console.log(`  Ratio:  ${(result.compression_ratio * 100).toFixed(1)}%`);
		console.log(`  Saved:  ${(result.tokens_before - result.tokens_after).toLocaleString()} tokens`);
	} catch (e) {
		console.log(`  SKIP: Headroom unavailable (${e})`);
	}

	// Test 3: Large tool output (1 JSON array with 1000 rows)
	console.log('\n--- Test 3: Large tool output (1000-row JSON) ---');
	const largeOutput: unknown[] = [
		{ role: 'system', content: 'You are a helpful assistant.' },
		{ role: 'user', content: 'Show me all the deployment statuses.' },
		{ role: 'assistant', content: [{ type: 'tool_use', id: 'tool_1', name: 'execute', input: {} }] },
		{ role: 'tool', tool_call_id: 'tool_1', content: generateToolOutput('deployment_status', 1000) },
		{ role: 'assistant', content: 'Here are all the deployment statuses.' }
	];
	try {
		const result = await compressViaHeadroom(largeOutput);
		console.log(`  Before: ${result.tokens_before} tokens`);
		console.log(`  After:  ${result.tokens_after} tokens`);
		console.log(`  Ratio:  ${(result.compression_ratio * 100).toFixed(1)}%`);
		console.log(`  Saved:  ${(result.tokens_before - result.tokens_after).toLocaleString()} tokens`);
	} catch (e) {
		console.log(`  SKIP: Headroom unavailable (${e})`);
	}

	console.log('\n=== Benchmark Complete ===');
}

runBenchmark().catch(console.error);
