<script>
  import GlassCard from '$lib/components/GlassCard.svelte';
  import { t } from '$lib/i18n/index.svelte';

  let { categoryName, spent, limit } = $props();

  let remaining = $derived(limit - spent);
</script>

<GlassCard style="background: linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,240,240,0.8));">
  <div class="alert-header">
    <div class="alert-label">
      <i class="ri-alert-line"></i>
      <span>{t.budgetAlert.lowBuyAlert}</span>
    </div>
    <span class="category-badge">{categoryName}</span>
  </div>
  <p class="alert-message">
    {t.budgetAlert.youveSpent} <strong>{spent}€</strong> {t.budgetAlert.ofYourLimit} {limit}€ {t.budgetAlert.limit}
    {#if remaining <= 5}
      {t.budgetAlert.maybeWait}
    {:else}
      {t.budgetAlert.youHave} <strong>{remaining}€</strong> {t.budgetAlert.left}
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
