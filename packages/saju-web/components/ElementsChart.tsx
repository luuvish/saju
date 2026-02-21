'use client';

import type { SajuResult } from 'saju-lib';
import { bazi } from 'saju-lib';
import type { Element } from 'saju-lib';

const ELEMENTS: Element[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

const ELEMENT_LABELS: Record<Element, string> = {
  Wood: '木', Fire: '火', Earth: '土', Metal: '金', Water: '水',
};

const ELEMENT_COLORS: Record<Element, string> = {
  Wood: 'bg-green-400 dark:bg-green-600',
  Fire: 'bg-red-400 dark:bg-red-600',
  Earth: 'bg-yellow-400 dark:bg-yellow-600',
  Metal: 'bg-gray-400 dark:bg-gray-500',
  Water: 'bg-blue-400 dark:bg-blue-600',
};

interface Props { result: SajuResult }

export default function ElementsChart({ result }: Props) {
  const pillars = [result.yearPillar, result.monthPillar, result.dayPillar, result.hourPillar];
  const counts: Record<Element, number> = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };

  for (const p of pillars) {
    counts[bazi.stemElement(p.stem)]++;
    counts[bazi.branchElement(p.branch)]++;
  }

  const max = Math.max(...Object.values(counts), 1);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <h2 className="text-lg font-semibold mb-4">Five Elements</h2>
      <div className="space-y-3">
        {ELEMENTS.map((el) => (
          <div key={el} className="flex items-center gap-3">
            <div className="w-8 text-center text-lg font-bold">{ELEMENT_LABELS[el]}</div>
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${ELEMENT_COLORS[el]} flex items-center justify-end pr-2`}
                style={{ width: `${(counts[el] / max) * 100}%`, minWidth: counts[el] > 0 ? '2rem' : '0' }}
              >
                {counts[el] > 0 && <span className="text-xs font-bold text-white">{counts[el]}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
