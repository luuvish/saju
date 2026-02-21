'use client';

import type { SajuResult } from 'saju-lib';
import { I18n } from 'saju-lib';

const i18n = new I18n('Ko');

interface Props { result: SajuResult }

export default function StrengthSection({ result }: Props) {
  const s = result.strength;

  const verdictColor =
    s.verdict === 'Strong'
      ? 'text-red-600 dark:text-red-400'
      : s.verdict === 'Weak'
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-green-600 dark:text-green-400';

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <h2 className="text-lg font-semibold mb-4">{i18n.strengthHeading()}</h2>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400 text-sm">{i18n.verdictLabel()}:</span>
          <span className={`text-2xl font-bold ${verdictColor}`}>
            {i18n.strengthVerdictLabel(s.verdict)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-white dark:bg-gray-800 rounded p-2">
            <div className="text-gray-500 dark:text-gray-400">{i18n.monthStageLabel()}</div>
            <div>{i18n.stageLabel(s.stageIndex)} ({i18n.strengthClassLabel(s.stageClass)})</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded p-2">
            <div className="text-gray-500 dark:text-gray-400">{i18n.rootLabel()}</div>
            <div>{s.rootCount}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded p-2">
            <div className="text-gray-500 dark:text-gray-400">{i18n.supportLabel()}</div>
            <div>Stem {s.supportStems} / Hidden {s.supportHidden}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded p-2">
            <div className="text-gray-500 dark:text-gray-400">{i18n.drainLabel()}</div>
            <div>Stem {s.drainStems} / Hidden {s.drainHidden}</div>
          </div>
        </div>
        <div className="text-sm bg-white dark:bg-gray-800 rounded p-2">
          <span className="text-gray-500 dark:text-gray-400">{i18n.scoreLabel()}: </span>
          <span className="font-mono font-bold">{s.total}</span>
        </div>
      </div>
    </div>
  );
}
