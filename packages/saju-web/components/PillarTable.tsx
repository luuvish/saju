'use client';

import type { SajuResult } from 'saju-lib';
import { bazi, astro } from 'saju-lib';
import type { I18n } from 'saju-lib';
import type { Pillar, PillarPosition, Element } from 'saju-lib';

type PillarKind = 'Year' | 'Month' | 'Day' | 'Hour' | 'YearlyLuck' | 'MonthlyLuck';

function elementCss(el: Element): string {
  const map: Record<Element, string> = {
    Wood: 'element-wood', Fire: 'element-fire', Earth: 'element-earth',
    Metal: 'element-metal', Water: 'element-water',
  };
  return map[el];
}

function stemSub(i18n: I18n, stem: number): string {
  const pol = bazi.stemPolarity(stem);
  return `${pol ? '+' : '-'}${i18n.elementShortLabel(bazi.stemElement(stem))}`;
}

function branchSub(i18n: I18n, branch: number): string {
  const pol = bazi.branchPolarity(branch);
  return `${pol ? '+' : '-'}${i18n.elementShortLabel(bazi.branchElement(branch))}`;
}

interface Props { result: SajuResult; i18n: I18n }

function kindLabel(i18n: I18n, kind: PillarKind): string {
  if (kind === 'YearlyLuck') return i18n.lang === 'Ko' ? '세운' : 'Yearly';
  if (kind === 'MonthlyLuck') return i18n.lang === 'Ko' ? '월운' : 'Monthly';
  return i18n.pillarKindLabel(kind);
}

export default function PillarTable({ result, i18n }: Props) {
  const ds = result.dayPillar.stem;
  const yb = result.yearPillar.branch;
  const nowJd = astro.jdFromDatetime(new Date());

  // Find current yearly & monthly luck pillars
  const currentYear = result.yearlyLuck.find((y) => nowJd >= y.startJd && nowJd < y.endJd);
  const currentMonth = result.monthlyLuck.months.find((m) => nowJd >= m.startJd && nowJd < m.endJd);

  function buildCol(kind: PillarKind, p: Pillar) {
    const stemEl = bazi.stemElement(p.stem);
    const branchEl = bazi.branchElement(p.branch);
    const hidden = bazi.hiddenStems(p.branch);
    return {
      kind,
      pillar: p,
      stemEl, branchEl,
      stemGod: i18n.tenGodLabel(bazi.tenGod(ds, p.stem)),
      branchGod: i18n.tenGodLabel(bazi.tenGodBranch(ds, p.branch)),
      hiddenStr: [...hidden].reverse().map((s) => i18n.stemLabel(s)).join(' '),
      stage: i18n.stageLabel(bazi.twelveStageIndex(ds, p.branch)),
      shinsal: i18n.shinsalLabel(bazi.twelveShinsalIndex(yb, p.branch)),
      stemSub: stemSub(i18n, p.stem),
      branchSub: branchSub(i18n, p.branch),
      isDay: kind === 'Day',
    };
  }

  const fourPillars: PillarPosition[] = ['Hour', 'Day', 'Month', 'Year'];
  const pillars: Record<PillarPosition, Pillar> = {
    Year: result.yearPillar, Month: result.monthPillar,
    Day: result.dayPillar, Hour: result.hourPillar,
  };

  const cols = [
    ...(currentMonth ? [buildCol('MonthlyLuck', currentMonth.pillar)] : []),
    ...(currentYear ? [buildCol('YearlyLuck', currentYear.pillar)] : []),
    ...fourPillars.map((kind) => buildCol(kind, pillars[kind])),
  ];

  const isLuck = (kind: PillarKind) => kind === 'MonthlyLuck' || kind === 'YearlyLuck';
  const dividerIdx = cols.findIndex((c) => !isLuck(c.kind));

  function cellCls(idx: number, extra?: string) {
    const cls = ['pt-cell'];
    if (extra) cls.push(extra);
    if (idx === dividerIdx) cls.push('pt-divider');
    return cls.join(' ');
  }

  return (
    <section className="section">
      <h3>{i18n.pillarsHeading()}</h3>
      <div className="pillar-table">
        {/* Header */}
        <div className="pt-row pt-header">
          {cols.map((c, i) => (
            <div key={c.kind} className={cellCls(i)}>{kindLabel(i18n, c.kind)}</div>
          ))}
        </div>
        {/* Stem Ten Gods */}
        <div className="pt-row">
          {cols.map((c, i) => (
            <div key={c.kind} className={cellCls(i, 'pt-god')}>{c.stemGod}</div>
          ))}
        </div>
        {/* Stem cards */}
        <div className="pt-row">
          {cols.map((c, i) => (
            <div key={c.kind} className={cellCls(i)}>
              <div className={`pt-card ${elementCss(c.stemEl)}${c.isDay ? ' pt-day' : ''}`}>
                {i18n.stemLabel(c.pillar.stem)}
              </div>
              <div className="pt-sub">{c.stemSub}</div>
            </div>
          ))}
        </div>
        {/* Branch cards */}
        <div className="pt-row">
          {cols.map((c, i) => (
            <div key={c.kind} className={cellCls(i)}>
              <div className={`pt-card ${elementCss(c.branchEl)}`}>
                {i18n.branchLabel(c.pillar.branch)}
              </div>
              <div className="pt-sub">{c.branchSub}</div>
            </div>
          ))}
        </div>
        {/* Branch Ten Gods */}
        <div className="pt-row">
          {cols.map((c, i) => (
            <div key={c.kind} className={cellCls(i, 'pt-god')}>{c.branchGod}</div>
          ))}
        </div>
        {/* Hidden Stems */}
        <div className="pt-row">
          {cols.map((c, i) => (
            <div key={c.kind} className={cellCls(i, 'pt-text')}>{c.hiddenStr}</div>
          ))}
        </div>
        {/* 12 Stages */}
        <div className="pt-row">
          {cols.map((c, i) => (
            <div key={c.kind} className={cellCls(i, 'pt-text')}>{c.stage}</div>
          ))}
        </div>
        {/* 12 Shinsal */}
        <div className="pt-row">
          {cols.map((c, i) => (
            <div key={c.kind} className={cellCls(i, 'pt-text')}>{c.shinsal}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
