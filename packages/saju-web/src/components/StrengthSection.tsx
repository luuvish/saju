/**
 * @fileoverview 신강/신약 및 용신(用神) 표시 컴포넌트
 *
 * 일간의 강약 판정 결과(점수, 월지 운성, 통근, 지원/억제)와
 * 용신·희신·기신·구신을 카드 형태로 표시한다.
 */

import type { SajuResult, StrengthResult } from 'saju-lib';
import { strength as str, bazi } from 'saju-lib';
import type { I18n } from 'saju-lib';
import type { StrengthClass, Element } from 'saju-lib';

const { STAGE_BONUS, STEM_WEIGHT, HIDDEN_WEIGHT } = str.STRENGTH_WEIGHTS;
const ELEMENTS: readonly Element[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

interface Props { result: SajuResult; i18n: I18n }

/** bazi 상생 규칙의 역방향으로 '나를 생하는 오행'을 찾는다 */
function elementGeneratedBy(element: Element): Element {
  const found = ELEMENTS.find((candidate) => bazi.elementGenerates(candidate) === element);
  if (!found) throw new Error(`generatedBy not found for ${element}`);
  return found;
}

/** bazi 상극 규칙의 역방향으로 '나를 극하는 오행'을 찾는다 */
function elementControlledBy(element: Element): Element {
  const found = ELEMENTS.find((candidate) => bazi.elementControls(candidate) === element);
  if (!found) throw new Error(`controlledBy not found for ${element}`);
  return found;
}

export default function StrengthSection({ result, i18n }: Props) {
  const s: StrengthResult = result.strength;
  const y = result.yongshin;
  const dayEl = bazi.stemElement(result.dayPillar.stem);

  const same = dayEl;
  const output = bazi.elementGenerates(dayEl);
  const wealth = bazi.elementControls(dayEl);
  const resource = elementGeneratedBy(dayEl);
  const officer = elementControlledBy(dayEl);

  const stageBonus = s.stageClass === 'Strong' ? STAGE_BONUS : s.stageClass === 'Weak' ? -STAGE_BONUS : 0;
  const supportTotal = s.supportStems * STEM_WEIGHT + s.supportHidden * HIDDEN_WEIGHT;
  const drainTotal = s.drainStems * STEM_WEIGHT + s.drainHidden * HIDDEN_WEIGHT;

  const elementClass = (el: string) => `element-${el.toLowerCase()}`;

  const verdictClass = s.verdict === 'Strong' ? 'verdict-strong' : s.verdict === 'Weak' ? 'verdict-weak' : 'verdict-neutral';
  const scoreExpr = `${stageBonus > 0 ? `+${stageBonus}` : stageBonus} + ${s.rootCount} + ${supportTotal} - ${drainTotal} = ${s.total > 0 ? `+${s.total}` : s.total}`;
  const rationaleTitle = i18n.lang === 'Ko' ? '결정 근거' : 'Why this was selected';
  const scoreLine = i18n.lang === 'Ko'
    ? `강약 점수: (월지 운성 + 통근 + 지원 - 억제) = ${scoreExpr}`
    : `Strength score: (month stage + roots + support - drain) = ${scoreExpr}`;
  const methodLine = i18n.lang === 'Ko'
    ? `판정이 ${i18n.strengthVerdictLabel(s.verdict)}이므로 ${y.method === 'suppress' ? '억(抑)' : '부(扶)'} 방향을 적용`
    : `Verdict is ${i18n.strengthVerdictLabel(s.verdict)}, so ${y.method === 'suppress' ? 'suppress' : 'support'} method is applied`;
  const mapLine = i18n.lang === 'Ko'
    ? `일간 ${i18n.elementLabel(dayEl)} 기준: 비겁 ${i18n.elementLabel(same)} · 식상 ${i18n.elementLabel(output)} · 재성 ${i18n.elementLabel(wealth)} · 인성 ${i18n.elementLabel(resource)} · 관성 ${i18n.elementLabel(officer)}`
    : `From day element ${i18n.elementLabel(dayEl)}: Same ${i18n.elementLabel(same)} · Output ${i18n.elementLabel(output)} · Wealth ${i18n.elementLabel(wealth)} · Resource ${i18n.elementLabel(resource)} · Officer ${i18n.elementLabel(officer)}`;
  const pickLine = i18n.lang === 'Ko'
    ? `선정: 용신 ${i18n.elementLabel(y.yongshin)}, 희신 ${i18n.elementLabel(y.heeshin)}, 기신 ${i18n.elementLabel(y.gishin)}, 구신 ${i18n.elementLabel(y.gushin)}`
    : `Selected: Yongshin ${i18n.elementLabel(y.yongshin)}, Heeshin ${i18n.elementLabel(y.heeshin)}, Gishin ${i18n.elementLabel(y.gishin)}, Gushin ${i18n.elementLabel(y.gushin)}`;

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
      <div className="yongshin-rationale">
        <div className="yongshin-rationale-title">{rationaleTitle}</div>
        <div className="yongshin-rationale-line">{scoreLine}</div>
        <div className="yongshin-rationale-line">{methodLine}</div>
        <div className="yongshin-rationale-line">{mapLine}</div>
        <div className="yongshin-rationale-line">{pickLine}</div>
      </div>
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
