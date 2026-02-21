/**
 * @fileoverview 사주 입력 폼 컴포넌트
 *
 * 생년월일·시간·성별·역법·시간대·지역 등 사주 계산에 필요한
 * 입력을 받는 폼. 필드 변경 시 자동으로 디바운스 후 계산을 트리거한다.
 * localStorage에 최근 입력값을 저장하여 재방문 시 복원한다.
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { location as loc } from 'saju-lib';

const STORAGE_KEY = 'saju-form-state';

/** 자동 제출 디바운스 시간 (밀리초) */
const DEBOUNCE_MS = 300;

/** localStorage에 저장되는 폼 상태 */
interface SavedState {
  name?: string;
  date?: string;
  time?: string;
  gender?: string;
  calendar?: string;
  leapMonth?: boolean;
  tz?: string;
  locationVal?: string;
}

/** localStorage에서 이전 폼 상태를 로드한다 */
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
  const [name, setName] = useState(saved.current?.name ?? '');
  const [date, setDate] = useState(saved.current?.date ?? '2000-01-15');
  const [time, setTime] = useState(saved.current?.time ?? '12:00');
  const [gender, setGender] = useState(saved.current?.gender ?? 'Male');
  const [calendar, setCalendar] = useState(saved.current?.calendar ?? 'Solar');
  const [leapMonth, setLeapMonth] = useState(saved.current?.leapMonth ?? false);
  const [tz, setTz] = useState(saved.current?.tz ?? 'Asia/Seoul');
  const [locationVal, setLocationVal] = useState(saved.current?.locationVal ?? 'seoul');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const locations = loc.locationList();

  /** 현재 폼 상태를 API 요청 페이로드로 변환한다 */
  function buildPayload() {
    const useLmt = !!locationVal;
    return {
      name, date, time, gender, calendar,
      leapMonth: calendar === 'Lunar' ? leapMonth : false,
      tz,
      useLmt,
      location: useLmt ? locationVal : null,
      longitude: null,
      daewonCount: 10,
      monthYear: null,
      yearStart: null,
      yearCount: 10,
      lang: 'ko',
    };
  }

  /** 디바운스 후 자동 제출 */
  function triggerUpdate() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSubmit(buildPayload());
    }, DEBOUNCE_MS);
  }

  // 필드 변경 시 자동 제출 + localStorage 저장
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      onSubmit(buildPayload());
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, date, time, gender, calendar, leapMonth, tz, locationVal }));
    } catch { /* quota exceeded or private browsing — ignore */ }
    triggerUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, date, time, gender, calendar, leapMonth, tz, locationVal]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(buildPayload()); }}>
      <div className="form-grid form-primary">
        <div className="form-group">
          <label htmlFor="name">이름</label>
          <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="이름을 입력하세요" />
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
      </div>
      <hr className="form-divider" />
      <div className="form-grid form-saju">
        <div className="form-group">
          <label htmlFor="calendar">역법(曆法)</label>
          <select id="calendar" value={calendar} onChange={(e) => setCalendar(e.target.value)}>
            <option value="Solar">양력(陽曆)</option>
            <option value="Lunar">음력(陰曆)</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="leapMonth">윤달(閏月)</label>
          <label className="checkbox-control">
            <input type="checkbox" id="leapMonth" checked={leapMonth} onChange={(e) => setLeapMonth(e.target.checked)} />
          </label>
        </div>
        <div className="form-group">
          <label htmlFor="date">날짜</label>
          <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="time">시간</label>
          <input type="time" id="time" value={time} onChange={(e) => setTime(e.target.value)} required />
        </div>
      </div>
    </form>
  );
}
