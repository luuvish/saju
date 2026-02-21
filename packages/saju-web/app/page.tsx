'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import SajuForm from '@/components/SajuForm';
import ResultDashboard from '@/components/ResultDashboard';
import { calculate, type SajuRequest, type SajuResult, type Lang } from 'saju-lib';

export default function Home() {
  const [result, setResult] = useState<SajuResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>('Ko');
  const initialLoad = useRef(true);

  const handleSubmit = useCallback(async (formData: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    const formLang = formData.lang === 'en' ? 'En' : 'Ko';
    setLang(formLang as Lang);
    try {
      const req = {
        date: formData.date,
        time: formData.time,
        calendar: formData.calendar ?? 'Solar',
        leapMonth: formData.leapMonth ?? false,
        gender: formData.gender ?? 'Male',
        tz: formData.tz ?? 'Asia/Seoul',
        useLmt: formData.useLmt ?? false,
        longitude: formData.longitude ?? null,
        location: formData.location ?? null,
        daewonCount: formData.daewonCount ?? 10,
        monthYear: formData.monthYear ?? null,
        yearStart: formData.yearStart ?? null,
        yearCount: formData.yearCount ?? 3,
      } as SajuRequest;
      const data = calculate(req);
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Calculation failed';
      setError(message);
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
        useLmt: true,
        location: 'seoul',
        longitude: null,
        daewonCount: 10,
        monthYear: null,
        yearStart: null,
        yearCount: 10,
        lang: 'ko',
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
      {result && !loading && <ResultDashboard result={result} lang={lang} />}
    </>
  );
}
