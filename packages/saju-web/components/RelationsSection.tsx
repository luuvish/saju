'use client';

import type { SajuResult } from 'saju-lib';
import { I18n } from 'saju-lib';

const i18n = new I18n('Ko');

interface Props { result: SajuResult }

export default function RelationsSection({ result }: Props) {
  const { stemInteractions, branchInteractions } = result;

  if (stemInteractions.length === 0 && branchInteractions.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <h2 className="text-lg font-semibold mb-4">{i18n.relationsHeading()}</h2>
      <div className="space-y-4">
        {stemInteractions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Stem Interactions</h3>
            <div className="space-y-1">
              {stemInteractions.map((si, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm bg-white dark:bg-gray-800 rounded p-2">
                  <span className="font-medium">{i18n.stemRelationLabel(si.relation)}</span>
                  <span className="text-gray-500">
                    {i18n.stemLabel(si.stems[0])} - {i18n.stemLabel(si.stems[1])}
                  </span>
                  <span className="text-gray-400">
                    ({si.positions[0]} - {si.positions[1]})
                  </span>
                  {si.resultElement && (
                    <span className={`element-${si.resultElement.toLowerCase()}`}>
                      [{si.resultElement}]
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {branchInteractions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Branch Interactions</h3>
            <div className="space-y-1">
              {branchInteractions.map((bi, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm bg-white dark:bg-gray-800 rounded p-2">
                  <span className="font-medium">{i18n.branchRelationLabel(bi.relation)}</span>
                  <span className="text-gray-500">
                    {bi.branches.map((b) => i18n.branchLabel(b)).join(' - ')}
                  </span>
                  <span className="text-gray-400">
                    ({bi.positions.join(' - ')})
                  </span>
                  {bi.resultElement && (
                    <span className={`element-${bi.resultElement.toLowerCase()}`}>
                      [{bi.resultElement}]
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
