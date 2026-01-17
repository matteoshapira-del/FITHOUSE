/* charts.js - Chart.js Wrapper */
import Chart from 'chart.js/auto';
import { calculations } from './calculations';

let chartInstance = null;

export const charts = {
    init(canvasId) {
        const ctx = document.getElementById(canvasId).getContext('2d');

        // Gradient for deficit area
        // We'll init basic config, data will be updated dynamically
        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Goal Weight (Trajectory)',
                        data: [],
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                        borderDash: [5, 5],
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        tension: 0
                    },
                    {
                        label: 'Actual Weight',
                        data: [],
                        borderColor: '#00e5ff', // Secondary Cyan
                        backgroundColor: '#00e5ff',
                        borderWidth: 3,
                        pointRadius: 4,
                        tension: 0.1,
                        spanGaps: true
                    },
                    {
                        label: 'Projected (Based on Logs)',
                        data: [],
                        borderColor: '#00ff9d', // Primary Green
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.1,
                        spanGaps: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#888' }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(1) + ' kg';
                                }
                                return label;
                            },
                            afterBody: function (tooltipItems) {
                                // We want to show Deficit info if we are hovering over a processed day
                                // We stored reference to logs/profile in the chart instance options during update
                                const chart = tooltipItems[0].chart;
                                const customData = chart.config.options.customData;

                                if (!customData || !customData.logs) return [];

                                const dataIndex = tooltipItems[0].dataIndex;
                                const dateLabel = chart.data.labels[dataIndex];

                                const log = customData.logs.find(l => l.date === dateLabel);

                                if (log) {
                                    // Calculate Deficit
                                    // TDEE based on log weight or current? Ideally log weight.
                                    // If log.weight is null, fallback?
                                    const w = log.weight || customData.profile.currentWeight;
                                    const tdee = calculations.calculateTDEE(w, customData.profile.height, customData.profile.age, customData.profile.gender);
                                    const cals = log.totalPoints * 100;
                                    const deficit = tdee - cals;

                                    let sentiment = '';
                                    // Simple indicator emojis
                                    if (deficit >= 500) sentiment = '🟢 Excellent'; // Green
                                    else if (deficit >= 300) sentiment = '🟡 Good'; // Yellow
                                    else if (deficit >= 0) sentiment = '🟠 Fair'; // Orange
                                    else sentiment = '🔴 Surplus'; // Red

                                    return [
                                        '', // Spacer
                                        `Cals: ${cals}`,
                                        `TDEE: ${tdee}`,
                                        `Deficit: ${deficit} (${sentiment})`
                                    ];
                                }
                                return [];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#666' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    },
                    y: {
                        ticks: { color: '#666' },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    },

    updateGraph(logs, profile) {
        if (!chartInstance) return;

        // Generate dates from Start Date to Target Date
        const start = new Date(profile.startDate);
        const end = new Date(profile.targetDate);
        const labels = [];
        const goalData = [];

        // We loop day by day to build the goal line
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            labels.push(dateStr);
            goalData.push(calculations.getLinearGoalWeight(
                profile.startDate, profile.baseWeight,
                profile.targetDate, profile.targetWeight,
                dateStr
            ));
        }

        // Map Actual Logs to these labels
        // We create a sparse array matching the labels
        const weightData = labels.map(date => {
            const log = logs.find(l => l.date === date);
            return log ? log.weight : null;
        });

        // Extrapolation based on ACTUAL Deficit
        // Find average daily deficit so far
        const validLogs = logs.filter(l => l.date >= profile.startDate);
        const totalDeficit = validLogs.reduce((sum, l) => {
            const tdee = calculations.calculateTDEE(profile.currentWeight, profile.height, profile.age, profile.gender);
            const consumed = l.totalPoints * 100; // 1 point = 100 cal
            return sum + (tdee - consumed);
        }, 0);

        // Simple average deficit per day since start
        const daysElapsed = (new Date() - start) / (1000 * 60 * 60 * 24);
        const avgDeficit = daysElapsed > 0 ? totalDeficit / daysElapsed : 0;

        // Project from last known weight
        const lastLog = validLogs[validLogs.length - 1];
        const projectionStartWeight = lastLog ? lastLog.weight : profile.baseWeight;
        const projectionStartIndex = labels.indexOf(lastLog ? lastLog.date : profile.startDate);

        const projectedData = labels.map((date, idx) => {
            if (idx < projectionStartIndex) return null;
            const daysFromProjStart = idx - projectionStartIndex;
            return calculations.calculateProjectedWeight(projectionStartWeight, avgDeficit, daysFromProjStart);
        });

        chartInstance.data.labels = labels;
        chartInstance.data.datasets[0].data = goalData;
        chartInstance.data.datasets[1].data = weightData;
        chartInstance.data.datasets[2].data = projectedData;

        // Store data for tooltip
        chartInstance.options.customData = { logs, profile };

        chartInstance.update();
    }
};
