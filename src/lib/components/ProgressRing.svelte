<script>
    let { value = 0, size = 60, strokeWidth = 5, color = 'var(--accent-pink)' } = $props();

    let radius = $derived((size - strokeWidth) / 2);
    let circumference = $derived(2 * Math.PI * radius);
    let offset = $derived(circumference - (Math.min(value, 100) / 100) * circumference);
</script>

<svg width={size} height={size} class="progress-ring">
    <circle
        class="ring-bg"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke-width={strokeWidth}
    />
    <circle
        class="ring-fill"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke-width={strokeWidth}
        stroke={color}
        stroke-dasharray={circumference}
        stroke-dashoffset={offset}
    />
    <text x="50%" y="50%" class="ring-text" dominant-baseline="central" text-anchor="middle">
        {Math.round(value)}%
    </text>
</svg>

<style>
    .progress-ring {
        transform: rotate(-90deg);
    }
    .ring-bg {
        fill: none;
        stroke: #f0f0f0;
    }
    .ring-fill {
        fill: none;
        stroke-linecap: round;
        transition: stroke-dashoffset 0.6s ease;
    }
    .ring-text {
        transform: rotate(90deg);
        transform-origin: center;
        font-size: 12px;
        font-weight: 700;
        fill: var(--text-dark);
        font-family: 'Poppins', sans-serif;
    }
</style>
