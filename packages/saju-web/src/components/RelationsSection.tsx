/**
 * @fileoverview 합충형파해(合沖刑破害) 관계 표시 컴포넌트
 *
 * 사주 네 기둥 간의 천간 합/충과 지지 육합/충/형/파/해/방합/삼합을
 * 리스트 형태로 표시한다. 관계가 없으면 섹션 자체를 렌더링하지 않는다.
 */

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { bazi } from 'saju-lib';
import type { SajuResult } from 'saju-lib';
import type { I18n } from 'saju-lib';
import type { StemRelationType, BranchRelationType, PillarPosition, Pillar } from 'saju-lib';
import { elementCss } from './utils';
import { PREVIEW_PILLAR_ORDER, sortPillarPositions } from './pillarOrder';
import {
  EMPTY_TOOLTIP_STATE,
  closeAllTooltips,
  closeTooltipHover,
  isTooltipOpen,
  nextTooltipStateOnKey,
  openTooltipHover,
  togglePinnedTooltip,
} from './tooltipState';
import { shouldCloseTooltipOnPointerDown } from './tooltipDom';

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

type RelationType = StemRelationType | BranchRelationType;
type RelationTone = 'good' | 'warn' | 'neutral';

interface RelationGuide {
  tag: string;
  summary: string;
  tone: RelationTone;
}

/** 관계 타입을 쉬운 태그 + 한 줄 설명으로 변환한다 */
function relationGuide(i18n: I18n, rel: RelationType): RelationGuide {
  const ko: Record<RelationType, RelationGuide> = {
    Hap: { tag: '조화', summary: '서로 끌어당겨 협력·완화 흐름이 생깁니다.', tone: 'good' },
    Chung: { tag: '충돌', summary: '정면 충돌로 변화 압력이 커집니다.', tone: 'warn' },
    YukHap: { tag: '결합', summary: '둘이 짝을 이루며 실질적인 합력이 생깁니다.', tone: 'good' },
    Hyung: { tag: '압박', summary: '답답함·마찰이 반복되기 쉬운 관계입니다.', tone: 'warn' },
    Pa: { tag: '균열', summary: '기존 흐름이 깨져 조정이 필요해질 수 있습니다.', tone: 'warn' },
    Hae: { tag: '소모', summary: '오해·피로처럼 은근한 손실이 생길 수 있습니다.', tone: 'warn' },
    BangHap: { tag: '강화', summary: '같은 계절 기운이 모여 특정 오행이 강해집니다.', tone: 'neutral' },
    SamHap: { tag: '집중', summary: '세 기운이 결합해 특정 오행이 뚜렷해집니다.', tone: 'neutral' },
  };
  const en: Record<RelationType, RelationGuide> = {
    Hap: { tag: 'Harmony', summary: 'The two energies blend and cooperate.', tone: 'good' },
    Chung: { tag: 'Clash', summary: 'Direct tension pushes change and instability.', tone: 'warn' },
    YukHap: { tag: 'Pairing', summary: 'A practical two-way bond forms.', tone: 'good' },
    Hyung: { tag: 'Pressure', summary: 'Friction and strain can repeat.', tone: 'warn' },
    Pa: { tag: 'Crack', summary: 'Existing flow may break and need adjustment.', tone: 'warn' },
    Hae: { tag: 'Drain', summary: 'Subtle loss through misunderstanding or fatigue.', tone: 'warn' },
    BangHap: { tag: 'Boost', summary: 'Seasonal alignment amplifies one element.', tone: 'neutral' },
    SamHap: { tag: 'Focus', summary: 'Three-way convergence strongly emphasizes one element.', tone: 'neutral' },
  };
  return (i18n.lang === 'Ko' ? ko : en)[rel];
}

/** 기둥 위치 배열을 사람이 읽기 쉬운 문자열로 변환한다 */
function positionPhrase(i18n: I18n, positions: PillarPosition[]): string {
  const ordered = sortPillarPositions(positions);
  if (i18n.lang === 'Ko') {
    return ordered.map((p) => `${i18n.positionLabel(p)}주`).join(' · ');
  }
  return ordered.map((p) => `${i18n.positionLabel(p)} pillar`).join(' · ');
}

interface Props { result: SajuResult; i18n: I18n }

