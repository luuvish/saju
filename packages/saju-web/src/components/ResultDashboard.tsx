/**
 * @fileoverview 사주 결과 대시보드 컴포넌트
 *
 * 사주 계산 결과(SajuResult)를 받아 모든 하위 컴포넌트를 조합하여
 * 통합 결과 화면을 렌더링한다. 입력 요약, 기둥 테이블, 관계,
 * 신살, 강약, 오행, 대운, 세운, 월운 섹션을 포함한다.
 */


import { useMemo } from 'react';
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

interface Props { result: SajuResult; lang: Lang; name?: string }

export default function ResultDashboard({ result, lang, name }: Props) {
  const i18n = useMemo(() => new I18n(lang), [lang]);

  const calLabel = i18n.calendarLabel(result.calendarIsLunar, result.leapMonth);
  const lmt = result.lmtInfo;
  const lmtShort = lmt ? `${lmt.correctionSeconds > 0 ? '+' : ''}${lmt.correctionSeconds}s${lmt.locationLabel ? ` ${lmt.locationLabel}` : ''}` : null;

  // 프로필 요약 문자열 조합
  const parts: string[] = [];
  if (name) parts.push(name);
  parts.push(
    `${calLabel} ${result.inputDate} ${result.inputTime}`,
    i18n.genderValue(result.gender),
    result.tzName,
  );
  if (lmtShort) parts.push(`LMT ${lmtShort}`);

  return (
    <div className="result-dashboard">
      <section className="section">
        <h2>{i18n.title()}</h2>
        <p className="profile-summary">{parts.join('  ·  ')}</p>
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
