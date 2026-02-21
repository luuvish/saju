/**
 * @fileoverview 천문 계산 모듈 — 절기(節氣) 시점 산출
 *
 * 태양의 시황경(apparent longitude)을 계산하여 24절기의 정확한 발생 시점을
 * 율리우스일(Julian Date)로 산출한다. 사주 연주·월주 결정에 핵심적인 모듈이다.
 *
 * 태양 위치 계산에는 VSOP87 이론의 간략 공식(low-precision solar position)을
 * 사용한다. Jean Meeus, "Astronomical Algorithms" 참조.
 */

import type { SolarTerm, TermDef } from './types.js';

/**
 * 24절기 정의 배열.
 * 소한(285°)부터 동지(270°)까지 황경 순서로 배열된다.
 * angle은 춘분점(0°) 기준 태양 황경이다.
 */
export const TERM_DEFS: TermDef[] = [
  { key: 'xiaohan', nameKo: '소한', nameHanja: '小寒', nameEn: 'Xiaohan', angle: 285.0 },
  { key: 'dahan', nameKo: '대한', nameHanja: '大寒', nameEn: 'Dahan', angle: 300.0 },
  { key: 'lichun', nameKo: '입춘', nameHanja: '立春', nameEn: 'Lichun', angle: 315.0 },
  { key: 'yushui', nameKo: '우수', nameHanja: '雨水', nameEn: 'Yushui', angle: 330.0 },
  { key: 'jingzhe', nameKo: '경칩', nameHanja: '驚蟄', nameEn: 'Jingzhe', angle: 345.0 },
  { key: 'chunfen', nameKo: '춘분', nameHanja: '春分', nameEn: 'Chunfen', angle: 0.0 },
  { key: 'qingming', nameKo: '청명', nameHanja: '清明', nameEn: 'Qingming', angle: 15.0 },
  { key: 'guyu', nameKo: '곡우', nameHanja: '谷雨', nameEn: 'Guyu', angle: 30.0 },
  { key: 'lixia', nameKo: '입하', nameHanja: '立夏', nameEn: 'Lixia', angle: 45.0 },
  { key: 'xiaoman', nameKo: '소만', nameHanja: '小滿', nameEn: 'Xiaoman', angle: 60.0 },
  { key: 'mangzhong', nameKo: '망종', nameHanja: '芒種', nameEn: 'Mangzhong', angle: 75.0 },
  { key: 'xiazhi', nameKo: '하지', nameHanja: '夏至', nameEn: 'Xiazhi', angle: 90.0 },
  { key: 'xiaoshu', nameKo: '소서', nameHanja: '小暑', nameEn: 'Xiaoshu', angle: 105.0 },
  { key: 'dashu', nameKo: '대서', nameHanja: '大暑', nameEn: 'Dashu', angle: 120.0 },
  { key: 'liqiu', nameKo: '입추', nameHanja: '立秋', nameEn: 'Liqiu', angle: 135.0 },
  { key: 'chushu', nameKo: '처서', nameHanja: '處暑', nameEn: 'Chushu', angle: 150.0 },
  { key: 'bailu', nameKo: '백로', nameHanja: '白露', nameEn: 'Bailu', angle: 165.0 },
  { key: 'qiufen', nameKo: '추분', nameHanja: '秋分', nameEn: 'Qiufen', angle: 180.0 },
  { key: 'hanlu', nameKo: '한로', nameHanja: '寒露', nameEn: 'Hanlu', angle: 195.0 },
  { key: 'shuangjiang', nameKo: '상강', nameHanja: '霜降', nameEn: 'Shuangjiang', angle: 210.0 },
  { key: 'lidong', nameKo: '입동', nameHanja: '立冬', nameEn: 'Lidong', angle: 225.0 },
  { key: 'xiaoxue', nameKo: '소설', nameHanja: '小雪', nameEn: 'Xiaoxue', angle: 240.0 },
  { key: 'daxue', nameKo: '대설', nameHanja: '大雪', nameEn: 'Daxue', angle: 255.0 },
  { key: 'dongzhi', nameKo: '동지', nameHanja: '冬至', nameEn: 'Dongzhi', angle: 270.0 },
];

/**
 * JavaScript Date → 율리우스일(JD) 변환.
 * @param dt UTC 기준 Date 객체
 * @returns 율리우스일 (실수)
 */
export function jdFromDatetime(dt: Date): number {
  const seconds = dt.getTime() / 1000;
  return seconds / 86400.0 + 2440587.5;
}

/**
 * 율리우스일(JD) → JavaScript Date 변환.
 * @param jd 율리우스일 (실수)
 * @returns UTC 기준 Date 객체
 */
export function datetimeFromJd(jd: number): Date {
  const ms = (jd - 2440587.5) * 86400000;
  return new Date(ms);
}