export default function RelationsSection({ result, i18n }: Props) {
  const { stemInteractions, branchInteractions } = result;
  const hasInteractions = stemInteractions.length > 0 || branchInteractions.length > 0;
  const [tooltipState, setTooltipState] = useState(EMPTY_TOOLTIP_STATE);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!hasInteractions) return;
    const onPointerDownOutside = (event: PointerEvent) => {
      const root = sectionRef.current;
      if (!shouldCloseTooltipOnPointerDown(root, event.target)) return;
      setTooltipState((state) => closeAllTooltips(state));
    };

    document.addEventListener('pointerdown', onPointerDownOutside, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDownOutside, true);
    };
  }, [hasInteractions]);

  if (!hasInteractions) return null;

  const pillars: Record<PillarPosition, Pillar> = {
    Year: result.yearPillar,
    Month: result.monthPillar,
    Day: result.dayPillar,
    Hour: result.hourPillar,
  };
  const tooltipTitle = i18n.lang === 'Ko' ? '관련 천간/지지' : 'Related Stems/Branches';
  const stemLegend = i18n.lang === 'Ko' ? '파란 테두리: 관련 천간' : 'Blue border: related stem';
  const branchLegend = i18n.lang === 'Ko' ? '초록 테두리: 관련 지지' : 'Green border: related branch';

  function onTriggerKeyDown(cardKey: string, e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    setTooltipState((state) => nextTooltipStateOnKey(state, cardKey, e.key));
  }

  return (
    <section ref={sectionRef} className="section section-relations">
      <h3>{i18n.relationsHeading()}</h3>
      <div className="relations-list">
        {stemInteractions.map((si, idx) => {
          const guide = relationGuide(i18n, si.relation);
          const posLabel = positionPhrase(i18n, si.positions);
          const detail = si.resultElement
            ? `${i18n.stemLabel(si.stems[0])}-${i18n.stemLabel(si.stems[1])} \u2192 ${i18n.elementLabel(si.resultElement)}`
            : `${i18n.stemLabel(si.stems[0])}-${i18n.stemLabel(si.stems[1])}`;
          const whereLabel = i18n.lang === 'Ko' ? `발생 위치: ${posLabel}` : `Where: ${posLabel}`;
          const detailLabel = i18n.lang === 'Ko' ? `관계 조합: 천간 ${detail}` : `Pairing: stems ${detail}`;
          const cardKey = `stem-${idx}`;
          const isOpen = isTooltipOpen(tooltipState, cardKey);
          const tooltipId = `relation-tooltip-${cardKey}`;
          const involved = new Set<PillarPosition>(si.positions);
          const previewCols = PREVIEW_PILLAR_ORDER.map((pos) => {
            const pillar = pillars[pos];
            return {
              pos,
              pillar,
              involved: involved.has(pos),
              stemEl: bazi.stemElement(pillar.stem),
              branchEl: bazi.branchElement(pillar.branch),
            };
          });
          const miniStyle = { '--rel-cols': previewCols.length } as CSSProperties;
          return (
            <article
              key={`s${idx}`}
              className={`relation-item ${interactionCss(si.relation)}${isOpen ? ' is-open' : ''}`}
            >
              <button
                type="button"
                className="relation-trigger"
                aria-controls={tooltipId}
                aria-expanded={isOpen}
                aria-describedby={isOpen ? tooltipId : undefined}
                onClick={() => setTooltipState((state) => togglePinnedTooltip(state, cardKey))}
                onMouseEnter={() => setTooltipState((state) => openTooltipHover(state, cardKey))}
                onMouseLeave={() => setTooltipState((state) => closeTooltipHover(state, cardKey))}
                onFocus={() => setTooltipState((state) => openTooltipHover(state, cardKey))}
                onBlur={() => setTooltipState((state) => closeTooltipHover(state, cardKey))}
                onKeyDown={(e) => onTriggerKeyDown(cardKey, e)}
              >
                <span className="relation-title-row">
                  <span className="relation-type">{i18n.stemRelationLabel(si.relation)}</span>
                  <span className={`relation-easy relation-easy-${guide.tone}`}>{guide.tag}</span>
                </span>
                <span className="relation-meta">{whereLabel}</span>
                <span className="relation-meta">{detailLabel}</span>
                <span className="relation-help">{guide.summary}</span>
              </button>
              <div id={tooltipId} className="relation-hover" role="tooltip" aria-hidden={!isOpen}>
                <div className="relation-hover-title">{tooltipTitle}</div>
                <div className="relation-hover-legend">{stemLegend}</div>
                <div className="relation-mini-table" style={miniStyle}>
                  <div className="relation-mini-row relation-mini-header">
                    {previewCols.map((col) => (
                      <div key={`s${idx}-${col.pos}-h`} className="relation-mini-cell">
                        <span className="relation-mini-pos">{i18n.pillarKindLabel(col.pos)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="relation-mini-row">
                    {previewCols.map((col) => (
                      <div
                        key={`s${idx}-${col.pos}-s`}
                        className={`relation-mini-cell${col.involved ? ' is-stem-involved' : ''}`}
                      >
                        <div className={`pt-card relation-mini-card ${elementCss(col.stemEl)}`}>
                          {i18n.stemLabel(col.pillar.stem)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="relation-mini-row">
                    {previewCols.map((col) => (
                      <div key={`s${idx}-${col.pos}-b`} className="relation-mini-cell">
                        <div className={`pt-card relation-mini-card ${elementCss(col.branchEl)}`}>
                          {i18n.branchLabel(col.pillar.branch)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        {branchInteractions.map((bi, idx) => {
          const guide = relationGuide(i18n, bi.relation);
          const posLabel = positionPhrase(i18n, bi.positions);
          const branchStr = bi.branches.map((b) => i18n.branchLabel(b)).join('-');
          const detail = bi.resultElement
            ? `${branchStr} \u2192 ${i18n.elementLabel(bi.resultElement)}`
            : branchStr;
          const whereLabel = i18n.lang === 'Ko' ? `발생 위치: ${posLabel}` : `Where: ${posLabel}`;
          const detailLabel = i18n.lang === 'Ko' ? `관계 조합: 지지 ${detail}` : `Pairing: branches ${detail}`;
          const cardKey = `branch-${idx}`;
          const isOpen = isTooltipOpen(tooltipState, cardKey);
          const tooltipId = `relation-tooltip-${cardKey}`;
          const involved = new Set<PillarPosition>(bi.positions);
          const previewCols = PREVIEW_PILLAR_ORDER.map((pos) => {
            const pillar = pillars[pos];
            return {
              pos,
              pillar,
              involved: involved.has(pos),
              stemEl: bazi.stemElement(pillar.stem),
              branchEl: bazi.branchElement(pillar.branch),
            };
          });
          const miniStyle = { '--rel-cols': previewCols.length } as CSSProperties;
          return (
            <article
              key={`b${idx}`}
              className={`relation-item ${interactionCss(bi.relation)}${isOpen ? ' is-open' : ''}`}
            >
              <button
                type="button"
                className="relation-trigger"
                aria-controls={tooltipId}
                aria-expanded={isOpen}
                aria-describedby={isOpen ? tooltipId : undefined}
                onClick={() => setTooltipState((state) => togglePinnedTooltip(state, cardKey))}
                onMouseEnter={() => setTooltipState((state) => openTooltipHover(state, cardKey))}
                onMouseLeave={() => setTooltipState((state) => closeTooltipHover(state, cardKey))}
                onFocus={() => setTooltipState((state) => openTooltipHover(state, cardKey))}
                onBlur={() => setTooltipState((state) => closeTooltipHover(state, cardKey))}
                onKeyDown={(e) => onTriggerKeyDown(cardKey, e)}
              >
                <span className="relation-title-row">
                  <span className="relation-type">{i18n.branchRelationLabel(bi.relation)}</span>
                  <span className={`relation-easy relation-easy-${guide.tone}`}>{guide.tag}</span>
                </span>
                <span className="relation-meta">{whereLabel}</span>
                <span className="relation-meta">{detailLabel}</span>
                <span className="relation-help">{guide.summary}</span>
              </button>
              <div id={tooltipId} className="relation-hover" role="tooltip" aria-hidden={!isOpen}>
                <div className="relation-hover-title">{tooltipTitle}</div>
                <div className="relation-hover-legend">{branchLegend}</div>
                <div className="relation-mini-table" style={miniStyle}>
                  <div className="relation-mini-row relation-mini-header">
                    {previewCols.map((col) => (
                      <div key={`b${idx}-${col.pos}-h`} className="relation-mini-cell">
                        <span className="relation-mini-pos">{i18n.pillarKindLabel(col.pos)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="relation-mini-row">
                    {previewCols.map((col) => (
                      <div key={`b${idx}-${col.pos}-s`} className="relation-mini-cell">
                        <div className={`pt-card relation-mini-card ${elementCss(col.stemEl)}`}>
                          {i18n.stemLabel(col.pillar.stem)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="relation-mini-row">
                    {previewCols.map((col) => (
                      <div
                        key={`b${idx}-${col.pos}-b`}
                        className={`relation-mini-cell${col.involved ? ' is-branch-involved' : ''}`}
                      >
                        <div className={`pt-card relation-mini-card ${elementCss(col.branchEl)}`}>
                          {i18n.branchLabel(col.pillar.branch)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
