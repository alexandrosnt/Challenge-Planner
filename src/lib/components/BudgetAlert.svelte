<script>
  import GlassCard from '$lib/components/GlassCard.svelte';

  let { categoryName, spent, limit } = $props();

  let remaining = $derived(limit - spent);
</script>

<GlassCard style="background: linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,240,240,0.8));">
  <div class="alert-header">
    <div class="alert-label">
      <i class="ri-alert-line"></i>
      <span>Low Buy Alert</span>
    </div>
    <span class="category-badge">{categoryName}</span>
  </div>
  <p class="alert-message">
    You've spent <strong>{spent}€</strong> of your {limit}€ limit.
    {#if remaining <= 5}
      Maybe wait until next month?
    {:else}
      You have <strong>{remaining}€</strong> left.
    {/if}
  </p>
</GlassCard>

<style>
  .alert-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .alert-label {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .alert-label i {
    color: var(--accent-pink);
  }

  .alert-label span {
    font-weight: 600;
    font-size: 14px;
  }

  .category-badge {
    font-size: 12px;
    background: white;
    padding: 4px 8px;
    border-radius: 6px;
    color: var(--text-soft);
  }

  .alert-message {
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-dark);
  }
</style>
