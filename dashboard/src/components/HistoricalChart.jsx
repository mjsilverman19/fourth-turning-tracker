import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

/**
 * Historical chart component for long-term trend visualization
 */
function HistoricalChart({
  data,
  title,
  color = '#3b82f6',
  yAxisLabel,
  thresholdLines = [],
  annotations = [],
  height = 300,
}) {
  if (!data || data.length === 0) {
    return (
      <div className="historical-chart historical-chart-empty" style={{ height }}>
        <h4>{title}</h4>
        <div className="chart-empty-message">No historical data available</div>
      </div>
    );
  }

  // Sort data chronologically
  const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

  const chartData = {
    labels: sortedData.map(d => new Date(d.date)),
    datasets: [
      {
        label: title,
        data: sortedData.map(d => ({
          x: new Date(d.date),
          y: d.value ?? d.ratio ?? d.spread,
        })),
        borderColor: color,
        backgroundColor: `${color}20`,
        fill: true,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      },
      // Add threshold lines
      ...thresholdLines.map((threshold, i) => ({
        label: threshold.label,
        data: sortedData.map(d => ({
          x: new Date(d.date),
          y: threshold.value,
        })),
        borderColor: threshold.color || '#ef4444',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
      })),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: thresholdLines.length > 0,
        position: 'top',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: { size: 11 },
        },
      },
      title: {
        display: true,
        text: title,
        font: { size: 14, weight: '600' },
        padding: { bottom: 10 },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          title: (items) => {
            if (items.length > 0) {
              return new Date(items[0].raw.x).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });
            }
            return '';
          },
          label: (item) => {
            const value = item.raw.y;
            return `${item.dataset.label}: ${value?.toFixed(2) ?? 'N/A'}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'month',
          displayFormats: {
            month: 'MMM yyyy',
          },
        },
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 12,
          font: { size: 10 },
        },
      },
      y: {
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel,
          font: { size: 11 },
        },
        grid: {
          color: '#e5e7eb',
        },
        ticks: {
          font: { size: 10 },
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <div className="historical-chart" style={{ height }}>
      <Line data={chartData} options={options} />
    </div>
  );
}

/**
 * Comparison chart showing multiple series
 */
export function ComparisonChart({
  datasets,
  title,
  yAxisLabel,
  height = 300,
}) {
  if (!datasets || datasets.length === 0) {
    return (
      <div className="historical-chart historical-chart-empty" style={{ height }}>
        <h4>{title}</h4>
        <div className="chart-empty-message">No data available</div>
      </div>
    );
  }

  const colors = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Purple
  ];

  const chartData = {
    datasets: datasets.map((ds, i) => {
      const sortedData = [...(ds.data || [])].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      return {
        label: ds.label,
        data: sortedData.map(d => ({
          x: new Date(d.date),
          y: d.value ?? d.ratio ?? d.spread,
        })),
        borderColor: ds.color || colors[i % colors.length],
        backgroundColor: 'transparent',
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
      };
    }),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: { size: 11 },
        },
      },
      title: {
        display: true,
        text: title,
        font: { size: 14, weight: '600' },
        padding: { bottom: 10 },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'month',
          displayFormats: {
            month: 'MMM yyyy',
          },
        },
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 12,
          font: { size: 10 },
        },
      },
      y: {
        title: {
          display: !!yAxisLabel,
          text: yAxisLabel,
          font: { size: 11 },
        },
        grid: {
          color: '#e5e7eb',
        },
        ticks: {
          font: { size: 10 },
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <div className="historical-chart" style={{ height }}>
      <Line data={chartData} options={options} />
    </div>
  );
}

export default HistoricalChart;
