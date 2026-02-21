'use client';

import type { SajuResult } from 'saju-lib';
import { bazi } from 'saju-lib';
import type { I18n } from 'saju-lib';
import type { Element } from 'saju-lib';

const ELEMENTS: Element[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

function elementCss(el: Element): string {
  const map: Record<Element, string> = {
    Wood: 'element-wood', Fire: 'element-fire', Earth: 'element-earth',
    Metal: 'element-metal', Water: 'element-water',
  };
  return map[el];
}

interface Props { result: SajuResult; i18n: I18n }

export default function ElementsChart({ result, i18n }: Props) {
  const pillars = [result.yearPillar, result.monthPillar, result.dayPillar, result.hourPillar];
  const counts = bazi.elementsCount(pillars);
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <section className="section">
      <h3>{i18n.elementsHeading()}</h3>
      <div className="elements-section">
        <div className="elements-bars">
          {ELEMENTS.map((el, idx) => {
            const pct = total > 0 ? Math.round((counts[idx] / total) * 100) : 0;
            return (
              <div key={el} className="element-bar-group">
                <div className={`element-bar-label ${elementCss(el)}`}>
                  {i18n.elementShortLabel(el)}
                </div>
                <div className="element-bar-track">
                  <div
                    className={`element-bar-fill ${elementCss(el)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="element-bar-count">{counts[idx]}</div>
              </div>
            );
          })}
        </div>
        <div className="chart-container">
          <ElementDoughnut counts={counts} />
        </div>
      </div>
    </section>
  );
}

function ElementDoughnut({ counts }: { counts: number[] }) {
  const colors = ['#2e7d32', '#d32f2f', '#f9a825', '#bdbdbd', '#424242'];
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const outer = 80;
  const inner = 45;

  let cumAngle = -Math.PI / 2;
  const paths = counts.map((count, idx) => {
    if (count === 0) return null;
    const angle = (count / total) * 2 * Math.PI;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;
    cumAngle = endAngle;

    const largeArc = angle > Math.PI ? 1 : 0;
    const x1o = cx + outer * Math.cos(startAngle);
    const y1o = cy + outer * Math.sin(startAngle);
    const x2o = cx + outer * Math.cos(endAngle);
    const y2o = cy + outer * Math.sin(endAngle);
    const x1i = cx + inner * Math.cos(endAngle);
    const y1i = cy + inner * Math.sin(endAngle);
    const x2i = cx + inner * Math.cos(startAngle);
    const y2i = cy + inner * Math.sin(startAngle);

    const d = [
      `M ${x1o} ${y1o}`,
      `A ${outer} ${outer} 0 ${largeArc} 1 ${x2o} ${y2o}`,
      `L ${x1i} ${y1i}`,
      `A ${inner} ${inner} 0 ${largeArc} 0 ${x2i} ${y2i}`,
      'Z',
    ].join(' ');

    return <path key={idx} d={d} fill={colors[idx]} />;
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {paths}
    </svg>
  );
}
