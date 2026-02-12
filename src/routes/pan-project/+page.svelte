<script lang="ts">
    import GlassCard from '$lib/components/GlassCard.svelte';
    import SectionTitle from '$lib/components/SectionTitle.svelte';
    import ProgressRing from '$lib/components/ProgressRing.svelte';
    import PanItemCard from '$lib/components/PanItemCard.svelte';
    import { getPanItems, getPanProjectStats, markPanItemEmptied, removePanItem, updatePanItem, type PanProjectItem, type PanProjectStats } from '$lib/db/queries';
    import { getAuthState } from '$lib/stores/auth.svelte';
    import { getRefreshSignal, triggerRefresh } from '$lib/stores/refresh.svelte';
    import { t } from '$lib/i18n/index.svelte';

    let auth = getAuthState();
    let refresh = getRefreshSignal();

    let items = $state<PanProjectItem[]>([]);
    let stats = $state<PanProjectStats | null>(null);
    let loading = $state(true);

    let editingId: number | null = $state(null);
    let editQuantity = $state(1);
    let saving = $state(false);

    let completionPct = $derived(
        stats && stats.total > 0 ? Math.round((stats.emptied / stats.total) * 100) : 0
    );

    async function loadData() {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        try {
            [items, stats] = await Promise.all([
                getPanItems(userId),
                getPanProjectStats(userId)
            ]);
        } catch (e) {
            console.error('Failed to load pan project data:', e);
        } finally {
            loading = false;
        }
    }

    async function handleMarkEmptied(panItemId: number) {
        await markPanItemEmptied(panItemId);
        await loadData();
    }

    async function handleRemove(panItemId: number) {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        await removePanItem(userId, panItemId);
        await loadData();
    }

    function startEdit(id: number) {
        const item = items.find(i => i.id === id);
        if (!item) return;
        editingId = id;
        editQuantity = item.quantity;
    }

    function cancelEdit() {
        editingId = null;
        editQuantity = 1;
        saving = false;
    }

    async function handleSaveQuantity() {
        const userId = auth.currentUser?.id;
        if (!userId || editingId === null) return;
        saving = true;
        try {
            await updatePanItem(userId, editingId, editQuantity);
            triggerRefresh();
            await loadData();
        } finally {
            cancelEdit();
        }
    }

    $effect(() => {
        refresh.value;
        loadData();
    });
</script>

<header class="page-header">
    <h1 class="page-title">{t.panProject.title}</h1>
</header>

<main>
    {#if loading}
        <!-- Skeleton -->
        <div class="hero-ring">
            <div class="shimmer" style="width: 120px; height: 120px; border-radius: 50%;"></div>
            <div class="shimmer" style="width: 160px; height: 14px; margin-top: 14px;"></div>
        </div>
        {#each Array(3) as _, i (i)}
            <GlassCard>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div class="shimmer" style="width: 40px; height: 40px; border-radius: 50%;"></div>
                    <div style="flex: 1;">
                        <div class="shimmer" style="width: 120px; height: 14px; margin-bottom: 6px;"></div>
                        <div class="shimmer" style="width: 80px; height: 10px;"></div>
                    </div>
                </div>
            </GlassCard>
        {/each}
    {:else}
        <!-- Hero Progress Ring -->
        <div class="hero-ring">
            <ProgressRing value={completionPct} size={120} strokeWidth={7} />
            {#if stats}
                <p class="hero-label">
                    {stats.emptied} {t.panProject.of} {stats.total} {t.panProject.emptied}
                </p>
            {/if}
        </div>

        <!-- Pan Items -->
        {#if items.length > 0}
            <SectionTitle title={t.panProject.progress} actionText="{items.length} {t.common.items}" />
            {#each items as item (item.id)}
                <PanItemCard
                    {item}
                    onMarkEmptied={handleMarkEmptied}
                    onRemove={handleRemove}
                    onEdit={startEdit}
                />
            {/each}

            {#if editingId !== null}
                <GlassCard>
                    <div class="edit-form">
                        <label class="edit-label" for="edit-quantity">{t.panProject.editQuantity}</label>
                        <input
                            id="edit-quantity"
                            class="edit-input"
                            type="number"
                            min="1"
                            bind:value={editQuantity}
                        />
                        <div class="edit-actions">
                            <button class="edit-btn-cancel" onclick={cancelEdit} disabled={saving}>
                                {t.common.cancel}
                            </button>
                            <button class="edit-btn-save" onclick={handleSaveQuantity} disabled={saving}>
                                {saving ? t.panProject.saving : t.panProject.save}
                            </button>
                        </div>
                    </div>
                </GlassCard>
            {/if}
        {:else}
            <GlassCard>
                <div class="empty-state">
                    <i class="ri-flask-line empty-icon"></i>
                    <p class="empty-title">{t.panProject.noItems}</p>
                    <p class="empty-text">{t.panProject.emptyState}</p>
                </div>
            </GlassCard>
        {/if}
    {/if}
</main>

<style>
    .page-header {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px 24px;
    }
    .page-title {
        font-size: 20px;
        font-weight: 700;
        color: var(--text-dark);
        letter-spacing: -0.3px;
    }
    .hero-ring {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px 0 28px;
    }
    .hero-label {
        margin-top: 14px;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-soft);
    }
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 32px 0;
        gap: 8px;
    }
    .empty-icon {
        font-size: 48px;
        color: var(--accent-sage);
        margin-bottom: 4px;
    }
    .empty-title {
        font-size: 16px;
        font-weight: 600;
        color: var(--text-dark);
    }
    .empty-text {
        font-size: 13px;
        color: var(--text-soft);
        text-align: center;
        max-width: 250px;
    }
    .shimmer {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 8px;
        display: inline-block;
    }
    @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
    .edit-form {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }
    .edit-label {
        font-size: 14px;
        font-weight: 600;
        color: var(--text-dark);
    }
    .edit-input {
        width: 100%;
        padding: 12px 14px;
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-s);
        font-family: 'Poppins', sans-serif;
        font-size: 15px;
        color: var(--text-dark);
        background: white;
        outline: none;
        transition: border-color 0.2s;
        box-sizing: border-box;
    }
    .edit-input:focus {
        border-color: var(--accent-primary, #6366f1);
    }
    .edit-actions {
        display: flex;
        gap: 10px;
    }
    .edit-btn-cancel {
        flex: 1;
        padding: 12px;
        border: 1px solid rgba(0, 0, 0, 0.06);
        border-radius: 50px;
        background: white;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-soft);
        cursor: pointer;
        transition: 0.2s;
    }
    .edit-btn-cancel:active:not(:disabled) {
        transform: scale(0.98);
        background: #f5f5f5;
    }
    .edit-btn-save {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 50px;
        background: var(--accent-primary, #6366f1);
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
        font-weight: 600;
        color: white;
        cursor: pointer;
        transition: 0.2s;
    }
    .edit-btn-save:active:not(:disabled) {
        transform: scale(0.98);
        opacity: 0.9;
    }
    .edit-btn-save:disabled,
    .edit-btn-cancel:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
</style>
