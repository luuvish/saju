'use client';

import type { SajuResult } from 'saju-lib';
import { I18n, bazi } from 'saju-lib';
import type { Element } from 'saju-lib';

const i18n = new I18n('Ko');

function elColor(el: Element): string {
  const map: Record<Element, string> = {
    Wood: 'element-wood', Fire: 'element-fire', Earth: 'element-earth',
    Metal: 'element-metal', Water: 'element-water',
  };
  return map[el];
}

interface Props { result: SajuResult }

export default function DaewonTimeline({ result }: Props) {
  const dayStem = result.dayPillar.stem;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <h2 className="text-lg font-semibold mb-2">
        {i18n.daewonHeading()} ({i18n.directionLabel(result.daewonDirection)})
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Start: {i18n.formatAge(result.daewonStartMonths, false)}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {result.daewonItems.map((item, idx) => {
          const stemEl = bazi.stemElement(item.pillar.stem);
          const branchEl = bazi.branchElement(item.pillar.branch);
          const stemGod = bazi.tenGod(dayStem, item.pillar.stem);
          const branchGod = bazi.tenGod(dayStem, bazi.hiddenStems(item.pillar.branch)[0]);

          return (
            <div key={idx} className="flex-shrink-0 w-24 bg-white dark:bg-gray-800 rounded-lg p-2 text-center text-sm border border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-400 mb-1">
                {i18n.formatAge(item.startMonths, false)}
              </div>
              <div className={`text-lg font-bold ${elColor(stemEl)}`}>
                {i18n.stemLabel(item.pillar.stem)}
              </div>
              <div className={`text-lg font-bold ${elColor(branchEl)}`}>
                {i18n.branchLabel(item.pillar.branch)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-tight">
                {i18n.tenGodLabel(stemGod)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                {i18n.tenGodLabel(branchGod)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
