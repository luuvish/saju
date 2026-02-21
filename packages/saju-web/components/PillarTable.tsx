'use client';

import type { SajuResult } from 'saju-lib';
import { bazi } from 'saju-lib';
import type { I18n } from 'saju-lib';
import type { Pillar, PillarPosition, Element } from 'saju-lib';

type PillarKind = 'Year' | 'Month' | 'Day' | 'Hour';

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

export default function PillarTable({ result, i18n }: Props) {
  const ds = result.dayPillar.stem;
  const yb = result.yearPillar.branch;
  const kinds: PillarKind[] = ['Hour', 'Day', 'Month', 'Year'];
  const pillars: Record<PillarPosition, Pillar> = {
    Year: result.yearPillar, Month: result.monthPillar,
    Day: result.dayPillar, Hour: result.hourPillar,
  };

  const cols = kinds.map((kind) => {
    const p = pillars[kind];
    const stemEl = bazi.stemElement(p.stem);
    const branchEl = bazi.branchElement(p.branch);
    const hidden = bazi.hiddenStems(p.branch);
    return {
      kind,
      pillar: p,
      stemEl, branchEl,
      stemGod: i18n.tenGodLabel(bazi.tenGod(ds, p.stem)),
      branchGod: i18n.tenGodLabel(bazi.tenGodBranch(ds, p.branch)),
      hiddenStr: hidden.map((s) => i18n.stemLabel(s)).join(', '),
      stage: i18n.stageLabel(bazi.twelveStageIndex(ds, p.branch)),
      shinsal: i18n.shinsalLabel(bazi.twelveShinsalIndex(yb, p.branch)),
      stemSub: stemSub(i18n, p.stem),
      branchSub: branchSub(i18n, p.branch),
      isDay: kind === 'Day',
    };
  });

  return (
    <section className="section">
      <h3>{i18n.pillarsHeading()}</h3>
      <div className="pillar-table">
        {/* Header */}
        <div className="pt-row pt-header">
          <div className="pt-label" />
          {cols.map((c) => (
            <div key={c.kind} className="pt-cell">{i18n.pillarKindLabel(c.kind)}</div>
          ))}
        </div>
        {/* Stem Ten Gods */}
        <div className="pt-row">
          <div className="pt-label">Ten Gods</div>
          {cols.map((c) => (
            <div key={c.kind} className="pt-cell pt-god">{c.stemGod}</div>
          ))}
        </div>
        {/* Stem cards */}
        <div className="pt-row">
          <div className="pt-label">{i18n.stemWord()}</div>
          {cols.map((c) => (
            <div key={c.kind} className="pt-cell">
              <div className={`pt-card ${elementCss(c.stemEl)}${c.isDay ? ' pt-day' : ''}`}>
                {i18n.stemLabel(c.pillar.stem)}
              </div>
              <div className="pt-sub">{c.stemSub}</div>
            </div>
          ))}
        </div>
        {/* Branch cards */}
        <div className="pt-row">
          <div className="pt-label">{i18n.branchWord()}</div>
          {cols.map((c) => (
            <div key={c.kind} className="pt-cell">
              <div className={`pt-card ${elementCss(c.branchEl)}`}>
                {i18n.branchLabel(c.pillar.branch)}
              </div>
              <div className="pt-sub">{c.branchSub}</div>
            </div>
          ))}
        </div>
        {/* Branch Ten Gods */}
        <div className="pt-row">
          <div className="pt-label">Ten Gods</div>
          {cols.map((c) => (
            <div key={c.kind} className="pt-cell pt-god">{c.branchGod}</div>
          ))}
        </div>
        {/* Hidden Stems */}
        <div className="pt-row">
          <div className="pt-label">{i18n.hiddenStemsHeading()}</div>
          {cols.map((c) => (
            <div key={c.kind} className="pt-cell pt-text">{c.hiddenStr}</div>
          ))}
        </div>
        {/* 12 Stages */}
        <div className="pt-row">
          <div className="pt-label">{i18n.twelveStagesHeading()}</div>
          {cols.map((c) => (
            <div key={c.kind} className="pt-cell pt-text">{c.stage}</div>
          ))}
        </div>
        {/* 12 Shinsal */}
        <div className="pt-row">
          <div className="pt-label">{i18n.twelveShinsalHeading()}</div>
          {cols.map((c) => (
            <div key={c.kind} className="pt-cell pt-text">{c.shinsal}</div>
          ))}
        </div>
      </div>
    </section>
  );
}
