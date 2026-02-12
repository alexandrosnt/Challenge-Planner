<script lang="ts">
    import GlassCard from '$lib/components/GlassCard.svelte';
    import ShoppingListItem from '$lib/components/ShoppingListItem.svelte';
    import { getShoppingList, toggleShoppingItem, deleteShoppingItem, clearCheckedShoppingItems, updateShoppingItem, type ShoppingItem } from '$lib/db/queries';
    import { getAuthState } from '$lib/stores/auth.svelte';
    import { getRefreshSignal, triggerRefresh } from '$lib/stores/refresh.svelte';
    import { t } from '$lib/i18n/index.svelte';

    let auth = getAuthState();
    let refresh = getRefreshSignal();

    let items = $state<ShoppingItem[]>([]);
    let loading = $state(true);

    let editingId: number | null = $state(null);
    let editName = $state('');
    let editQuantity = $state(1);
    let editNotes = $state('');
    let saving = $state(false);

    let uncheckedItems = $derived(items.filter(i => !i.checked));
    let checkedItems = $derived(items.filter(i => i.checked));
    let hasChecked = $derived(checkedItems.length > 0);

    async function loadData() {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        try {
            items = await getShoppingList(userId);
        } catch (e) {
            console.error('Failed to load shopping list:', e);
        } finally {
            loading = false;
        }
    }

    async function handleToggle(id: number) {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        await toggleShoppingItem(userId, id);
        await loadData();
    }

    async function handleDelete(id: number) {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        await deleteShoppingItem(userId, id);
        await loadData();
    }

    async function handleClearChecked() {
        const userId = auth.currentUser?.id;
        if (!userId) return;
        await clearCheckedShoppingItems(userId);
        await loadData();
    }

    function startEdit(id: number) {
        const item = items.find(i => i.id === id);
        if (!item) return;
        editingId = id;
        editName = item.name;
        editQuantity = item.quantity;
        editNotes = item.notes ?? '';
    }

    function cancelEdit() {
        editingId = null;
        editName = '';
        editQuantity = 1;
        editNotes = '';
    }

    async function handleSaveEdit() {
        const userId = auth.currentUser?.id;
        if (!userId || editingId === null) return;
        saving = true;
        try {
            await updateShoppingItem(userId, editingId, {
                name: editName,
                quantity: editQuantity,
                notes: editNotes || null
            });
            triggerRefresh();
            await loadData();
            cancelEdit();
        } catch (e) {
            console.error('Failed to save shopping item:', e);
        } finally {
            saving = false;
        }
    }

    $effect(() => {
        refresh.value;
        loadData();
    });
</script>

