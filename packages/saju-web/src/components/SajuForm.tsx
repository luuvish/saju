/**
 * @fileoverview 사주 입력 폼 컴포넌트
 *
 * 생년월일·시간·성별·역법·시간대·지역 등 사주 계산에 필요한
 * 입력을 받는 폼. 입력 변경 시 자동으로 재계산한다.
 * localStorage에 최근 입력값을 저장하여 재방문 시 복원한다.
 */


import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { location as loc } from 'saju-lib';
import type { FieldErrors } from './formValidation';
import {
  runValidatedSubmission,
  scheduleDebouncedSubmit,
} from './sajuFormFlow';

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

/** 폼에서 제출되는 데이터의 타입 */
export interface SajuFormData {
  name: string
  date: string
  time: string
  gender: string
  calendar: string
  leapMonth: boolean
  tz: string
  useLmt: boolean
  location: string | null
  longitude: number | null
  daewonCount: number
  monthYear: number | null
  yearStart: number | null
  yearCount: number
  lang: string
}

interface Props {
  onSubmit: (data: SajuFormData) => void;
  onInvalid: (message: string | null) => void;
}

export default function SajuForm({ onSubmit, onInvalid }: Props) {
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const locations = useMemo(() => loc.locationList(), []);

  /** 현재 폼 상태를 API 요청 페이로드로 변환한다 */
  const buildPayload = useCallback(() => {
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
  }, [name, date, time, gender, calendar, leapMonth, tz, locationVal]);

  const submitIfValid = useCallback(() => {
    const payload = buildPayload();
    const validation = runValidatedSubmission(payload, onInvalid, onSubmit);
    setFieldErrors(validation.fieldErrors);
    setValidationMessage(validation.summary);
  }, [buildPayload, onInvalid, onSubmit]);

  // 필드 변경 시 자동 제출 + localStorage 저장
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      submitIfValid();
      return;
    }
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ name, date, time, gender, calendar, leapMonth, tz, locationVal }),
      );
    } catch { /* quota exceeded or private browsing — ignore */ }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = undefined;
    }
    debounceRef.current = scheduleDebouncedSubmit(
      debounceRef.current,
      DEBOUNCE_MS,
      submitIfValid,
    );
  }, [name, date, time, gender, calendar, leapMonth, tz, locationVal, submitIfValid]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      {validationMessage && (
        <div className="form-validation-summary" role="alert">
          {validationMessage}
        </div>
      )}
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
        <div className={`form-group${fieldErrors.tz ? ' has-error' : ''}`}>
          <label htmlFor="tz">시간대</label>
          <select id="tz" value={tz} onChange={(e) => setTz(e.target.value)} aria-invalid={!!fieldErrors.tz} aria-describedby={fieldErrors.tz ? 'tz-error' : undefined}>
            <option value="Asia/Seoul">Asia/Seoul (+09:00)</option>
            <option value="Asia/Tokyo">Asia/Tokyo (+09:00)</option>
            <option value="Asia/Shanghai">Asia/Shanghai (+08:00)</option>
            <option value="America/New_York">America/New_York (-05:00)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (-08:00)</option>
            <option value="Europe/London">Europe/London (+00:00)</option>
          </select>
          {fieldErrors.tz && <p id="tz-error" className="form-field-error">{fieldErrors.tz}</p>}
        </div>
        <div className={`form-group${fieldErrors.location ? ' has-error' : ''}`}>
          <label htmlFor="location">지역 (평태양시)</label>
          <select id="location" value={locationVal} onChange={(e) => setLocationVal(e.target.value)} aria-invalid={!!fieldErrors.location} aria-describedby={fieldErrors.location ? 'location-error' : undefined}>
            <option value="">없음</option>
            {locations.map((l) => (
              <option key={l.key} value={l.key}>{l.display}</option>
            ))}
          </select>
          {fieldErrors.location && <p id="location-error" className="form-field-error">{fieldErrors.location}</p>}
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
        <div className={`form-group${fieldErrors.date ? ' has-error' : ''}`}>
          <label htmlFor="date">
            날짜 <span className="label-hint">{calendar === 'Solar' ? '(양력 1900~2100)' : '(음력 1900~2099)'}</span>
          </label>
          <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} required aria-invalid={!!fieldErrors.date} aria-describedby={fieldErrors.date ? 'date-error' : undefined} />
          {fieldErrors.date && <p id="date-error" className="form-field-error">{fieldErrors.date}</p>}
        </div>
        <div className={`form-group${fieldErrors.time ? ' has-error' : ''}`}>
          <label htmlFor="time">시간 <span className="label-hint">(00:00~23:59)</span></label>
          <input type="time" id="time" value={time} onChange={(e) => setTime(e.target.value)} required aria-invalid={!!fieldErrors.time} aria-describedby={fieldErrors.time ? 'time-error' : undefined} />
          {fieldErrors.time && <p id="time-error" className="form-field-error">{fieldErrors.time}</p>}
        </div>
      </div>
    </form>
  );
}
