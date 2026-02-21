/**
 * @fileoverview 세운(歲運) 타임라인 컴포넌트
 *
 * 매년의 세운(연운)을 가로 타임라인으로 표시한다.
 * 입춘(立春) 기준으로 올해에 해당하는 세운을 하이라이트한다.
 */


import { useState, useEffect } from 'react';
import type { SajuResult } from 'saju-lib';
import { bazi, astro } from 'saju-lib';
import type { I18n } from 'saju-lib';
import { elementCss, stemSub, branchSub } from './utils';

interface Props { result: SajuResult; i18n: I18n }

export default function YearlyLuck({ result, i18n }: Props) {
  const ds = result.dayPillar.stem;
  const [nowJd, setNowJd] = useState(0);

  useEffect(() => {
    setNowJd(astro.jdFromDatetime(new Date()));
  }, []);

  return (
    <section className="section">
      <h3>{i18n.yearlyLuckHeading()}</h3>
      <div className="luck-timeline luck-compact">
        {result.yearlyLuck.map((y, idx) => {
          const p = y.pillar;
          const stemEl = bazi.stemElement(p.stem);
          const branchEl = bazi.branchElement(p.branch);
          const isCurrent = nowJd >= y.startJd && nowJd < y.endJd;
          return (
            <div key={idx} className={`luck-card${isCurrent ? ' luck-current' : ''}`}>
              <div className="luck-age">{i18n.formatYearLabel(y.year)}</div>
              <div className="luck-god">{i18n.tenGodLabel(bazi.tenGod(ds, p.stem))}</div>
              <div className={`pt-card ${elementCss(stemEl)}`}>{i18n.stemLabel(p.stem)}</div>
              <div className="pt-sub">{stemSub(i18n, p.stem)}</div>
              <div className={`pt-card ${elementCss(branchEl)}`}>{i18n.branchLabel(p.branch)}</div>
              <div className="pt-sub">{branchSub(i18n, p.branch)}</div>
              <div className="luck-god">{i18n.tenGodLabel(bazi.tenGodBranch(ds, p.branch))}</div>
              <div className="luck-stage">{i18n.stageLabel(bazi.twelveStageIndex(ds, p.branch))}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
