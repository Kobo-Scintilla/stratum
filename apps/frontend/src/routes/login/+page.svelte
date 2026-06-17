<script lang="ts">
	import { authClient } from '$lib/auth-client.js';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
import { tFade, tFadeQuick, tSlide } from '$lib/transitions.js';

	let email = $state('');
	let password = $state('');
	let name = $state('');
	let isSignUp = $state(false);
	let error = $state('');
	let loading = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		loading = true;

		try {
			if (isSignUp) {
				const { error: err } = await authClient.signUp.email({
					name,
					email,
					password
				});
				if (err) {
					error = err.message || 'Sign up failed';
					loading = false;
					return;
				}
			} else {
				const { error: err } = await authClient.signIn.email({
					email,
					password,
					rememberMe: true
				});
				if (err) {
					error = err.message || 'Sign in failed';
					loading = false;
					return;
				}
			}
			goto('/dashboard');
		} catch (e: any) {
			error = e?.message || 'An unexpected error occurred';
		}
		loading = false;
	}
</script>

<div class="flex h-dvh w-full items-center justify-center bg-background p-4">
	<div class="w-full max-w-sm rounded-xl border border-border/20 bg-card p-8 shadow-lg">
		<div class="mb-6 text-center">
			<h1 class="text-2xl font-bold text-foreground">Stratum</h1>
			<p in:tFade out:tFadeQuick class="mt-1 text-sm text-muted-foreground">
				{isSignUp ? 'Create an account' : 'Sign in to continue'}
			</p>
		</div>

		<form onsubmit={handleSubmit} class="space-y-4">
			{#if isSignUp}
				<div in:tSlide={{ duration: 200 }} out:tSlide={{ duration: 150 }}>
					<label for="name" class="mb-1 block text-sm font-medium text-foreground">Name</label>
					<input
						id="name"
						type="text"
						bind:value={name}
						required={isSignUp}
						class="w-full rounded-lg border border-border/30 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
						placeholder="Your name"
					/>
				</div>
			{/if}

			<div>
				<label for="email" class="mb-1 block text-sm font-medium text-foreground">Email</label>
				<input
					id="email"
					type="email"
					bind:value={email}
					required
					class="w-full rounded-lg border border-border/30 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
					placeholder="you@example.com"
				/>
			</div>

			<div>
				<label for="password" class="mb-1 block text-sm font-medium text-foreground">Password</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					required
					minlength={8}
					class="w-full rounded-lg border border-border/30 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
					placeholder="••••••••"
				/>
			</div>

			{#if error}
				<p in:tFade out:tFadeQuick class="text-sm text-red-400">{error}</p>
			{/if}

			<button
				type="submit"
				disabled={loading}
				class="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
			>
				{loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
			</button>
		</form>

		<div class="mt-4 text-center">
			<button
				onclick={() => { isSignUp = !isSignUp; error = ''; }}
				class="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
			>
				{isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
			</button>
		</div>
	</div>
</div>
