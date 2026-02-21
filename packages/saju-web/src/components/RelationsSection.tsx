/**
 * @fileoverview 합충형파해(合沖刑破害) 관계 표시 컴포넌트
 *
 * 사주 네 기둥 간의 천간 합/충과 지지 육합/충/형/파/해/방합/삼합을
 * 리스트 형태로 표시한다. 관계가 없으면 섹션 자체를 렌더링하지 않는다.
 */


import type { SajuResult } from 'saju-lib';
import type { I18n } from 'saju-lib';
import type { StemRelationType, BranchRelationType } from 'saju-lib';

/** 관계 유형에 대응하는 CSS 클래스명을 반환한다 */
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
