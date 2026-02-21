/**
 * @fileoverview 신강/신약 및 용신(用神) 표시 컴포넌트
 *
 * 일간의 강약 판정 결과(점수, 월지 운성, 통근, 지원/억제)와
 * 용신·희신·기신·구신을 카드 형태로 표시한다.
 */
'use client';

import type { SajuResult, StrengthResult } from 'saju-lib';
import type { I18n } from 'saju-lib';
import type { StrengthClass } from 'saju-lib';

interface Props { result: SajuResult; i18n: I18n }

export default function StrengthSection({ result, i18n }: Props) {
  const s: StrengthResult = result.strength;
  const y = result.yongshin;
  const stageBonus = s.stageClass === 'Strong' ? 2 : s.stageClass === 'Weak' ? -2 : 0;
  const supportTotal = s.supportStems * 2 + s.supportHidden;
  const drainTotal = s.drainStems * 2 + s.drainHidden;

  const elementClass = (el: string) => `element-${el.toLowerCase()}`;

  const verdictClass = s.verdict === 'Strong' ? 'verdict-strong' : s.verdict === 'Weak' ? 'verdict-weak' : 'verdict-neutral';

  return (
    <section className="section">
      <h3>{i18n.strengthHeading()}</h3>

      {/* 판정 결과 요약: 배지 + 점수 */}
      <div className="strength-summary">
        <div className={`verdict-badge ${verdictClass}`}>
          {i18n.strengthVerdictLabel(s.verdict)}
        </div>
        <div className="strength-score">
          <span className="score-number">{s.total > 0 ? '+' : ''}{s.total}</span>
          <span className="score-unit">{i18n.scoreLabel()}</span>
        </div>
      </div>

      {/* 판정 상세: 운성, 통근, 지원, 억제 */}
      <div className="strength-details">
        <div className="strength-row">
          <span className="strength-label">{i18n.monthStageLabel()}</span>
          <span className="strength-value">{i18n.stageLabel(s.stageIndex)} ({i18n.strengthClassLabel(s.stageClass as StrengthClass)}) {stageBonus > 0 ? `+${stageBonus}` : stageBonus}</span>
        </div>
        <div className="strength-row">
          <span className="strength-label">{i18n.rootLabel()}</span>
          <span className="strength-value">{s.rootCount}</span>
        </div>
        <div className="strength-row">
          <span className="strength-label">{i18n.supportLabel()}</span>
          <span className="strength-value strength-positive">+{supportTotal} <span className="strength-detail">({i18n.stemsLabel()} {s.supportStems} + {i18n.hiddenStemsHeading()} {s.supportHidden})</span></span>
        </div>
        <div className="strength-row">
          <span className="strength-label">{i18n.drainLabel()}</span>
          <span className="strength-value strength-negative">-{drainTotal} <span className="strength-detail">({i18n.stemsLabel()} {s.drainStems} + {i18n.hiddenStemsHeading()} {s.drainHidden})</span></span>
        </div>
      </div>

      {/* 용신(用神) 섹션 */}
      <h3 style={{ marginTop: 'var(--space-5)' }}>{i18n.yongshinHeading()}</h3>
      <p className="yongshin-method">{i18n.yongshinMethodLabel(y.method)}</p>
      <div className="yongshin-grid">
        <div className="yongshin-card yongshin-good">
          <span className="yongshin-label">{i18n.yongshinLabel()}</span>
          <span className={`yongshin-element pt-card ${elementClass(y.yongshin)}`}>
            {i18n.elementLabel(y.yongshin)}
          </span>
        </div>
        <div className="yongshin-card yongshin-good">
          <span className="yongshin-label">{i18n.heeshinLabel()}</span>
          <span className={`yongshin-element pt-card ${elementClass(y.heeshin)}`}>
            {i18n.elementLabel(y.heeshin)}
          </span>
        </div>
        <div className="yongshin-card yongshin-bad">
          <span className="yongshin-label">{i18n.gishinLabel()}</span>
          <span className={`yongshin-element pt-card ${elementClass(y.gishin)}`}>
            {i18n.elementLabel(y.gishin)}
          </span>
        </div>
        <div className="yongshin-card yongshin-bad">
          <span className="yongshin-label">{i18n.gushinLabel()}</span>
          <span className={`yongshin-element pt-card ${elementClass(y.gushin)}`}>
            {i18n.elementLabel(y.gushin)}
          </span>
        </div>
      </div>
    </section>
  );
}
