'use client';

import { useState } from 'react';
import SajuForm from '@/components/SajuForm';
import ResultDashboard from '@/components/ResultDashboard';
import type { SajuResult } from 'saju-lib';

export default function Home() {
  const [result, setResult] = useState<SajuResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: Record<string, unknown>) {
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
  }

  return (
    <div className="space-y-6">
      <SajuForm onSubmit={handleSubmit} loading={loading} />
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {result && <ResultDashboard result={result} />}
    </div>
  );
}
