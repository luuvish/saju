'use client';

import type { SajuResult } from 'saju-lib';
import { bazi, astro } from 'saju-lib';
import type { I18n } from 'saju-lib';
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

interface Props { result: SajuResult; i18n: I18n }

export default function MonthlyLuck({ result, i18n }: Props) {
  const ds = result.dayPillar.stem;
  const ml = result.monthlyLuck;
  const nowJd = astro.jdFromDatetime(new Date());

  return (
    <section className="section">
      <h3>{i18n.monthlyLuckHeading(ml.year)}</h3>
      <div className="luck-timeline luck-compact">
        {ml.months.map((m, idx) => {
          const p = m.pillar;
          const stemEl = bazi.stemElement(p.stem);
          const branchEl = bazi.branchElement(p.branch);
          const isCurrent = nowJd >= m.startJd && nowJd < m.endJd;
          return (
            <div key={idx} className={`luck-card${isCurrent ? ' luck-current' : ''}`}>
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
