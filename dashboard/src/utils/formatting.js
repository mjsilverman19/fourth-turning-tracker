/**
 * Format a number with specified decimal places
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted value
 */
export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(decimals);
}

/**
 * Format a value in basis points
 * @param {number} value - Value in basis points
 * @returns {string} Formatted value with 'bps' suffix
 */
export function formatBasisPoints(value) {
  if (value === null || value === undefined) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)} bps`;
}

/**
 * Format a percentage value
 * @param {number} value - Value as decimal (0.15 = 15%)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format a large currency value
 * @param {number} value - Value in dollars
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value) {
  if (value === null || value === undefined) return 'N/A';

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1e12) {
    return `${sign}$${(absValue / 1e12).toFixed(2)}T`;
  }
  if (absValue >= 1e9) {
    return `${sign}$${(absValue / 1e9).toFixed(2)}B`;
  }
  if (absValue >= 1e6) {
    return `${sign}$${(absValue / 1e6).toFixed(2)}M`;
  }
  return `${sign}$${absValue.toLocaleString()}`;
}

/**
 * Format a date string
 * @param {string|Date} date - Date to format
 * @param {string} format - Format type ('short', 'long', 'relative')
 * @returns {string} Formatted date
 */
export function formatDate(date, format = 'short') {
  if (!date) return 'N/A';

  const d = new Date(date);

  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'long':
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    case 'relative':
      return getRelativeTime(d);
    case 'iso':
      return d.toISOString().split('T')[0];
    default:
      return d.toLocaleDateString();
  }
}

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param {Date} date - Date to compare
 * @returns {string} Relative time string
 */
export function getRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return formatDate(date, 'short');
}

/**
 * Format trend direction with arrow
 * @param {number} value - Change value
 * @param {boolean} invertedGood - True if negative is good
 * @returns {object} Object with arrow, color, and text
 */
export function formatTrend(value, invertedGood = false) {
  if (value === null || value === undefined) {
    return { arrow: '', color: 'gray', text: 'N/A' };
  }

  const isUp = value > 0;
  const isGood = invertedGood ? !isUp : isUp;

  return {
    arrow: isUp ? '↑' : value < 0 ? '↓' : '→',
    color: isGood ? 'green' : value === 0 ? 'gray' : 'red',
    text: formatNumber(Math.abs(value), 1),
  };
}

/**
 * Get zone color class
 * @param {string} zone - Zone name (NORMAL, WARNING, DANGER, CRITICAL)
 * @returns {string} CSS class name
 */
export function getZoneColorClass(zone) {
  const classes = {
    NORMAL: 'zone-normal',
    WARNING: 'zone-warning',
    DANGER: 'zone-danger',
    CRITICAL: 'zone-critical',
    UNKNOWN: 'zone-unknown',
  };
  return classes[zone] || classes.UNKNOWN;
}

/**
 * Get zone background color
 * @param {string} zone - Zone name
 * @returns {string} Hex color code
 */
export function getZoneColor(zone) {
  const colors = {
    NORMAL: '#10b981',
    WARNING: '#f59e0b',
    DANGER: '#ef4444',
    CRITICAL: '#7c2d12',
    UNKNOWN: '#6b7280',
  };
  return colors[zone] || colors.UNKNOWN;
}

/**
 * Get stage color
 * @param {number} stage - Stage number (0-4)
 * @returns {string} Hex color code
 */
export function getStageColor(stage) {
  const colors = {
    0: '#10b981', // Pre-crisis - green
    1: '#f59e0b', // Stage 1 - amber
    2: '#ef4444', // Stage 2 - red
    3: '#7c2d12', // Stage 3 - dark red
    4: '#1f2937', // Stage 4 - near black
  };
  return colors[stage] || colors[0];
}

/**
 * Format indicator value based on config
 * @param {number} value - Value to format
 * @param {object} config - Indicator configuration
 * @returns {string} Formatted value
 */
export function formatIndicatorValue(value, config) {
  if (value === null || value === undefined) return 'N/A';

  const displayValue = config.displayMultiplier
    ? value * config.displayMultiplier
    : value;

  const formatted = formatNumber(displayValue, 1);
  const unit = config.unit || '';

  return `${formatted}${unit}`;
}

/**
 * Format gauge position as percentage
 * @param {number} value - Current value
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Position as percentage (0-100)
 */
export function calculateGaugePosition(value, min, max) {
  if (value === null || value === undefined) return 50;
  const clamped = Math.max(min, Math.min(max, value));
  return ((clamped - min) / (max - min)) * 100;
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