/**
 * UTC 날짜·시간 요소로부터 율리우스일을 계산한다.
 * @param year 연도
 * @param month 월 (1~12)
 * @param day 일
 * @param hour 시
 * @param min 분
 * @param sec 초
 * @returns 율리우스일 (실수)
 */
export function jdFromUtcDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  min: number,
  sec: number,
): number {
  const dt = new Date(Date.UTC(year, month - 1, day, hour, min, sec));
  if (year >= 0 && year < 100) dt.setUTCFullYear(year);
  return jdFromDatetime(dt);
}

/**
 * 특정 연도의 24절기 시점을 계산한다.
 *
 * 매일의 태양 황경을 추적하며, 목표 황경에 도달하는 시점을
 * 이분법(bisection)으로 정밀 산출한다.
 *
 * @param year 절기를 계산할 연도
 * @returns 24개 절기의 SolarTerm 배열
 */
export function computeSolarTerms(year: number): SolarTerm[] {
  const start = jdFromUtcDate(year, 1, 1, 0, 0, 0);
  const end = jdFromUtcDate(year + 1, 1, 1, 0, 0, 0);
  const days = Math.ceil(end - start);

  // 목표 황경을 단조증가로 정렬 (360° 경계 처리)
  const targets: number[] = [];
  let last = -1.0;
  for (const def of TERM_DEFS) {
    let angle = def.angle;
    while (angle <= last) {
      angle += 360.0;
    }
    targets.push(angle);
    last = angle;
  }

  const results: SolarTerm[] = [];
  let targetIdx = 0;
  let prevJd = start;
  let prevUnwrapped = sunApparentLongitude(prevJd);

  // 하루 단위로 태양 황경을 추적하며 절기 경계를 탐지
  for (let day = 1; day <= days; day++) {
    const jd = start + day;
    let lon = sunApparentLongitude(jd);
    if (lon < prevUnwrapped) {
      lon += 360.0;
    }
    while (targetIdx < targets.length && targets[targetIdx] <= lon) {
      const target = targets[targetIdx];
      if (target < prevUnwrapped) {
        targetIdx++;
        continue;
      }
      // 이분법으로 정밀 시점 산출
      const termJd = refineTerm(prevJd, jd, prevUnwrapped, target);
      results.push({ def: TERM_DEFS[targetIdx], jd: termJd });
      targetIdx++;
    }
    prevJd = jd;
    prevUnwrapped = lon;
  }

  return results;
}

/**
 * 태양 시황경(apparent longitude)을 계산한다.
 *
 * VSOP87 간략 공식 기반:
 * 1. 평균 황경(L0)과 평균 근점이각(M)을 계산
 * 2. 중심차(equation of center, C)를 적용하여 진황경 산출
 * 3. 장동(nutation) 보정을 적용하여 시황경 산출
 *
 * @param jd 율리우스일
 * @returns 태양 시황경 (0~360도)
 */
function sunApparentLongitude(jd: number): number {
  // 율리우스 세기(T) — J2000.0 에포크 기준
  const t = (jd - 2451545.0) / 36525.0;
  // 태양 평균 황경(L0)
  const l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
  // 태양 평균 근점이각(M)
  const m = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
  const mRad = degToRad(m);
  // 중심차(C) — 케플러 방정식의 근사해
  const c =
    (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(mRad) +
    (0.019993 - 0.000101 * t) * Math.sin(2.0 * mRad) +
    0.000289 * Math.sin(3.0 * mRad);
  const trueLong = l0 + c;
  // 장동(nutation) 보정
  const omega = 125.04 - 1934.136 * t;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(degToRad(omega));
  return normDeg(lambda);
}

/**
 * 이분법(bisection)으로 태양 황경이 목표값에 도달하는 JD를 정밀 산출한다.
 * 60회 반복으로 약 10⁻¹⁸일(≈ 0.1µs) 정밀도를 달성한다.
 *
 * @param jd0 탐색 시작 JD
 * @param jd1 탐색 종료 JD
 * @param lon0 jd0 시점의 태양 황경
 * @param target 목표 황경
 * @returns 목표 황경 도달 시점의 JD
 */
function refineTerm(jd0: number, jd1: number, lon0: number, target: number): number {
  let lo = jd0;
  let hi = jd1;
  let loLon = lon0;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2.0;
    let midLon = sunApparentLongitude(mid);
    if (midLon < loLon) {
      midLon += 360.0;
    }
    if (midLon >= target) {
      hi = mid;
    } else {
      lo = mid;
      loLon = midLon;
    }
  }
  return (lo + hi) / 2.0;
}

/** 도(degrees) → 라디안(radians) 변환 */
function degToRad(deg: number): number {
  return (deg * Math.PI) / 180.0;
}

/** 각도를 0~360도 범위로 정규화 */
function normDeg(deg: number): number {
  deg = deg % 360.0;
  if (deg < 0.0) {
    deg += 360.0;
  }
  return deg;
}
