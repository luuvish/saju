/**
 * @fileoverview 월운(月運) 타임라인 컴포넌트
 *
 * 절기 기준 12개월의 월운을 가로 타임라인으로 표시한다.
 * 현재 월에 해당하는 월운을 하이라이트하며,
 * 현재 월이 초반부에 위치하면 전년도 월운을 앞에 채워 넣는다.
 */
'use client';

import type { SajuResult } from 'saju-lib';
import { bazi, astro, luck } from 'saju-lib';
import type { I18n, MonthlyLuck as MonthlyLuckType } from 'saju-lib';
import { elementCss, stemSub, branchSub } from './utils';

interface MonthItem {
  pillar: { stem: number; branch: number };
  branch: number;
  startJd: number;
  endJd: number;
  isCurrent: boolean;
}

/**
 * 월운 아이템 배열을 구성한다.
 * 현재 월이 리스트 초반에 오면, 전년도 월운을 앞에 추가하여
 * 현재 월이 약 1/3 위치에 오도록 조정한다.
 */
function buildMonthItems(ml: MonthlyLuckType, nowJd: number): MonthItem[] {
  const currentIdx = ml.months.findIndex((m) => nowJd >= m.startJd && nowJd < m.endJd);

  // 현재 월이 인덱스 4 미만이면 전년도 월운을 앞에 채움
  const prefixCount = currentIdx >= 0 && currentIdx < 4 ? 4 - currentIdx : 0;

  const items: MonthItem[] = [];

  if (prefixCount > 0) {
    try {
      const prevMl = luck.monthlyLuck(ml.year - 1);
      const skip = Math.max(0, prevMl.months.length - prefixCount);
      for (const m of prevMl.months.slice(skip)) {
        items.push({
          pillar: m.pillar,
          branch: m.branch,
          startJd: m.startJd,
          endJd: m.endJd,
          isCurrent: nowJd >= m.startJd && nowJd < m.endJd,
        });
      }
    } catch {
      // 전년도 데이터 없으면 무시
    }
  }

  const remaining = 12 - items.length;
  for (const m of ml.months.slice(0, remaining)) {
    items.push({
      pillar: m.pillar,
      branch: m.branch,
      startJd: m.startJd,
      endJd: m.endJd,
      isCurrent: nowJd >= m.startJd && nowJd < m.endJd,
    });
  }

  return items;
}

interface Props { result: SajuResult; i18n: I18n }

export default function MonthlyLuck({ result, i18n }: Props) {
  const ds = result.dayPillar.stem;
  const ml = result.monthlyLuck;
  const nowJd = astro.jdFromDatetime(new Date());
  const items = buildMonthItems(ml, nowJd);

  return (
    <section className="section">
      <h3>{i18n.monthlyLuckHeading(ml.year)}</h3>
      <div className="luck-timeline luck-compact">
        {items.map((m, idx) => {
          const p = m.pillar;
          const stemEl = bazi.stemElement(p.stem);
          const branchEl = bazi.branchElement(p.branch);
          return (
            <div key={idx} className={`luck-card${m.isCurrent ? ' luck-current' : ''}`}>
              <div className="luck-age">{i18n.monthLabel(m.branch)}</div>
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
