'use client';

import type { SajuResult } from 'saju-lib';
import type { I18n } from 'saju-lib';
import type { StemRelationType, BranchRelationType } from 'saju-lib';

function interactionCss(rel: StemRelationType | BranchRelationType): string {
  const map: Record<string, string> = {
    Hap: 'interaction-hap', Chung: 'interaction-chung',
    YukHap: 'interaction-yukhap', Hyung: 'interaction-hyung',
    Pa: 'interaction-pa', Hae: 'interaction-hae',
    BangHap: 'interaction-banghap', SamHap: 'interaction-samhap',
  };
  return map[rel] ?? '';
}

interface Props { result: SajuResult; i18n: I18n }

export default function RelationsSection({ result, i18n }: Props) {
  const { stemInteractions, branchInteractions } = result;
  if (stemInteractions.length === 0 && branchInteractions.length === 0) return null;

  return (
    <section className="section">
      <h3>{i18n.relationsHeading()}</h3>
      <div className="relations-list">
        {stemInteractions.map((si, idx) => {
          const posLabel = si.positions.map((p) => i18n.positionLabel(p)).join('-');
          const detail = si.resultElement
            ? `${i18n.stemLabel(si.stems[0])}-${i18n.stemLabel(si.stems[1])} \u2192 ${i18n.elementLabel(si.resultElement)}`
            : `${i18n.stemLabel(si.stems[0])}-${i18n.stemLabel(si.stems[1])}`;
          return (
            <div key={`s${idx}`} className={`relation-item ${interactionCss(si.relation)}`}>
              <span className="relation-type">{i18n.stemRelationLabel(si.relation)}</span>
              <span className="relation-positions">{posLabel}</span>
              <span>{detail}</span>
            </div>
          );
        })}
        {branchInteractions.map((bi, idx) => {
          const posLabel = bi.positions.map((p) => i18n.positionLabel(p)).join('-');
          const branchStr = bi.branches.map((b) => i18n.branchLabel(b)).join('-');
          const detail = bi.resultElement
            ? `${branchStr} \u2192 ${i18n.elementLabel(bi.resultElement)}`
            : branchStr;
          return (
            <div key={`b${idx}`} className={`relation-item ${interactionCss(bi.relation)}`}>
              <span className="relation-type">{i18n.branchRelationLabel(bi.relation)}</span>
              <span className="relation-positions">{posLabel}</span>
              <span>{detail}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
