'use client';

import type { SajuResult } from 'saju-lib';
import { I18n, bazi } from 'saju-lib';
import type { Pillar, PillarPosition, Element } from 'saju-lib';

const i18n = new I18n('Ko');
const POSITIONS: PillarPosition[] = ['Hour', 'Day', 'Month', 'Year'];

function elementColorClass(el: Element): string {
  const map: Record<Element, string> = {
    Wood: 'element-wood', Fire: 'element-fire', Earth: 'element-earth',
    Metal: 'element-metal', Water: 'element-water',
  };
  return map[el];
}

function elementBgClass(el: Element): string {
  const map: Record<Element, string> = {
    Wood: 'element-bg-wood', Fire: 'element-bg-fire', Earth: 'element-bg-earth',
    Metal: 'element-bg-metal', Water: 'element-bg-water',
  };
  return map[el];
}

interface Props { result: SajuResult }

export default function PillarTable({ result }: Props) {
  const pillars: Record<PillarPosition, Pillar> = {
    Year: result.yearPillar, Month: result.monthPillar,
    Day: result.dayPillar, Hour: result.hourPillar,
  };
  const dayStem = result.dayPillar.stem;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <h2 className="text-lg font-semibold mb-4">{i18n.pillarsHeading()}</h2>
      <div className="grid grid-cols-4 gap-3 text-center">
        {POSITIONS.map((pos) => {
          const p = pillars[pos];
          const stemEl = bazi.stemElement(p.stem);
          const branchEl = bazi.branchElement(p.branch);
          const tenGod = pos !== 'Day' ? bazi.tenGod(dayStem, p.stem) : null;
          const hidden = bazi.hiddenStems(p.branch);
          const stageIdx = bazi.twelveStageIndex(dayStem, p.branch);
          const shinsalIdx = bazi.twelveShinsalIndex(result.yearPillar.branch, p.branch);

          return (
            <div key={pos} className="space-y-1">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {i18n.pillarKindLabel(pos as 'Year' | 'Month' | 'Day' | 'Hour')}
              </div>
              {tenGod && (
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  {i18n.tenGodLabel(tenGod)}
                </div>
              )}
              {pos === 'Day' && (
                <div className="text-xs text-gray-400">-</div>
              )}
              <div className={`text-2xl font-bold py-2 rounded ${elementBgClass(stemEl)}`}>
                <span className={elementColorClass(stemEl)}>
                  {i18n.stemLabel(p.stem)}
                </span>
              </div>
              <div className={`text-2xl font-bold py-2 rounded ${elementBgClass(branchEl)}`}>
                <span className={elementColorClass(branchEl)}>
                  {i18n.branchLabel(p.branch)}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 pt-1">
                <div className="font-medium">Hidden</div>
                {hidden.map((hs, idx) => {
                  const hEl = bazi.stemElement(hs);
                  const hGod = bazi.tenGod(dayStem, hs);
                  return (
                    <div key={idx} className={elementColorClass(hEl)}>
                      {i18n.stemLabel(hs)} {i18n.tenGodLabel(hGod)}
                    </div>
                  );
                })}
              </div>
              <div className="text-xs pt-1 border-t border-gray-200 dark:border-gray-700 mt-1">
                <div className="text-gray-500 dark:text-gray-400">12 Stage</div>
                <div>{i18n.stageLabel(stageIdx)}</div>
              </div>
              <div className="text-xs pt-1 border-t border-gray-200 dark:border-gray-700 mt-1">
                <div className="text-gray-500 dark:text-gray-400">12 Shinsal</div>
                <div>{i18n.shinsalLabel(shinsalIdx)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
