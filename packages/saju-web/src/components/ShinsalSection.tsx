/**
 * @fileoverview 주요 신살(神殺) 표시 컴포넌트
 *
 * 도화살, 천을귀인, 역마살 등 13종의 주요 신살을
 * 그리드 레이아웃으로 표시한다. 신살이 없으면 렌더링하지 않는다.
 */

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { bazi } from 'saju-lib';
import type { SajuResult } from 'saju-lib';
import type { I18n } from 'saju-lib';
import type { Pillar, PillarPosition, ShinsalKind } from 'saju-lib';
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

type ShinsalTone = 'good' | 'warn' | 'neutral';

interface ShinsalGuide {
  tone: ShinsalTone;
  toneLabel: string;
  summary: string;
}

/** 주요 신살을 쉬운 표현으로 변환한다 */
function shinsalGuide(i18n: I18n, kind: ShinsalKind): ShinsalGuide {
  const ko: Record<ShinsalKind, ShinsalGuide> = {
    DoHwaSal: { tone: 'neutral', toneLabel: '특성', summary: '매력·인연 이슈가 두드러질 수 있습니다.' },
    CheonEulGwiIn: { tone: 'good', toneLabel: '도움', summary: '귀인 도움과 문제 해결 실마리가 잘 들어옵니다.' },
    YeokMaSal: { tone: 'neutral', toneLabel: '특성', summary: '이동·변화·활동량이 커지기 쉬운 흐름입니다.' },
    MunChangGwiIn: { tone: 'good', toneLabel: '도움', summary: '학습·문서·시험 관련 강점이 살아납니다.' },
    HakDangGwiIn: { tone: 'good', toneLabel: '도움', summary: '학업·자격·성과를 쌓는 데 유리합니다.' },
    CheonDeokGwiIn: { tone: 'good', toneLabel: '도움', summary: '문제가 커지기 전에 완충될 가능성이 큽니다.' },
    WolDeokGwiIn: { tone: 'good', toneLabel: '도움', summary: '관계·상황에서 중재와 완화가 잘 됩니다.' },
    YangInSal: { tone: 'warn', toneLabel: '주의', summary: '추진력은 강하지만 과열·강행을 조심해야 합니다.' },
    GongMang: { tone: 'warn', toneLabel: '주의', summary: '기대 대비 공백감이나 지연이 생길 수 있습니다.' },
    BaekHoSal: { tone: 'warn', toneLabel: '주의', summary: '급한 판단과 안전 이슈를 특히 신경 쓰세요.' },
    GoeGangSal: { tone: 'neutral', toneLabel: '특성', summary: '주관·돌파력이 강해 리더십이 분명해집니다.' },
    WonJinSal: { tone: 'warn', toneLabel: '주의', summary: '감정 오해나 관계 마찰이 쌓이기 쉽습니다.' },
    GwiMunGwanSal: { tone: 'warn', toneLabel: '주의', summary: '예민함·생각 과부하가 커질 수 있습니다.' },
  };
  const en: Record<ShinsalKind, ShinsalGuide> = {
    DoHwaSal: { tone: 'neutral', toneLabel: 'Trait', summary: 'Charm and relationship signals become more visible.' },
    CheonEulGwiIn: { tone: 'good', toneLabel: 'Support', summary: 'Helpful people and recovery paths are easier to find.' },
    YeokMaSal: { tone: 'neutral', toneLabel: 'Trait', summary: 'Movement, change, and activity tend to increase.' },
    MunChangGwiIn: { tone: 'good', toneLabel: 'Support', summary: 'Strength in study, writing, and exams stands out.' },
    HakDangGwiIn: { tone: 'good', toneLabel: 'Support', summary: 'Good for learning outcomes and credentials.' },
    CheonDeokGwiIn: { tone: 'good', toneLabel: 'Support', summary: 'Issues are more likely to be softened early.' },
    WolDeokGwiIn: { tone: 'good', toneLabel: 'Support', summary: 'Mediation and easing of conflicts works better.' },
    YangInSal: { tone: 'warn', toneLabel: 'Caution', summary: 'Strong drive is useful, but overforce can backfire.' },
    GongMang: { tone: 'warn', toneLabel: 'Caution', summary: 'Delays or an "empty" feeling may appear.' },
    BaekHoSal: { tone: 'warn', toneLabel: 'Caution', summary: 'Pay extra attention to haste and safety risks.' },
    GoeGangSal: { tone: 'neutral', toneLabel: 'Trait', summary: 'Strong will and breakthrough energy are emphasized.' },
    WonJinSal: { tone: 'warn', toneLabel: 'Caution', summary: 'Misunderstanding and relational friction can accumulate.' },
    GwiMunGwanSal: { tone: 'warn', toneLabel: 'Caution', summary: 'Sensitivity and mental load can run high.' },
  };
  return (i18n.lang === 'Ko' ? ko : en)[kind];
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

export default function ShinsalSection({ result, i18n }: Props) {
  const { shinsalEntries } = result;
  const hasShinsalEntries = shinsalEntries.length > 0;
  const [tooltipState, setTooltipState] = useState(EMPTY_TOOLTIP_STATE);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!hasShinsalEntries) return;
    const onPointerDownOutside = (event: PointerEvent) => {
      const root = sectionRef.current;
      if (!shouldCloseTooltipOnPointerDown(root, event.target)) return;
      setTooltipState((state) => closeAllTooltips(state));
    };

    document.addEventListener('pointerdown', onPointerDownOutside, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDownOutside, true);
    };
  }, [hasShinsalEntries]);

  if (!hasShinsalEntries) return null;

  const pillars: Record<PillarPosition, Pillar> = {
    Year: result.yearPillar,
    Month: result.monthPillar,
    Day: result.dayPillar,
    Hour: result.hourPillar,
  };
  const tooltipTitle = i18n.lang === 'Ko' ? '관련 천간/지지' : 'Related Stems/Branches';
  const basisLegend = i18n.lang === 'Ko' ? '파란 테두리: 계산 기준 기둥' : 'Blue border: basis pillar';
  const foundLegend = i18n.lang === 'Ko' ? '초록 테두리: 실제로 나타난 기둥' : 'Green border: detected pillar';

  function onTriggerKeyDown(cardKey: string, e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    setTooltipState((state) => nextTooltipStateOnKey(state, cardKey, e.key));
  }

  return (
    <section ref={sectionRef} className="section section-shinsal">
      <h3>{i18n.shinsalExtraHeading()}</h3>
      <div className="shinsal-grid">
        {shinsalEntries.map((entry, idx) => {
          const guide = shinsalGuide(i18n, entry.kind);
          const foundAt = positionPhrase(i18n, entry.foundAt);
          const foundLabel = i18n.lang === 'Ko'
            ? `실제로 보인 기둥: ${foundAt}`
            : `Actually detected on: ${foundAt}`;
          const basisLabel = i18n.lang === 'Ko'
            ? `계산 기준 기둥: ${i18n.basisPositionLabel(entry.basis)}`
            : `Calculated from: ${i18n.basisPositionLabel(entry.basis)}`;
          const cardKey = `shinsal-${idx}`;
          const isOpen = isTooltipOpen(tooltipState, cardKey);
          const tooltipId = `shinsal-tooltip-${cardKey}`;
          const previewCols = PREVIEW_PILLAR_ORDER.map((pos) => {
            const pillar = pillars[pos];
            return {
              pos,
              pillar,
              isBasis: pos === entry.basis,
              isFound: entry.foundAt.includes(pos),
              stemEl: bazi.stemElement(pillar.stem),
              branchEl: bazi.branchElement(pillar.branch),
            };
          });
          const miniStyle = { '--sh-cols': previewCols.length } as CSSProperties;
          return (
            <article key={idx} className={`shinsal-item${isOpen ? ' is-open' : ''}`}>
              <button
                type="button"
                className="shinsal-trigger"
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
                <span className="shinsal-head">
                  <span className="shinsal-name">{i18n.shinsalKindLabel(entry.kind)}</span>
                  <span className={`shinsal-tone shinsal-tone-${guide.tone}`}>{guide.toneLabel}</span>
                </span>
                <span className="shinsal-desc">{guide.summary}</span>
                <span className="shinsal-meta">{foundLabel}</span>
                <span className="shinsal-meta">{basisLabel}</span>
              </button>
              <div id={tooltipId} className="shinsal-hover" role="tooltip" aria-hidden={!isOpen}>
                <div className="shinsal-hover-title">{tooltipTitle}</div>
                <div className="shinsal-hover-legend">{basisLegend}</div>
                <div className="shinsal-hover-legend">{foundLegend}</div>
                <div className="shinsal-mini-table" style={miniStyle}>
                  <div className="shinsal-mini-row shinsal-mini-header">
                    {previewCols.map((col) => (
                      <div key={`${idx}-${col.pos}-h`} className="shinsal-mini-cell">
                        <span className="shinsal-mini-pos">{i18n.pillarKindLabel(col.pos)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="shinsal-mini-row">
                    {previewCols.map((col) => (
                      <div
                        key={`${idx}-${col.pos}-s`}
                        className={`shinsal-mini-cell${col.isBasis ? ' is-basis' : ''}${col.isFound ? ' is-found' : ''}`}
                      >
                        <div className={`pt-card shinsal-mini-card ${elementCss(col.stemEl)}`}>
                          {i18n.stemLabel(col.pillar.stem)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="shinsal-mini-row">
                    {previewCols.map((col) => (
                      <div
                        key={`${idx}-${col.pos}-b`}
                        className={`shinsal-mini-cell${col.isBasis ? ' is-basis' : ''}${col.isFound ? ' is-found' : ''}`}
                      >
                        <div className={`pt-card shinsal-mini-card ${elementCss(col.branchEl)}`}>
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
