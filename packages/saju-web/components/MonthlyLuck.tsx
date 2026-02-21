'use client';

import type { SajuResult } from 'saju-lib';
import { bazi, astro, luck } from 'saju-lib';
import type { I18n, MonthlyLuck as MonthlyLuckType } from 'saju-lib';
import type { Element } from 'saju-lib';

function elementCss(el: Element): string {
  const map: Record<Element, string> = {
    Wood: 'element-wood', Fire: 'element-fire', Earth: 'element-earth',
    Metal: 'element-metal', Water: 'element-water',
  };
  return map[el];
}

function stemSub(i18n: I18n, stem: number): string {
  return `${bazi.stemPolarity(stem) ? '+' : '-'}${i18n.elementShortLabel(bazi.stemElement(stem))}`;
}
function branchSub(i18n: I18n, branch: number): string {
  return `${bazi.branchPolarity(branch) ? '+' : '-'}${i18n.elementShortLabel(bazi.branchElement(branch))}`;
}

interface MonthItem {
  pillar: { stem: number; branch: number };
  branch: number;
  startJd: number;
  endJd: number;
  isCurrent: boolean;
}

function buildMonthItems(ml: MonthlyLuckType, nowJd: number): MonthItem[] {
  // Find current month index
  const currentIdx = ml.months.findIndex((m) => nowJd >= m.startJd && nowJd < m.endJd);

  // We want current month at ~1/3 position (index 4 in 12-item list).
  // If current is at index < 4, prepend previous year's months to shift it right.
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
      // ignore if previous year's data unavailable
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
