/**
 * @fileoverview 주요 신살(神殺) 표시 컴포넌트
 *
 * 도화살, 천을귀인, 역마살 등 13종의 주요 신살을
 * 그리드 레이아웃으로 표시한다. 신살이 없으면 렌더링하지 않는다.
 */
'use client';

import type { SajuResult } from 'saju-lib';
import type { I18n } from 'saju-lib';

interface Props { result: SajuResult; i18n: I18n }

export default function ShinsalSection({ result, i18n }: Props) {
  const { shinsalEntries } = result;
  if (shinsalEntries.length === 0) return null;

  return (
    <section className="section">
      <h3>{i18n.shinsalExtraHeading()}</h3>
      <div className="shinsal-grid">
        {shinsalEntries.map((entry, idx) => {
          const foundAt = entry.foundAt.map((p) => i18n.positionLabel(p)).join(', ');
          return (
            <div key={idx} className="shinsal-item">
              <span className="shinsal-name">{i18n.shinsalKindLabel(entry.kind)}</span>
              <span className="shinsal-at">{foundAt}</span>
              <span className="shinsal-basis">{i18n.basisPositionLabel(entry.basis)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
