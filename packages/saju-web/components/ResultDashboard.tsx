'use client';

import type { SajuResult } from 'saju-lib';
import PillarTable from './PillarTable';
import ElementsChart from './ElementsChart';
import StrengthSection from './StrengthSection';
import RelationsSection from './RelationsSection';
import ShinsalSection from './ShinsalSection';
import DaewonTimeline from './DaewonTimeline';
import YearlyLuck from './YearlyLuck';
import MonthlyLuck from './MonthlyLuck';

interface Props {
  result: SajuResult;
}

export default function ResultDashboard({ result }: Props) {
  return (
    <div className="space-y-6">
      <HeaderInfo result={result} />
      <PillarTable result={result} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ElementsChart result={result} />
        <StrengthSection result={result} />
      </div>
      <RelationsSection result={result} />
      <ShinsalSection result={result} />
      <DaewonTimeline result={result} />
      <YearlyLuck result={result} />
      <MonthlyLuck result={result} />
    </div>
  );
}

function HeaderInfo({ result }: Props) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <h2 className="text-lg font-semibold mb-2">Result</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Input: </span>
          {result.calendarIsLunar ? 'Lunar' : 'Solar'} {result.inputDate} {result.inputTime}
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Timezone: </span>
          {result.tzName}
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Gender: </span>
          {result.gender}
        </div>
        {result.convertedSolar && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Solar: </span>
            {result.convertedSolar}
          </div>
        )}
        {result.convertedLunar && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Lunar: </span>
            {result.convertedLunar.year}-{String(result.convertedLunar.month).padStart(2, '0')}-{String(result.convertedLunar.day).padStart(2, '0')}
            {result.convertedLunar.isLeap ? ' (Leap)' : ''}
          </div>
        )}
        {result.lmtInfo && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">LMT: </span>
            {result.lmtInfo.correctedLocal} ({result.lmtInfo.correctionSeconds > 0 ? '+' : ''}{result.lmtInfo.correctionSeconds}s)
          </div>
        )}
      </div>
    </div>
  );
}
