'use client';

import { useState, useEffect, useRef } from 'react';
import { location as loc } from 'saju-lib';

interface Props {
  onSubmit: (data: Record<string, unknown>) => void;
  loading: boolean;
}

export default function SajuForm({ onSubmit, loading }: Props) {
  const [date, setDate] = useState('2000-01-15');
  const [time, setTime] = useState('12:00');
  const [gender, setGender] = useState('Male');
  const [calendar, setCalendar] = useState('Solar');
  const [leapMonth, setLeapMonth] = useState(false);
  const [tz, setTz] = useState('Asia/Seoul');
  const [locationVal, setLocationVal] = useState('seoul');
  const [lang, setLang] = useState('ko');
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
      return;
    }
    triggerUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, time, gender, calendar, leapMonth, tz, locationVal, lang]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(buildPayload()); }}>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="date">Date</label>
          <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="time">Time</label>
          <input type="time" id="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="calendar">Calendar</label>
          <select id="calendar" value={calendar} onChange={(e) => setCalendar(e.target.value)}>
            <option value="Solar">Solar</option>
            <option value="Lunar">Lunar</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="gender">Gender</label>
          <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="tz">Timezone</label>
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
          <label htmlFor="location">Location (LMT)</label>
          <select id="location" value={locationVal} onChange={(e) => setLocationVal(e.target.value)}>
            <option value="">None</option>
            {locations.map((l) => (
              <option key={l.key} value={l.key}>{l.display}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="lang">Language</label>
          <select id="lang" value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="ko">Korean</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="form-group checkbox-group">
          <label className="checkbox-control">
            <input type="checkbox" checked={leapMonth} onChange={(e) => setLeapMonth(e.target.checked)} />
            Leap Month
          </label>
        </div>
      </div>
    </form>
  );
}