<header class="page-header">
    <h1 class="page-title">{t.shoppingList.title}</h1>
    {#if hasChecked}
        <button class="clear-btn" onclick={handleClearChecked}>
            <i class="ri-delete-bin-line"></i>
            {t.shoppingList.clearChecked}
        </button>
    {/if}
</header>

<main>
    {#if loading}
        <GlassCard>
            {#each Array(4) as _, i (i)}
                <div class="skeleton-row">
                    <div class="shimmer" style="width: 22px; height: 22px; border-radius: 4px;"></div>
                    <div class="shimmer" style="width: 140px; height: 14px;"></div>
                </div>
            {/each}
        </GlassCard>
    {:else if items.length === 0}
        <GlassCard>
            <div class="empty-state">
                <i class="ri-shopping-cart-2-line empty-icon"></i>
                <p class="empty-text">{t.shoppingList.noItems}</p>
            </div>
        </GlassCard>
    {:else}
        <!-- Unchecked Items -->
        {#if uncheckedItems.length > 0}
            <GlassCard>
                {#each uncheckedItems as item (item.id)}
                    <ShoppingListItem
                        {item}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                        onEdit={startEdit}
                    />
                {/each}
            </GlassCard>
        {/if}

        <!-- Checked Items -->
        {#if checkedItems.length > 0}
            <div class="checked-section">
                <span class="checked-label">{checkedItems.length} {t.common.done}</span>
            </div>
            <GlassCard>
                {#each checkedItems as item (item.id)}
                    <ShoppingListItem
                        {item}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                        onEdit={startEdit}
                    />
                {/each}
            </GlassCard>
        {/if}

        <!-- Edit Overlay -->
        {#if editingId !== null}
            <GlassCard>
                <div class="edit-form">
                    <h3 class="edit-title">{t.shoppingList.editItem}</h3>
                    <div class="form-group">
                        <label for="edit-name">{t.shoppingList.itemName}</label>
                        <input
                            id="edit-name"
                            type="text"
                            bind:value={editName}
                            placeholder={t.shoppingList.itemName}
                        />
                    </div>
                    <div class="form-group">
                        <label for="edit-quantity">{t.shoppingList.quantity}</label>
                        <input
                            id="edit-quantity"
                            type="number"
                            min="1"
                            bind:value={editQuantity}
                        />
                    </div>
                    <div class="form-group">
                        <label for="edit-notes">{t.shoppingList.notes}</label>
                        <input
                            id="edit-notes"
                            type="text"
                            bind:value={editNotes}
                            placeholder={t.shoppingList.notes}
                        />
                    </div>
                    <div class="edit-actions">
                        <button class="btn-cancel" onclick={cancelEdit} disabled={saving}>
                            {t.common.cancel}
                        </button>
                        <button class="btn-save" onclick={handleSaveEdit} disabled={saving}>
                            {saving ? t.shoppingList.saving : t.shoppingList.save}
                        </button>
                    </div>
                </div>
            </GlassCard>
        {/if}
    {/if}
</main>

<style>
    .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
    }
    .page-title {
        font-size: 20px;
        font-weight: 700;
        color: var(--text-dark);
        letter-spacing: -0.3px;
    }
    .clear-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: 50px;
        border: 1px solid rgba(0, 0, 0, 0.06);
        background: white;
        font-family: 'Poppins', sans-serif;
        font-size: 12px;
        font-weight: 600;
        color: var(--text-soft);
        cursor: pointer;
        transition: 0.2s;
    }
    .clear-btn:active {
        transform: scale(0.95);
        background: #f5f5f5;
    }
    .checked-section {
        padding: 12px 0 8px;
    }
    .checked-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-soft);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 40px 0;
        gap: 12px;
    }
    .empty-icon {
        font-size: 48px;
        color: var(--accent-sage);
    }
    .empty-text {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-soft);
        text-align: center;
    }
    .skeleton-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
    }
    .skeleton-row:not(:last-child) {
        border-bottom: 1px solid rgba(0, 0, 0, 0.04);
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

    /* Edit form styles */
    .edit-form {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }
    .edit-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--text-dark);
        margin: 0;
    }
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .form-group label {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-soft);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .form-group input {
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        background: rgba(255, 255, 255, 0.6);
        font-size: 14px;
        font-weight: 500;
        color: var(--text-dark);
        outline: none;
        transition: border-color 0.2s;
        font-family: 'Poppins', sans-serif;
    }
    .form-group input:focus {
        border-color: var(--accent-pink);
    }
    .edit-actions {
        display: flex;
        gap: 10px;
    }
    .btn-cancel,
    .btn-save {
        flex: 1;
        padding: 10px 0;
        border-radius: 10px;
        border: none;
        font-family: 'Poppins', sans-serif;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.2s;
    }
    .btn-cancel {
        background: rgba(0, 0, 0, 0.06);
        color: var(--text-soft);
    }
    .btn-save {
        background: var(--accent-pink);
        color: white;
    }
    .btn-cancel:disabled,
    .btn-save:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .btn-cancel:active,
    .btn-save:active {
        transform: scale(0.97);
    }
</style>
