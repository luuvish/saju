'use client';

import type { SajuResult } from 'saju-lib';
import { bazi } from 'saju-lib';
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

export default function DaewonTimeline({ result, i18n }: Props) {
  const ds = result.dayPillar.stem;
  const heading = `${i18n.daewonHeading()} (${i18n.directionLabel(result.daewonDirection)} , ${i18n.startLabel()} ${i18n.formatAge(result.daewonStartMonths, false)})`;

  return (
    <section className="section">
      <h3>{heading}</h3>
      <div className="luck-timeline luck-compact">
        {result.daewonItems.map((item, idx) => {
          const p = item.pillar;
          const stemEl = bazi.stemElement(p.stem);
          const branchEl = bazi.branchElement(p.branch);
          return (
            <div key={idx} className="luck-card">
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
