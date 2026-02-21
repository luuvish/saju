'use client';

import type { SajuResult, StrengthResult } from 'saju-lib';
import type { I18n } from 'saju-lib';
import type { StrengthClass } from 'saju-lib';

interface Props { result: SajuResult; i18n: I18n }

export default function StrengthSection({ result, i18n }: Props) {
  const s: StrengthResult = result.strength;
  const stageBonus = s.stageClass === 'Strong' ? 2 : s.stageClass === 'Weak' ? -2 : 0;
  const supportTotal = s.supportStems * 2 + s.supportHidden;
  const drainTotal = s.drainStems * 2 + s.drainHidden;

  const lines = [
    `${i18n.monthStageLabel()}: ${i18n.stageLabel(s.stageIndex)} (${i18n.strengthClassLabel(s.stageClass as StrengthClass)})`,
    `${i18n.rootLabel()}: ${s.rootCount} / ${i18n.supportLabel()}(${i18n.stemsLabel()} ${s.supportStems}\u00B7${i18n.hiddenStemsHeading()} ${s.supportHidden}) / ${i18n.drainLabel()}(${i18n.stemsLabel()} ${s.drainStems}\u00B7${i18n.hiddenStemsHeading()} ${s.drainHidden})`,
    `${i18n.scoreLabel()}: ${s.total} (${i18n.basisLabel()} ${i18n.monthStageLabel()} ${stageBonus} + ${i18n.rootLabel()} ${s.rootCount} + ${i18n.supportLabel()} ${supportTotal} - ${i18n.drainLabel()} ${drainTotal})`,
    `${i18n.verdictLabel()}: ${i18n.strengthVerdictLabel(s.verdict)}`,
  ];

  return (
    <section className="section">
      <h3>{i18n.strengthHeading()}</h3>
      <div className="info-list">
        {lines.map((line, idx) => (
          <div key={idx} className="info-row">
            <span className="info-value">{line}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
