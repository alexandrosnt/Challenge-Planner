<script>
  let { style = '', children } = $props();
</script>

<div class="glass-card" {style}>
  {@render children()}
</div>

<style>
  .glass-card {
    background: var(--glass-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-l);
    box-shadow: var(--glass-shadow);
    padding: 24px;
    margin-bottom: 24px;
    transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .glass-card:active {
    transform: scale(0.98);
  }
</style>
