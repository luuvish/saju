'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import SajuForm from '@/components/SajuForm';
import ResultDashboard from '@/components/ResultDashboard';
import type { SajuResult } from 'saju-lib';

export default function Home() {
  const [result, setResult] = useState<SajuResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const initialLoad = useRef(true);

  const handleSubmit = useCallback(async (formData: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Calculation failed');
        setResult(null);
      } else {
        setResult(data as SajuResult);
      }
    } catch {
      setError('Network error');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;
      handleSubmit({
        date: '2000-01-15',
        time: '12:00',
        gender: 'Male',
        calendar: 'Solar',
        leapMonth: false,
        tz: 'Asia/Seoul',
        useLmt: false,
        location: 'seoul',
        longitude: null,
        daewonCount: 10,
        monthYear: null,
        yearStart: null,
        yearCount: 10,
      });
    }
  }, [handleSubmit]);

  return (
    <>
      <SajuForm onSubmit={handleSubmit} loading={loading} />
      {loading && (
        <div className="loading-indicator">
          <div className="spinner" />
          <span>Calculating...</span>
        </div>
      )}
      {error && (
        <div className="error-message">
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}
      {result && !loading && <ResultDashboard result={result} />}
    </>
  );
}
