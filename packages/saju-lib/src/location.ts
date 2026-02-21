/**
 * @fileoverview 지역(Location) 및 평태양시(LMT) 보정 모듈
 *
 * 한국 주요 도시의 경도 정보를 내장하고, 이름으로 검색할 수 있다.
 * 평태양시(Local Mean Time) 보정은 실제 지역 경도와 표준자오선의
 * 차이를 시간(초)으로 환산하여 생시 보정에 활용한다.
 */

/** 내장 지역 정의 (도시명, 경도, 별칭) */
interface LocationDef {
  key: string;
  display: string;
  longitude: number;
  aliases: string[];
}

/** 한국 주요 도시 경도 데이터 */
const LOCATIONS: LocationDef[] = [
  { key: 'seoul', display: 'Seoul/서울', longitude: 126.978, aliases: ['seoul', '서울'] },
  { key: 'busan', display: 'Busan/부산', longitude: 129.0756, aliases: ['busan', '부산'] },
  { key: 'daegu', display: 'Daegu/대구', longitude: 128.6014, aliases: ['daegu', '대구'] },
  { key: 'incheon', display: 'Incheon/인천', longitude: 126.7052, aliases: ['incheon', '인천'] },
  { key: 'gwangju', display: 'Gwangju/광주', longitude: 126.8514, aliases: ['gwangju', '광주'] },
  { key: 'daejeon', display: 'Daejeon/대전', longitude: 127.3845, aliases: ['daejeon', '대전'] },
  { key: 'ulsan', display: 'Ulsan/울산', longitude: 129.3114, aliases: ['ulsan', '울산'] },
  { key: 'sejong', display: 'Sejong/세종', longitude: 127.289, aliases: ['sejong', '세종'] },
  { key: 'suwon', display: 'Suwon/수원', longitude: 127.0078, aliases: ['suwon', '수원'] },
  { key: 'changwon', display: 'Changwon/창원', longitude: 128.6811, aliases: ['changwon', '창원'] },
  { key: 'cheongju', display: 'Cheongju/청주', longitude: 127.489, aliases: ['cheongju', '청주'] },
  { key: 'jeonju', display: 'Jeonju/전주', longitude: 127.148, aliases: ['jeonju', '전주'] },
  { key: 'jeju', display: 'Jeju/제주', longitude: 126.5312, aliases: ['jeju', '제주'] },
  { key: 'gangneung', display: 'Gangneung/강릉', longitude: 128.8761, aliases: ['gangneung', '강릉'] },
  { key: 'pohang', display: 'Pohang/포항', longitude: 129.365, aliases: ['pohang', '포항'] },
];

/** 지역 검색 결과 */
export interface LocationMatch {
  display: string;
  longitude: number;
}

/** 지역 정보 (외부 노출용) */
export interface LocationInfo {
  key: string;
  display: string;
  longitude: number;
}

/**
 * 지역명을 정규화한다 (소문자화, 공백·구두점 제거).
 * @param input 원본 지역명
 * @returns 정규화된 문자열
 */
function normalizeLocation(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.]/g, '');
}

/**
 * 지역명으로 경도 정보를 검색한다.
 * key, display, aliases 순서로 매칭하며 대소문자·공백을 무시한다.
 * @param input 검색할 지역명 (예: 'seoul', '서울', 'Busan')
 * @returns 매칭된 지역 정보 또는 null
 */
export function resolveLocation(input: string): LocationMatch | null {
  const norm = normalizeLocation(input);
  for (const loc of LOCATIONS) {
    if (normalizeLocation(loc.key) === norm) {
      return { display: loc.display, longitude: loc.longitude };
    }
    if (normalizeLocation(loc.display) === norm) {
      return { display: loc.display, longitude: loc.longitude };
    }
    if (loc.aliases.some((alias) => normalizeLocation(alias) === norm)) {
      return { display: loc.display, longitude: loc.longitude };
    }
  }
  return null;
}

/**
 * 사용 가능한 지역명 목록을 쉼표로 연결하여 반환한다.
 * 에러 메시지에서 지원 지역 안내에 사용된다.
 */
export function locationHint(): string {
  return LOCATIONS.map((loc) => loc.key).join(', ');
}

/**
 * 전체 지역 목록을 반환한다 (UI 드롭다운 등에 사용).
 * @returns LocationInfo 배열
 */
export function locationList(): LocationInfo[] {
  return LOCATIONS.map((loc) => ({
    key: loc.key,
    display: loc.display,
    longitude: loc.longitude,
  }));
}

/**
 * 평태양시(LMT) 보정값을 계산한다.
 *
 * 표준자오선과 실제 경도의 차이를 시간으로 환산한다.
 * 경도 1도 = 4분(240초)의 시차에 해당한다.
 *
 * @param longitude 실제 지역 경도 (도 단위)
 * @param offsetSeconds 해당 시간대의 UTC 오프셋 (초 단위)
 * @returns [표준자오선 경도, 보정 초] 튜플
 *
 * @example
 * // 서울(126.978도), KST(+09:00 = 32400초)
 * lmtCorrection(126.978, 32400) → [135, -1925]
 * // 표준자오선 135도에서 약 -32분 보정
 */
export function lmtCorrection(longitude: number, offsetSeconds: number): [number, number] {
  const stdMeridian = (offsetSeconds / 3600) * 15;
  const correctionSeconds = Math.round((longitude - stdMeridian) * 240);
  return [stdMeridian, correctionSeconds];
}
