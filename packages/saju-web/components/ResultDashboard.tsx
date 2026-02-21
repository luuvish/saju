'use client';

import type { SajuResult } from 'saju-lib';
import { I18n } from 'saju-lib';
import type { Lang } from 'saju-lib';
import PillarTable from './PillarTable';
import ElementsChart from './ElementsChart';
import StrengthSection from './StrengthSection';
import RelationsSection from './RelationsSection';
import ShinsalSection from './ShinsalSection';
import DaewonTimeline from './DaewonTimeline';
import YearlyLuck from './YearlyLuck';
import MonthlyLuck from './MonthlyLuck';

interface Props { result: SajuResult; lang: Lang }

export default function ResultDashboard({ result, lang }: Props) {
  const i18n = new I18n(lang);

  const inputLine = `${i18n.inputLabel()}(${i18n.calendarLabel(result.calendarIsLunar, result.leapMonth)}): ${result.inputDate} ${result.inputTime} ${result.tzName}`;

  let convertedSolarLine: string | null = null;
  if (result.convertedSolar) {
    convertedSolarLine = `${i18n.convertedSolarLabel()}: ${result.convertedSolar} ${result.inputTime} ${result.tzName}`;
  }

  let convertedLunarLine: string | null = null;
  if (result.convertedLunar) {
    const l = result.convertedLunar;
    const suffix = l.isLeap ? i18n.leapSuffix() : '';
    convertedLunarLine = `${i18n.convertedLunarLabel()}: ${String(l.year).padStart(4, '0')}-${String(l.month).padStart(2, '0')}-${String(l.day).padStart(2, '0')}${suffix}`;
  }

  const genderLine = `${i18n.genderLabel()}: ${i18n.genderValue(result.gender)}`;

  return (
    <div className="result-dashboard">
      <section className="section">
        <h2>{i18n.title()}</h2>
        <ul className="header-info">
          <li>{inputLine}</li>
          {convertedSolarLine && <li>{convertedSolarLine}</li>}
          {convertedLunarLine && <li>{convertedLunarLine}</li>}
          <li>{genderLine}</li>
          {result.lmtInfo && (
            <li>
              {i18n.localMeanTimeLabel()}: {result.lmtInfo.correctionSeconds > 0 ? '+' : ''}{result.lmtInfo.correctionSeconds}s
              {result.lmtInfo.locationLabel && ` (${result.lmtInfo.locationLabel})`}
            </li>
          )}
        </ul>
      </section>

      <PillarTable result={result} i18n={i18n} />
      <RelationsSection result={result} i18n={i18n} />
      <ShinsalSection result={result} i18n={i18n} />
      <StrengthSection result={result} i18n={i18n} />
      <ElementsChart result={result} i18n={i18n} />
      <DaewonTimeline result={result} i18n={i18n} />
      <YearlyLuck result={result} i18n={i18n} />
      <MonthlyLuck result={result} i18n={i18n} />
    </div>
  );
}
