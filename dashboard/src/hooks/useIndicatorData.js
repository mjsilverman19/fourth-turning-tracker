import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api';

/**
 * Custom hook for fetching and managing indicator data
 * @param {number} refreshInterval - Refresh interval in milliseconds (default: 5 minutes)
 * @returns {object} Indicator data and loading state
 */
export function useIndicatorData(refreshInterval = 5 * 60 * 1000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/indicators/current`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        setData(result);
        setLastUpdated(new Date());
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch indicators');
      }
    } catch (err) {
      console.error('Error fetching indicator data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval]);

  return {
    indicators: data?.indicators || null,
    secondary: data?.secondary || null,
    loading,
    error,
    lastUpdated,
    refresh: fetchData,
  };
}

/**
 * Custom hook for fetching stage assessment
 * @returns {object} Stage data and loading state
 */
export function useStageAssessment() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/indicators/stage`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        setData(result);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch stage assessment');
      }
    } catch (err) {
      console.error('Error fetching stage assessment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    assessment: data?.assessment || null,
    indicatorValues: data?.indicatorValues || null,
    loading,
    error,
    refresh: fetchData,
  };
}

/**
 * Custom hook for fetching historical data
 * @param {string} indicator - Indicator name
 * @param {string} period - Time period
 * @returns {object} Historical data and loading state
 */
export function useHistoricalData(indicator, period = '2y') {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!indicator) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${API_BASE}/indicators/history/${indicator}?period=${period}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
          setData(result.data || []);
          setError(null);
        } else {
          throw new Error(result.error || 'Failed to fetch historical data');
        }
      } catch (err) {
        console.error('Error fetching historical data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [indicator, period]);

  return { data, loading, error };
}

/**
 * Custom hook for fetching Treasury data
 * @returns {object} Treasury data and loading state
 */
export function useTreasuryData() {
  const [yields, setYields] = useState(null);
  const [fiscal, setFiscal] = useState(null);
  const [auctions, setAuctions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [yieldsRes, fiscalRes, auctionsRes] = await Promise.all([
          fetch(`${API_BASE}/treasury/yields`),
          fetch(`${API_BASE}/treasury/fiscal`),
          fetch(`${API_BASE}/treasury/auctions`),
        ]);

        const [yieldsData, fiscalData, auctionsData] = await Promise.all([
          yieldsRes.json(),
          fiscalRes.json(),
          auctionsRes.json(),
        ]);

        if (yieldsData.success) setYields(yieldsData);
        if (fiscalData.success) setFiscal(fiscalData);
        if (auctionsData.success) setAuctions(auctionsData);

        setError(null);
      } catch (err) {
        console.error('Error fetching Treasury data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { yields, fiscal, auctions, loading, error };
}

/**
 * Custom hook for fetching foreign holdings data
 * @returns {object} Holdings data and loading state
 */
export function useForeignHoldings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_BASE}/holdings/foreign`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
          setData(result);
          setError(null);
        } else {
          throw new Error(result.error || 'Failed to fetch holdings data');
        }
      } catch (err) {
        console.error('Error fetching foreign holdings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}

/**
 * Custom hook for fetching gold data
 * @returns {object} Gold data and loading state
 */
export function useGoldData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_BASE}/holdings/gold`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
          setData(result);
          setError(null);
        } else {
          throw new Error(result.error || 'Failed to fetch gold data');
        }
      } catch (err) {
        console.error('Error fetching gold data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}

/**
 * Custom hook for fetching TIPS breakevens
 * @returns {object} Breakeven data and loading state
 */
export function useBreakevens() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_BASE}/indicators/breakevens`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success) {
          setData(result.breakevens);
          setError(null);
        } else {
          throw new Error(result.error || 'Failed to fetch breakevens');
        }
      } catch (err) {
        console.error('Error fetching breakevens:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}

export default useIndicatorData;
