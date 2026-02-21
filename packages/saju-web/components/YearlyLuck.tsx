'use client';

import type { SajuResult } from 'saju-lib';
import { I18n, bazi, astro } from 'saju-lib';
import type { Element } from 'saju-lib';

const i18n = new I18n('Ko');

function elColor(el: Element): string {
  const map: Record<Element, string> = {
    Wood: 'element-wood', Fire: 'element-fire', Earth: 'element-earth',
    Metal: 'element-metal', Water: 'element-water',
  };
  return map[el];
}

function formatJd(jd: number): string {
  const d = astro.datetimeFromJd(jd);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  return `${d.getUTCFullYear()}-${mm}-${dd} ${hh}:${mi}`;
}

interface Props { result: SajuResult }

export default function YearlyLuck({ result }: Props) {
  const dayStem = result.dayPillar.stem;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <h2 className="text-lg font-semibold mb-4">{i18n.yearlyLuckHeading()}</h2>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {result.yearlyLuck.map((y, idx) => {
          const stemEl = bazi.stemElement(y.pillar.stem);
          const branchEl = bazi.branchElement(y.pillar.branch);
          const stemGod = bazi.tenGod(dayStem, y.pillar.stem);
          const branchGod = bazi.tenGod(dayStem, bazi.hiddenStems(y.pillar.branch)[0]);

          return (
            <div key={idx} className="flex-shrink-0 w-28 bg-white dark:bg-gray-800 rounded-lg p-2 text-center text-sm border border-gray-200 dark:border-gray-700">
              <div className="font-medium mb-1">{y.year}</div>
              <div className={`text-lg font-bold ${elColor(stemEl)}`}>
                {i18n.stemLabel(y.pillar.stem)}
              </div>
              <div className={`text-lg font-bold ${elColor(branchEl)}`}>
                {i18n.branchLabel(y.pillar.branch)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                {i18n.tenGodLabel(stemGod)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                {i18n.tenGodLabel(branchGod)}
              </div>
              <div className="text-[10px] text-gray-400 mt-1 leading-tight">
                {formatJd(y.startJd)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
