import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api';

/**
 * Custom hook for managing alerts
 * @param {object} options - Hook options
 * @returns {object} Alert data and functions
 */
export function useAlerts(options = {}) {
  const { pollInterval = 60000, limit = 50 } = options;

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/alerts?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        setAlerts(result.alerts);
        setConfig(result.config);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch alerts');
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchAlerts();

    if (pollInterval > 0) {
      const interval = setInterval(fetchAlerts, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchAlerts, pollInterval]);

  const clearAlerts = useCallback(async (before = null) => {
    try {
      const url = before
        ? `${API_BASE}/alerts?before=${before}`
        : `${API_BASE}/alerts`;

      const response = await fetch(url, { method: 'DELETE' });
      const result = await response.json();

      if (result.success) {
        await fetchAlerts();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error clearing alerts:', err);
      return false;
    }
  }, [fetchAlerts]);

  const testAlert = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/alerts/test`, { method: 'POST' });
      const result = await response.json();
      return result;
    } catch (err) {
      console.error('Error sending test alert:', err);
      return { success: false, error: err.message };
    }
  }, []);

  const updateConfig = useCallback(async (newConfig) => {
    try {
      const response = await fetch(`${API_BASE}/alerts/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      const result = await response.json();

      if (result.success) {
        setConfig(result.config);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error updating alert config:', err);
      return false;
    }
  }, []);

  return {
    alerts,
    loading,
    error,
    config,
    refresh: fetchAlerts,
    clearAlerts,
    testAlert,
    updateConfig,
  };
}

/**
 * Get severity level for sorting
 * @param {string} zone - Zone name
 * @returns {number} Severity level
 */
export function getAlertSeverity(zone) {
  const severities = {
    CRITICAL: 3,
    DANGER: 2,
    WARNING: 1,
    NORMAL: 0,
  };
  return severities[zone] || 0;
}

/**
 * Sort alerts by severity and time
 * @param {Array} alerts - Array of alerts
 * @returns {Array} Sorted alerts
 */
export function sortAlerts(alerts) {
  return [...alerts].sort((a, b) => {
    // First by severity (highest first)
    const severityDiff = getAlertSeverity(b.newZone || b.zone) -
                         getAlertSeverity(a.newZone || a.zone);
    if (severityDiff !== 0) return severityDiff;

    // Then by time (newest first)
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
}

/**
 * Filter alerts by type
 * @param {Array} alerts - Array of alerts
 * @param {string[]} types - Alert types to include
 * @returns {Array} Filtered alerts
 */
export function filterAlertsByType(alerts, types) {
  if (!types || types.length === 0) return alerts;
  return alerts.filter(a => types.includes(a.type));
}

/**
 * Get unread alerts (newer than given time)
 * @param {Array} alerts - Array of alerts
 * @param {Date|string} since - Time threshold
 * @returns {Array} Unread alerts
 */
export function getUnreadAlerts(alerts, since) {
  const sinceDate = new Date(since);
  return alerts.filter(a => new Date(a.timestamp) > sinceDate);
}

export default useAlerts;
