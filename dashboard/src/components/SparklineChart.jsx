import React, { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip
);

/**
 * Compact sparkline chart for showing trends
 */
function SparklineChart({
  data,
  color = '#3b82f6',
  fillColor = 'rgba(59, 130, 246, 0.1)',
  height = 40,
  showPoints = false,
  thresholdLine = null,
}) {
  if (!data || data.length === 0) {
    return (
      <div className="sparkline-empty" style={{ height }}>
        No data
      </div>
    );
  }

  // Prepare chart data (most recent last)
  const sortedData = [...data]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-100); // Last 100 points for sparkline

  const labels = sortedData.map(d => d.date);
  const values = sortedData.map(d => d.value ?? d.ratio ?? d.spread);

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        borderColor: color,
        backgroundColor: fillColor,
        fill: true,
        tension: 0.3,
        pointRadius: showPoints ? 2 : 0,
        pointHoverRadius: 4,
        borderWidth: 1.5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        callbacks: {
          title: (items) => {
            if (items.length > 0) {
              return new Date(items[0].label).toLocaleDateString();
            }
            return '';
          },
          label: (item) => {
            return `Value: ${item.raw?.toFixed(2) ?? 'N/A'}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        display: false,
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  // Add threshold line if provided
  if (thresholdLine !== null) {
    chartData.datasets.push({
      data: Array(values.length).fill(thresholdLine),
      borderColor: 'rgba(239, 68, 68, 0.5)',
      borderWidth: 1,
      borderDash: [4, 4],
      pointRadius: 0,
      fill: false,
    });
  }

  return (
    <div className="sparkline-chart" style={{ height }}>
      <Line data={chartData} options={options} />
    </div>
  );
}

export default SparklineChart;
