<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { openModal, type ModalType } from '$lib/stores/modal.svelte';
	import { t } from '$lib/i18n/index.svelte';

	interface NavChild {
		href: string;
		label: string;
		icon: string;
	}

	interface NavGroup {
		icon: string;
		label: string;
		children: NavChild[];
	}

	let currentPath = $derived(page.url.pathname);

	let leftNav: NavGroup[] = $derived([
		{
			icon: 'ri-home-5-fill',
			label: t.nav.home,
			children: [{ href: '/', label: t.nav.home, icon: 'ri-home-5-fill' }],
		},
		{
			icon: 'ri-archive-drawer-line',
			label: t.nav.inventory,
			children: [{ href: '/inventory', label: t.nav.inventory, icon: 'ri-archive-drawer-line' }],
		},
		{
			icon: 'ri-flask-line',
			label: t.nav.projects,
			children: [
				{ href: '/pan-project', label: t.nav.panProject, icon: 'ri-flask-line' },
				{ href: '/books', label: t.nav.books, icon: 'ri-book-open-line' },
			],
		},
	]);

	let rightNav: NavGroup[] = $derived([
		{
			icon: 'ri-wallet-3-line',
			label: t.nav.budget,
			children: [{ href: '/budget', label: t.nav.budget, icon: 'ri-wallet-3-line' }],
		},
		{
			icon: 'ri-delete-bin-line',
			label: t.nav.declutter,
			children: [{ href: '/declutter', label: t.nav.declutter, icon: 'ri-delete-bin-line' }],
		},
		{
			icon: 'ri-shopping-cart-2-line',
			label: t.nav.shopping,
			children: [{ href: '/shopping', label: t.nav.shopping, icon: 'ri-shopping-cart-2-line' }],
		},
	]);

	// Map each route to which modal the + button opens
	const addButtonMap: Record<string, ModalType> = {
		'/inventory': 'add-item',
		'/pan-project': 'inventory-picker-pan',
		'/budget': 'add-purchase',
		'/declutter': 'inventory-picker-declutter',
		'/shopping': 'add-shopping-item',
		'/books': 'add-book',
	};

	let addDisabled = $derived(!(currentPath in addButtonMap));

	function handleAdd() {
		const modalType = addButtonMap[currentPath];
		if (modalType) openModal(modalType);
	}

	// Popover state
	let openPopoverIndex = $state<string | null>(null);

	function isGroupActive(group: NavGroup): boolean {
		return group.children.some((child) => currentPath === child.href);
	}

	function handleNavTap(group: NavGroup, groupKey: string) {
		if (group.children.length === 1) {
			goto(group.children[0].href);
		} else {
			openPopoverIndex = openPopoverIndex === groupKey ? null : groupKey;
		}
	}

	function handleChildTap(child: NavChild) {
		openPopoverIndex = null;
		goto(child.href);
	}

	function dismissPopover() {
		openPopoverIndex = null;
	}
</script>

{#if openPopoverIndex !== null}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="popover-backdrop" onclick={dismissPopover} onkeydown={(e) => { if (e.key === 'Escape') dismissPopover(); }}></div>
{/if}

<nav class="dock-container">
	<div class="dock">
		{#each leftNav as group, i (`left-${i}`)}
			<div class="nav-item-wrapper">
				{#if openPopoverIndex === `left-${i}` && group.children.length > 1}
					<div class="popover">
						{#each group.children as child (child.href)}
							<button
								class="popover-row"
								class:popover-row-active={currentPath === child.href}
								onclick={() => handleChildTap(child)}
							>
								<i class={child.icon}></i>
								<span>{child.label}</span>
							</button>
						{/each}
					</div>
				{/if}
				<button
					class="nav-btn"
					class:active={isGroupActive(group)}
					aria-label={group.label}
					onclick={() => handleNavTap(group, `left-${i}`)}
				>
					<i class={group.icon}></i>
				</button>
			</div>
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

		{#each rightNav as group, i (`right-${i}`)}
			<div class="nav-item-wrapper">
				{#if openPopoverIndex === `right-${i}` && group.children.length > 1}
					<div class="popover">
						{#each group.children as child (child.href)}
							<button
								class="popover-row"
								class:popover-row-active={currentPath === child.href}
								onclick={() => handleChildTap(child)}
							>
								<i class={child.icon}></i>
								<span>{child.label}</span>
							</button>
						{/each}
					</div>
				{/if}
				<button
					class="nav-btn"
					class:active={isGroupActive(group)}
					aria-label={group.label}
					onclick={() => handleNavTap(group, `right-${i}`)}
				>
					<i class={group.icon}></i>
				</button>
			</div>
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
		cursor: pointer;
		padding: 0;
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

	/* Nav item wrapper for popover positioning */
	.nav-item-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Popover backdrop */
	.popover-backdrop {
		position: fixed;
		inset: 0;
		z-index: 99;
	}

	/* Glassmorphic popover menu */
	.popover {
		position: absolute;
		bottom: calc(100% + 16px);
		left: 50%;
		transform: translateX(-50%);
		background: rgba(255, 255, 255, 0.92);
		backdrop-filter: blur(20px);
		border-radius: 16px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
		border: 1px solid rgba(255, 255, 255, 1);
		padding: 6px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 160px;
		z-index: 101;
		animation: popover-in 0.15s ease-out;
	}

	.popover::after {
		content: '';
		position: absolute;
		bottom: -6px;
		left: 50%;
		transform: translateX(-50%) rotate(45deg);
		width: 12px;
		height: 12px;
		background: rgba(255, 255, 255, 0.92);
		border-right: 1px solid rgba(255, 255, 255, 1);
		border-bottom: 1px solid rgba(255, 255, 255, 1);
	}

	@keyframes popover-in {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(0);
		}
	}

	.popover-row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		border: none;
		background: none;
		border-radius: 12px;
		font-size: 14px;
		font-family: inherit;
		color: #555;
		cursor: pointer;
		transition: background 0.15s;
		white-space: nowrap;
	}

	.popover-row:active {
		background: rgba(0, 0, 0, 0.05);
	}

	.popover-row i {
		font-size: 18px;
		width: 22px;
		text-align: center;
	}

	.popover-row-active {
		color: var(--accent-pink);
		font-weight: 600;
	}
</style>
