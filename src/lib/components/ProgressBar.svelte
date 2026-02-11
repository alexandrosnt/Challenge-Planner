<script>
	let { value, height = '10px' } = $props();
</script>

<div class="progress-container" style:height={height}>
	<div class="progress-fill" style:width="{value}%"></div>
</div>

<style>
	.progress-container {
		position: relative;
		background: #f0f0f0;
		border-radius: 10px;
		overflow: hidden;
		margin-top: 10px;
	}

	.progress-fill {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		background: var(--primary-gradient);
		border-radius: 10px;
		box-shadow: 0 0 10px rgba(255, 107, 129, 0.4);
	}
</style>
