<script>
    import GlassCard from '$lib/components/GlassCard.svelte';
    import { onMount } from 'svelte';

    let { totalSaved = 0 } = $props();

    let displayValue = $state(0);

    onMount(() => {
        if (totalSaved <= 0) return;
        const duration = 1200;
        const steps = 40;
        const increment = totalSaved / steps;
        let current = 0;
        const interval = setInterval(() => {
            current += increment;
            if (current >= totalSaved) {
                displayValue = totalSaved;
                clearInterval(interval);
            } else {
                displayValue = Math.round(current * 100) / 100;
            }
        }, duration / steps);

        return () => clearInterval(interval);
    });
</script>

<GlassCard style="background: linear-gradient(135deg, rgba(232,245,233,0.8), rgba(200,230,201,0.8));">
    <div class="savings-content">
        <div class="savings-icon">
            <i class="ri-leaf-line"></i>
        </div>
        <div class="savings-amount">{displayValue.toFixed(2)}€</div>
        <div class="savings-label">Total Saved</div>
    </div>
</GlassCard>

<style>
    .savings-content { text-align: center; }
    .savings-icon {
        width: 50px; height: 50px; margin: 0 auto 12px;
        background: rgba(148, 180, 159, 0.2); border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 24px; color: var(--accent-sage);
    }
    .savings-amount {
        font-size: 36px; font-weight: 700; color: var(--accent-sage);
        line-height: 1;
    }
    .savings-label {
        font-size: 12px; font-weight: 600; color: var(--text-soft);
        text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;
    }
</style>
