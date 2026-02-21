/**
 * @fileoverview 사주 웹 컴포넌트 공통 유틸리티
 *
 * PillarTable, DaewonTimeline, YearlyLuck, MonthlyLuck, ElementsChart 등
 * 여러 컴포넌트에서 반복 사용되는 헬퍼 함수를 모아놓은 모듈이다.
 */

import { bazi } from 'saju-lib';
import type { I18n } from 'saju-lib';
import type { Element } from 'saju-lib';

/**
 * 오행(Element)에 대응하는 CSS 클래스명을 반환한다.
 * @param el 오행
 * @returns 'element-wood' | 'element-fire' | ... 형식의 클래스명
 */
export function elementCss(el: Element): string {
  const map: Record<Element, string> = {
    Wood: 'element-wood', Fire: 'element-fire', Earth: 'element-earth',
    Metal: 'element-metal', Water: 'element-water',
  };
  return map[el];
}

/**
 * 천간의 음양·오행 약어를 생성한다 (예: '+목', '-화').
 * @param i18n 다국어 인스턴스
 * @param stem 천간 인덱스
 */
export function stemSub(i18n: I18n, stem: number): string {
  const pol = bazi.stemPolarity(stem);
  return `${pol ? '+' : '-'}${i18n.elementShortLabel(bazi.stemElement(stem))}`;
}

/**
 * 지지의 음양·오행 약어를 생성한다 (예: '+수', '-토').
 * @param i18n 다국어 인스턴스
 * @param branch 지지 인덱스
 */
export function branchSub(i18n: I18n, branch: number): string {
  const pol = bazi.branchPolarity(branch);
  return `${pol ? '+' : '-'}${i18n.elementShortLabel(bazi.branchElement(branch))}`;
}
