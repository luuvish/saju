/**
 * @fileoverview 대운(大運) 타임라인 컴포넌트
 *
 * 10년 주기의 대운을 가로 타임라인으로 표시한다.
 * 현재 나이에 해당하는 대운을 하이라이트한다.
 */
'use client';

import type { SajuResult } from 'saju-lib';
import { bazi } from 'saju-lib';
import type { I18n } from 'saju-lib';
import { elementCss, stemSub, branchSub } from './utils';

/** 대운 1주기 = 120개월(10년) */
const DAEWON_SPAN_MONTHS = 120;

/**
 * 출생일 기준 현재까지의 경과 개월 수를 계산한다.
 * @returns 경과 개월 수, 또는 계산 불가 시 null
 */
function computeAgeMonths(result: SajuResult): number | null {
  let solarDateStr: string;
  if (result.calendarIsLunar && result.convertedSolar) {
    solarDateStr = result.convertedSolar;
  } else {
    solarDateStr = result.inputDate;
  }
  const parts = solarDateStr.split('-').map(Number);
  if (parts.length < 3) return null;
  const [birthY, birthM] = parts;

  const now = new Date();
  const nowY = now.getFullYear();
  const nowM = now.getMonth() + 1;

  return (nowY - birthY) * 12 + (nowM - birthM);
}

interface Props { result: SajuResult; i18n: I18n }

export default function DaewonTimeline({ result, i18n }: Props) {
  const ds = result.dayPillar.stem;
  const heading = `${i18n.daewonHeading()} (${i18n.directionLabel(result.daewonDirection)} , ${i18n.startLabel()} ${i18n.formatAge(result.daewonStartMonths, false)})`;
  const ageMonths = computeAgeMonths(result);

  return (
    <section className="section">
      <h3>{heading}</h3>
      <div className="luck-timeline luck-compact">
        {result.daewonItems.map((item, idx) => {
          const p = item.pillar;
          const stemEl = bazi.stemElement(p.stem);
          const branchEl = bazi.branchElement(p.branch);
          const isCurrent = ageMonths !== null
            && ageMonths >= item.startMonths
            && ageMonths < item.startMonths + DAEWON_SPAN_MONTHS;
          return (
            <div key={idx} className={`luck-card${isCurrent ? ' luck-current' : ''}`}>
              <div className="luck-age">{i18n.formatAge(item.startMonths, true)}</div>
              <div className="luck-god">{i18n.tenGodLabel(bazi.tenGod(ds, p.stem))}</div>
              <div className={`pt-card ${elementCss(stemEl)}`}>{i18n.stemLabel(p.stem)}</div>
              <div className="pt-sub">{stemSub(i18n, p.stem)}</div>
              <div className={`pt-card ${elementCss(branchEl)}`}>{i18n.branchLabel(p.branch)}</div>
              <div className="pt-sub">{branchSub(i18n, p.branch)}</div>
              <div className="luck-god">{i18n.tenGodLabel(bazi.tenGodBranch(ds, p.branch))}</div>
              <div className="luck-stage">{i18n.stageLabel(bazi.twelveStageIndex(ds, p.branch))}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
