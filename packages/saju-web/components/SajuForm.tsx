'use client';

import { useState } from 'react';

interface Props {
  onSubmit: (data: Record<string, unknown>) => void;
  loading: boolean;
}

export default function SajuForm({ onSubmit, loading }: Props) {
  const [date, setDate] = useState('2000-01-15');
  const [time, setTime] = useState('17:15');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [calendar, setCalendar] = useState<'Solar' | 'Lunar'>('Solar');
  const [leapMonth, setLeapMonth] = useState(false);
  const [tz, setTz] = useState('Asia/Seoul');
  const [useLmt, setUseLmt] = useState(false);
  const [location, setLocation] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      date,
      time,
      gender,
      calendar,
      leapMonth: calendar === 'Lunar' ? leapMonth : false,
      tz,
      useLmt,
      location: useLmt && location ? location : null,
      longitude: null,
      daewonCount: 10,
      monthYear: null,
      yearStart: null,
      yearCount: 3,
    });
  }

  const inputCls =
    'w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold mb-4">Input</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Time</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Gender</label>
          <select value={gender} onChange={(e) => setGender(e.target.value as 'Male' | 'Female')} className={inputCls}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Calendar</label>
          <select value={calendar} onChange={(e) => setCalendar(e.target.value as 'Solar' | 'Lunar')} className={inputCls}>
            <option value="Solar">Solar</option>
            <option value="Lunar">Lunar</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Timezone</label>
          <input type="text" value={tz} onChange={(e) => setTz(e.target.value)} className={inputCls} placeholder="Asia/Seoul" />
        </div>
        {calendar === 'Lunar' && (
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" id="leapMonth" checked={leapMonth} onChange={(e) => setLeapMonth(e.target.checked)} className="rounded" />
            <label htmlFor="leapMonth" className="text-sm">Leap Month</label>
          </div>
        )}
        <div className="flex items-center gap-2 pt-6">
          <input type="checkbox" id="useLmt" checked={useLmt} onChange={(e) => setUseLmt(e.target.checked)} className="rounded" />
          <label htmlFor="useLmt" className="text-sm">Local Mean Time</label>
        </div>
        {useLmt && (
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="seoul" />
          </div>
        )}
      </div>
      <div className="mt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md text-sm font-medium transition-colors"
        >
          {loading ? 'Calculating...' : 'Calculate'}
        </button>
      </div>
    </form>
  );
}
