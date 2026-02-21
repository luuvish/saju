'use client';

import { useState, useEffect, useRef } from 'react';
import { location as loc } from 'saju-lib';

const STORAGE_KEY = 'saju-form-state';

interface SavedState {
  date?: string;
  time?: string;
  gender?: string;
  calendar?: string;
  leapMonth?: boolean;
  tz?: string;
  locationVal?: string;
  lang?: string;
}

function loadSavedState(): SavedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface Props {
  onSubmit: (data: Record<string, unknown>) => void;
  loading: boolean;
}

export default function SajuForm({ onSubmit, loading }: Props) {
  const saved = useRef(loadSavedState());
  const [date, setDate] = useState(saved.current?.date ?? '2000-01-15');
  const [time, setTime] = useState(saved.current?.time ?? '12:00');
  const [gender, setGender] = useState(saved.current?.gender ?? 'Male');
  const [calendar, setCalendar] = useState(saved.current?.calendar ?? 'Solar');
  const [leapMonth, setLeapMonth] = useState(saved.current?.leapMonth ?? false);
  const [tz, setTz] = useState(saved.current?.tz ?? 'Asia/Seoul');
  const [locationVal, setLocationVal] = useState(saved.current?.locationVal ?? 'seoul');
  const [lang, setLang] = useState(saved.current?.lang ?? 'ko');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const locations = loc.locationList();

  function buildPayload() {
    const useLmt = !!locationVal;
    return {
      date, time, gender, calendar,
      leapMonth: calendar === 'Lunar' ? leapMonth : false,
      tz,
      useLmt,
      location: useLmt ? locationVal : null,
      longitude: null,
      daewonCount: 10,
      monthYear: null,
      yearStart: null,
      yearCount: 10,
      lang,
    };
  }

  function triggerUpdate() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSubmit(buildPayload());
    }, 300);
  }

  // Auto-submit on any field change (like htmx version)
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      // Always submit on mount so restored values are calculated
      onSubmit(buildPayload());
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date, time, gender, calendar, leapMonth, tz, locationVal, lang }));
    } catch { /* quota exceeded or private browsing — ignore */ }
    triggerUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, time, gender, calendar, leapMonth, tz, locationVal, lang]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(buildPayload()); }}>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="date">날짜</label>
          <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="time">시간</label>
          <input type="time" id="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="calendar">역법(曆法)</label>
          <select id="calendar" value={calendar} onChange={(e) => setCalendar(e.target.value)}>
            <option value="Solar">양력(陽曆)</option>
            <option value="Lunar">음력(陰曆)</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="gender">성별</label>
          <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="Male">남(男)</option>
            <option value="Female">여(女)</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="tz">시간대</label>
          <select id="tz" value={tz} onChange={(e) => setTz(e.target.value)}>
            <option value="Asia/Seoul">Asia/Seoul (+09:00)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (+09:00)</option>
            <option value="Asia/Shanghai">Asia/Shanghai (+08:00)</option>
            <option value="America/New_York">America/New_York (-05:00)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (-08:00)</option>
            <option value="Europe/London">Europe/London (+00:00)</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="location">지역 (평태양시)</label>
          <select id="location" value={locationVal} onChange={(e) => setLocationVal(e.target.value)}>
            <option value="">없음</option>
            {locations.map((l) => (
              <option key={l.key} value={l.key}>{l.display}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="lang">언어</label>
          <select id="lang" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="ko">한국어</option>
            <option value="en">영어</option>
          </select>
        </div>
        <div className="form-group checkbox-group">
          <label className="checkbox-control">
            <input type="checkbox" checked={leapMonth} onChange={(e) => setLeapMonth(e.target.checked)} />
            윤달(閏月)
          </label>
        </div>
      </div>
    </form>
  );
}
