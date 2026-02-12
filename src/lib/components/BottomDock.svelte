<script lang="ts">
	import { page } from '$app/state';
	import { openModal, type ModalType } from '$lib/stores/modal.svelte';
	import { t } from '$lib/i18n/index.svelte';

	let currentPath = $derived(page.url.pathname);

	const leftNav = [
		{ href: '/', icon: 'ri-home-5-fill', label: t.nav.home },
		{ href: '/inventory', icon: 'ri-archive-drawer-line', label: t.nav.inventory },
		{ href: '/pan-project', icon: 'ri-flask-line', label: t.nav.panProject },
	];

	const rightNav = [
		{ href: '/budget', icon: 'ri-wallet-3-line', label: t.nav.budget },
		{ href: '/declutter', icon: 'ri-delete-bin-line', label: t.nav.declutter },
		{ href: '/shopping', icon: 'ri-shopping-cart-2-line', label: t.nav.shopping },
	];

	// Map each route to which modal the + button opens
	const addButtonMap: Record<string, ModalType> = {
		'/inventory': 'add-item',
		'/pan-project': 'inventory-picker-pan',
		'/budget': 'add-purchase',
		'/declutter': 'inventory-picker-declutter',
		'/shopping': 'add-shopping-item',
	};

	let addDisabled = $derived(!(currentPath in addButtonMap));

	function handleAdd() {
		const modalType = addButtonMap[currentPath];
		if (modalType) openModal(modalType);
	}
</script>

<nav class="dock-container">
	<div class="dock">
		{#each leftNav as item (item.href)}
			<a
				href={item.href}
				class="nav-btn {currentPath === item.href ? 'active' : ''}"
				aria-label={item.label}
			>
				<i class={item.icon}></i>
			</a>
		{/each}

		<div class="add-btn-wrapper">
			<button
				class="add-btn"
				class:disabled={addDisabled}
				aria-label={t.nav.add}
				onclick={handleAdd}
				disabled={addDisabled}
			>
				<i class="ri-add-line"></i>
			</button>
		</div>

		{#each rightNav as item (item.href)}
			<a
				href={item.href}
				class="nav-btn {currentPath === item.href ? 'active' : ''}"
				aria-label={item.label}
			>
				<i class={item.icon}></i>
			</a>
		{/each}
	</div>
</nav>

<style>
	.dock-container {
		position: fixed;
		bottom: 30px;
		left: 12px;
		right: 12px;
		display: flex;
		justify-content: center;
		z-index: 100;
	}

	.dock {
		background: rgba(255, 255, 255, 0.9);
		backdrop-filter: blur(20px);
		padding: 10px 16px;
		border-radius: 40px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
		display: flex;
		align-items: center;
		gap: 14px;
		border: 1px solid rgba(255, 255, 255, 1);
	}

	.nav-btn {
		border: none;
		background: none;
		color: #c1c1c1;
		font-size: 22px;
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
		bottom: -6px;
		left: 50%;
		transform: translateX(-50%);
		width: 4px;
		height: 4px;
		background: var(--accent-pink);
		border-radius: 50%;
	}

	.add-btn-wrapper {
		position: relative;
		top: -22px;
	}

	.add-btn {
		width: 52px;
		height: 52px;
		background: var(--primary-gradient);
		border-radius: 50%;
		border: 4px solid #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-size: 26px;
		box-shadow: 0 10px 25px rgba(255, 107, 129, 0.4);
		cursor: pointer;
		transition: transform 0.2s, opacity 0.2s;
	}

	.add-btn:active {
		transform: scale(0.9);
	}

	.add-btn.disabled {
		opacity: 0.35;
		cursor: default;
		box-shadow: none;
	}

	.add-btn.disabled:active {
		transform: none;
	}
</style>
