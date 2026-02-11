<script>
	import { page } from '$app/state';
	import { openAddModal } from '$lib/stores/modal.svelte';
	import { t } from '$lib/i18n/index.svelte';

	let currentPath = $derived(page.url.pathname);

	const navItems = [
		{ href: '/', icon: 'ri-home-5-fill', label: t.nav.home },
		{ href: '/inventory', icon: 'ri-archive-drawer-line', label: t.nav.inventory },
		{ icon: 'ri-add-line', label: t.nav.add, isCenter: true },
		{ href: '/projects', icon: 'ri-trophy-line', label: t.nav.projects },
		{ href: '/insights', icon: 'ri-line-chart-line', label: t.nav.insights },
	];
</script>

<nav class="dock-container">
	<div class="dock">
		{#each navItems as item (item.label)}
			{#if item.isCenter}
				<div class="add-btn-wrapper">
					<button
						class="add-btn"
						aria-label={item.label}
						onclick={openAddModal}
					>
						<i class={item.icon}></i>
					</button>
				</div>
			{:else}
				<a
					href={item.href}
					class="nav-btn {currentPath === item.href ? 'active' : ''}"
					aria-label={item.label}
				>
					<i class={item.icon}></i>
				</a>
			{/if}
		{/each}
	</div>
</nav>

<style>
	.dock-container {
		position: fixed;
		bottom: 30px;
		left: 24px;
		right: 24px;
		display: flex;
		justify-content: center;
		z-index: 100;
	}

	.dock {
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(20px);
		padding: 12px 30px;
		border-radius: 40px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
		display: flex;
		align-items: center;
		gap: 30px;
		border: 1px solid rgba(255, 255, 255, 1);
	}

	.nav-btn {
		border: none;
		background: none;
		color: #c1c1c1;
		font-size: 24px;
		position: relative;
		transition: 0.3s;
		text-decoration: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-btn.active {
		color: var(--accent-pink);
		transform: translateY(-2px);
	}

	.nav-btn.active::after {
		content: '';
		position: absolute;
		bottom: -8px;
		left: 50%;
		transform: translateX(-50%);
		width: 4px;
		height: 4px;
		background: var(--accent-pink);
		border-radius: 50%;
	}

	.add-btn-wrapper {
		position: relative;
		top: -25px;
	}

	.add-btn {
		width: 60px;
		height: 60px;
		background: var(--primary-gradient);
		border-radius: 50%;
		border: 4px solid #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-size: 28px;
		box-shadow: 0 10px 25px rgba(255, 107, 129, 0.4);
		cursor: pointer;
		transition: transform 0.2s;
	}

	.add-btn:active {
		transform: scale(0.9);
	}
</style>
