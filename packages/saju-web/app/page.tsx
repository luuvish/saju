'use client';

import { useState, useCallback } from 'react';
import SajuForm from '@/components/SajuForm';
import type { SajuFormData } from '@/components/SajuForm';
import ResultDashboard from '@/components/ResultDashboard';
import { calculate, type SajuResult, type SajuRequest, type Lang } from 'saju-lib';

export default function Home() {
  const [result, setResult] = useState<SajuResult | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<Lang>('Ko');
  // setState 함수들은 React가 보장하는 안정적 참조이므로 deps가 비어 있어도 안전하다
  const handleSubmit = useCallback((formData: SajuFormData) => {
    setLoading(true);
    setError(null);
    const formLang = formData.lang === 'en' ? 'En' : 'Ko';
    setLang(formLang as Lang);
    setName(formData.name ?? '');
    try {
      const req: SajuRequest = {
        date: formData.date,
        time: formData.time,
        calendar: (formData.calendar as SajuRequest['calendar']) ?? 'Solar',
        leapMonth: formData.leapMonth ?? false,
        gender: (formData.gender as SajuRequest['gender']) ?? 'Male',
        tz: formData.tz ?? 'Asia/Seoul',
        useLmt: formData.useLmt ?? false,
        longitude: formData.longitude ?? null,
        location: formData.location ?? null,
        daewonCount: formData.daewonCount ?? 10,
        monthYear: formData.monthYear ?? null,
        yearStart: formData.yearStart ?? null,
        yearCount: formData.yearCount ?? 3,
      };
      setResult(calculate(req));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '계산에 실패했습니다';
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);


  return (
    <>
      <SajuForm onSubmit={handleSubmit} loading={loading} />
      {loading && (
        <div className="loading-indicator">
          <div className="spinner" />
          <span>계산 중...</span>
        </div>
      )}
      {error && (
        <div className="error-message">
          <h3>오류</h3>
          <p>{error}</p>
        </div>
      )}
      {result && !loading && <ResultDashboard result={result} lang={lang} name={name} />}
    </>
  );
}
