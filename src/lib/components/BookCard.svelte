<script lang="ts">
	import ProgressBar from '$lib/components/ProgressBar.svelte';
	import SelectableCheckbox from './SelectableCheckbox.svelte';
	import StarRating from './StarRating.svelte';
	import { t } from '$lib/i18n/index.svelte';

	interface BookItem {
		id: number;
		title: string;
		author: string | null;
		cover_url: string | null;
		total_pages: number;
		current_page: number;
		rating: number;
		status: string;
	}

	let {
		book,
		onEdit,
		onRemove,
		selectMode = false,
		selected = false,
		onSelect,
	}: {
		book: BookItem;
		onEdit?: (id: number) => void;
		onRemove?: (id: number) => void;
		selectMode?: boolean;
		selected?: boolean;
		onSelect?: (id: number) => void;
	} = $props();

	let showDetail = $state(false);

	let percentage = $derived(
		book.total_pages > 0 ? Math.round((book.current_page / book.total_pages) * 100) : 0
	);

	function openDetail() {
		if (!selectMode) showDetail = true;
	}

	function statusClass(status: string): string {
		switch (status) {
			case 'reading': return 'status-reading';
			case 'completed': return 'status-completed';
			case 'want-to-read': return 'status-want-to-read';
			case 'dropped': return 'status-dropped';
			default: return '';
		}
	}

	function statusLabel(status: string): string {
		switch (status) {
			case 'reading': return t.books.reading;
			case 'completed': return t.books.completed;
			case 'want-to-read': return t.books.wantToRead;
			case 'dropped': return t.books.dropped;
			default: return status;
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="book-card"
	class:selected-card={selectMode && selected}
	onclick={selectMode ? () => onSelect?.(book.id) : undefined}
>
	<div class="card-header">
		{#if selectMode}
			<SelectableCheckbox checked={selected} onToggle={() => onSelect?.(book.id)} />
		{/if}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		{#if book.cover_url}
			<div class="cover-box" onclick={openDetail}>
				<img src={book.cover_url} alt={book.title} class="cover-img" />
			</div>
		{:else}
			<div class="icon-box" onclick={openDetail}>
				<i class="ri-book-open-line"></i>
			</div>
		{/if}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="item-info" onclick={openDetail}>
			<h4 class="item-name">{book.title}</h4>
			{#if book.author}
				<span class="category-name">{book.author}</span>
			{/if}
			{#if book.rating > 0}
				<StarRating rating={book.rating} />
			{/if}
		</div>
		{#if !selectMode}
			<div class="action-btns">
				{#if onEdit}
					<button class="action-btn" onclick={() => onEdit(book.id)} aria-label={t.books.editBook}>
						<i class="ri-pencil-line"></i>
					</button>
				{/if}
				{#if onRemove}
					<button class="action-btn remove" onclick={() => onRemove(book.id)} aria-label={t.books.removeBook}>
						<i class="ri-close-line"></i>
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<div class="progress-section">
		<div class="progress-text">
			<span class="progress-label">{t.books.progress}</span>
			<span class="progress-count">{book.current_page} {t.books.of} {book.total_pages} {t.books.pages}</span>
		</div>
		<ProgressBar value={percentage} height="8px" />
	</div>

	<div class="card-footer">
		<span class="status-pill {statusClass(book.status)}">{statusLabel(book.status)}</span>
		<span class="percentage-text">{percentage}%</span>
	</div>
</div>

{#if showDetail}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="detail-backdrop" onclick={() => showDetail = false}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="detail-sheet" onclick={(e) => e.stopPropagation()}>
			<div class="detail-handle"></div>
			<div class="detail-header">
				{#if book.cover_url}
					<div class="detail-cover-box">
						<img src={book.cover_url} alt={book.title} class="detail-cover-img" />
					</div>
				{:else}
					<div class="detail-icon-box">
						<i class="ri-book-open-line"></i>
					</div>
				{/if}
				<button class="detail-close" onclick={() => showDetail = false} aria-label="Close">
					<i class="ri-close-line"></i>
				</button>
			</div>
			<h3 class="detail-name">{book.title}</h3>
			{#if book.author}
				<span class="detail-category">{book.author}</span>
			{/if}
			{#if book.rating > 0}
				<div class="detail-rating">
					<StarRating rating={book.rating} />
				</div>
			{/if}
			<div class="detail-stats">
				<div class="detail-stat">
					<span class="detail-stat-value">{book.total_pages}</span>
					<span class="detail-stat-label">{t.books.totalPages}</span>
				</div>
				<div class="detail-stat">
					<span class="detail-stat-value">{book.current_page}</span>
					<span class="detail-stat-label">{t.books.currentPage}</span>
				</div>
				<div class="detail-stat">
					<span class="detail-stat-value">{percentage}%</span>
					<span class="detail-stat-label">{t.books.progress}</span>
				</div>
			</div>
			<ProgressBar value={percentage} height="8px" />
		</div>
	</div>
{/if}

<style>
	.book-card {
		background: var(--glass-bg);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--glass-border);
		border-radius: var(--radius-m);
		box-shadow: var(--glass-shadow);
		padding: 20px;
		margin-bottom: 16px;
	}

	.book-card.selected-card {
		border-color: var(--accent-pink);
		box-shadow: 0 0 0 2px rgba(233, 30, 99, 0.15);
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}

	.icon-box {
		width: 46px;
		height: 46px;
		background: #FFF0F3;
		border-radius: var(--radius-s);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 22px;
		color: var(--accent-pink);
		flex-shrink: 0;
	}

	.cover-box {
		width: 46px;
		height: 46px;
		border-radius: var(--radius-s);
		overflow: hidden;
		flex-shrink: 0;
	}

	.cover-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.item-info {
		flex: 1;
		min-width: 0;
	}

	.item-name {
		font-size: 15px;
		font-weight: 600;
		color: var(--text-dark);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.category-name {
		font-size: 12px;
		color: var(--text-soft);
		font-weight: 500;
	}

	.action-btns {
		display: flex;
		gap: 8px;
		flex-shrink: 0;
	}

	.action-btn {
		width: 40px;
		height: 40px;
		border: none;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.05);
		color: var(--text-soft);
		font-size: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}

	.action-btn:active {
		background: rgba(99, 102, 241, 0.15);
		color: var(--accent-primary, #6366f1);
		transform: scale(0.9);
	}

	.action-btn.remove:active {
		background: rgba(255, 107, 129, 0.15);
		color: var(--accent-pink);
	}

	.progress-section {
		margin-bottom: 14px;
	}

	.progress-text {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 12px;
		font-weight: 600;
	}

	.progress-label {
		color: var(--text-dark);
	}

	.progress-count {
		color: var(--text-soft);
	}

	.card-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.percentage-text {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-soft);
	}

	.status-pill {
		display: inline-block;
		font-size: 11px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 50px;
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}

	.status-reading { background: #E3F2FD; color: #1976D2; }
	.status-completed { background: #E8F5E9; color: #388E3C; }
	.status-want-to-read { background: #FFF3E0; color: #F57C00; }
	.status-dropped { background: #FAFAFA; color: #9E9E9E; }

	/* Tappable areas */
	.icon-box, .cover-box, .item-info {
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	/* Detail Modal */
	.detail-backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		display: flex;
		align-items: flex-end;
		justify-content: center;
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes slideUp {
		from { transform: translateY(100%); }
		to { transform: translateY(0); }
	}

	.detail-sheet {
		width: 100%;
		max-width: 500px;
		background: #fdfbf7;
		border-radius: var(--radius-l) var(--radius-l) 0 0;
		padding: 0 24px calc(32px + env(safe-area-inset-bottom, 0px));
		animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}

	.detail-handle {
		width: 40px;
		height: 4px;
		background: rgba(0, 0, 0, 0.12);
		border-radius: 2px;
		margin: 12px auto 16px;
	}

	.detail-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}

	.detail-icon-box {
		width: 52px;
		height: 52px;
		background: #FFF0F3;
		border-radius: var(--radius-s);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 26px;
		color: var(--accent-pink);
	}

	.detail-cover-box {
		width: 52px;
		height: 52px;
		border-radius: var(--radius-s);
		overflow: hidden;
	}

	.detail-cover-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.detail-close {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid rgba(0, 0, 0, 0.06);
		background: white;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 20px;
		color: var(--text-soft);
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}

	.detail-close:active {
		background: rgba(0, 0, 0, 0.04);
		transform: scale(0.95);
	}

	.detail-name {
		font-family: 'Poppins', sans-serif;
		font-size: 22px;
		font-weight: 700;
		color: var(--text-dark);
		margin: 0 0 4px;
		line-height: 1.3;
		word-break: break-word;
	}

	.detail-category {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-soft);
	}

	.detail-rating {
		margin-top: 8px;
	}

	.detail-stats {
		display: flex;
		gap: 8px;
		margin: 20px 0 16px;
	}

	.detail-stat {
		flex: 1;
		background: var(--glass-bg, rgba(255, 255, 255, 0.6));
		border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.3));
		border-radius: var(--radius-m, 12px);
		padding: 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.detail-stat-value {
		font-family: 'Poppins', sans-serif;
		font-size: 18px;
		font-weight: 700;
		color: var(--text-dark);
	}

	.detail-stat-label {
		font-size: 11px;
		font-weight: 500;
		color: var(--text-soft);
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}
</style>
