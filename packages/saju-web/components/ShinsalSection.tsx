'use client';

import type { SajuResult } from 'saju-lib';
import { I18n } from 'saju-lib';

const i18n = new I18n('Ko');

interface Props { result: SajuResult }

export default function ShinsalSection({ result }: Props) {
  const { shinsalEntries } = result;

  if (shinsalEntries.length === 0) return null;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <h2 className="text-lg font-semibold mb-4">{i18n.shinsalExtraHeading()}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {shinsalEntries.map((entry, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 rounded p-3 text-sm">
            <div className="font-medium">{i18n.shinsalKindLabel(entry.kind)}</div>
            <div className="text-gray-500 dark:text-gray-400 mt-1">
              <span>{i18n.basisPositionLabel(entry.basis)}</span>
              <span className="mx-1">|</span>
              <span>{entry.foundAt.map((p) => i18n.positionLabel(p)).join(', ')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
