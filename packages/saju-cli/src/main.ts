import { Command } from 'commander';
import {
  calculate,
  type CalendarType,
  type SajuRequest,
  type SajuResult,
  type StrengthResult,
  type TimeZoneSpec,
  astro,
  bazi,
  luck,
  I18n,
  type Lang,
  type PillarKind,
  timezone,
  type Pillar,
  type SolarTerm,
  type Element,
  type Direction,
  type Gender,
} from 'saju-lib';

const program = new Command();

program
  .name('saju')
  .version('0.1.0')
  .description('Saju palja calculator using solar terms (입춘 기준)')
  .requiredOption('--date <YYYY-MM-DD>', 'Birth date')
  .requiredOption('--time <HH:MM>', 'Birth time')
  .requiredOption('--gender <male|female|m|f|남|여>', 'Gender')
  .option('--calendar <solar|lunar>', 'Calendar type', 'solar')
  .option('--leap-month', 'Lunar leap month', false)
  .option('--tz <timezone>', 'Timezone (IANA or offset)', 'Asia/Seoul')
  .option('--lang <ko|en>', 'Language', 'ko')
  .option('--daewon-count <n>', 'Daewon count', '10')
  .option('--month-year <YYYY>', 'Monthly luck year')
  .option('--year-start <YYYY>', 'Yearly luck start')
  .option('--year-count <n>', 'Yearly luck count', '10')
  .option('--local-mean-time', 'Use local mean time correction', false)
  .option('--longitude <DEG>', 'Longitude for LMT')
  .option('--location <NAME>', 'Location name for LMT')
  .option('--show-terms', 'Show solar terms', false)
  .action((opts) => {
    try {
      run(opts);
    } catch (err: any) {
      console.error(`error: ${err.message}`);
      process.exit(1);
    }
  });

program.parse();

function run(opts: any): void {
  const lang: Lang = opts.lang === 'en' ? 'En' : 'Ko';
  const i18n = new I18n(lang);

  const gender = parseGender(opts.gender);
  const calendar: CalendarType = opts.calendar === 'lunar' ? 'Lunar' : 'Solar';
  const useLmt = opts.localMeanTime || opts.longitude != null || opts.location != null;

  const req: SajuRequest = {
    date: opts.date,
    time: opts.time,
    calendar,
    leapMonth: opts.leapMonth,
    gender,
    tz: opts.tz,
    useLmt,
    longitude: opts.longitude != null ? parseFloat(opts.longitude) : null,
    location: opts.location ?? null,
    daewonCount: parseInt(opts.daewonCount, 10),
    monthYear: opts.monthYear != null ? parseInt(opts.monthYear, 10) : null,
    yearStart: opts.yearStart != null ? parseInt(opts.yearStart, 10) : null,
    yearCount: parseInt(opts.yearCount, 10),
  };

  const result = calculate(req);

  printHeader(result, i18n);
  printPillars(result.yearPillar, result.monthPillar, result.dayPillar, result.hourPillar, i18n);
  printHiddenStems(result.yearPillar, result.monthPillar, result.dayPillar, result.hourPillar, i18n);
  printTenGods(result.yearPillar, result.monthPillar, result.dayPillar, result.hourPillar, i18n);
  printTwelveStages(result.dayPillar.stem, result.yearPillar, result.monthPillar, result.dayPillar, result.hourPillar, i18n);
  printTwelveShinsal(result.yearPillar.branch, result.yearPillar, result.monthPillar, result.dayPillar, result.hourPillar, i18n);
  printStrength(result.strength, i18n);
  printElements(result.yearPillar, result.monthPillar, result.dayPillar, result.hourPillar, i18n);
  printDaewon(result.daewonDirection, result.daewonStartMonths, result.daewonItems, result.dayPillar.stem, i18n);
  printYearlyLuck(result.yearlyLuck, result.dayPillar.stem, result.tzSpec, i18n);
  printMonthlyLuck(result.monthlyLuck, result.dayPillar.stem, result.tzSpec, i18n);

  if (opts.showTerms) {
    printTerms(result.tzSpec, result.solarTerms, i18n);
  }
}

function parseGender(input: string): Gender {
  switch (input.toLowerCase()) {
    case 'male': case 'm': case '남': return 'Male';
    case 'female': case 'f': case '여': return 'Female';
    default: throw new Error('gender must be male|female|m|f|남|여');
  }
}

function formatCorrection(seconds: number): string {
  const sign = seconds >= 0 ? '+' : '-';
  const abs = Math.abs(seconds);
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  return `${sign}${String(mins).padStart(2, '0')}m${String(secs).padStart(2, '0')}s`;
}

function formatHiddenStems(i18n: I18n, branch: number): string {
  return bazi.hiddenStems(branch).map((stem) => i18n.stemLabel(stem)).join(', ');
}

function formatHiddenStemsWithTengod(i18n: I18n, dayStem: number, branch: number): string {
  return bazi.hiddenStems(branch)
    .map((stem) => `${i18n.stemLabel(stem)} ${i18n.tenGodLabel(bazi.tenGod(dayStem, stem))}`)
    .join(', ');
}

function printHeader(result: SajuResult, i18n: I18n): void {
  console.log(i18n.title());
  console.log(`- ${i18n.inputLabel()}(${i18n.calendarLabel(result.calendarIsLunar, result.leapMonth)}): ${result.inputDate} ${result.inputTime} ${result.tzName}`);
  if (result.convertedSolar) {
    console.log(`- ${i18n.convertedSolarLabel()}: ${result.convertedSolar} ${result.inputTime} ${result.tzName}`);
  }
  if (result.convertedLunar) {
    const l = result.convertedLunar;
    const suffix = l.isLeap ? i18n.leapSuffix() : '';
    console.log(`- ${i18n.convertedLunarLabel()}: ${String(l.year).padStart(4, '0')}-${String(l.month).padStart(2, '0')}-${String(l.day).padStart(2, '0')}${suffix}`);
  }
  if (result.lmtInfo) {
    const info = result.lmtInfo;
    if (info.locationLabel) {
      console.log(`- ${i18n.localMeanTimeLabel()}: ${i18n.locationLabel()} ${info.locationLabel} | ${i18n.longitudeLabel()} ${info.longitude.toFixed(4)}deg | ${i18n.stdMeridianLabel()} ${info.stdMeridian.toFixed(1)}deg | ${i18n.correctionLabel()} ${formatCorrection(info.correctionSeconds)}`);
    } else {
      console.log(`- ${i18n.localMeanTimeLabel()}: ${i18n.longitudeLabel()} ${info.longitude.toFixed(4)}deg | ${i18n.stdMeridianLabel()} ${info.stdMeridian.toFixed(1)}deg | ${i18n.correctionLabel()} ${formatCorrection(info.correctionSeconds)}`);
    }
    console.log(`- ${i18n.correctedTimeLabel()}: ${info.correctedLocal} ${result.tzName}`);
  }
  console.log(`- ${i18n.genderLabel()}: ${i18n.genderValue(result.gender)}`);
  console.log(`- ${i18n.dayBoundaryLabel()}: 23:00`);
  console.log();
}

function printPillars(year: Pillar, month: Pillar, day: Pillar, hour: Pillar, i18n: I18n): void {
  const kinds: PillarKind[] = ['Year', 'Month', 'Day', 'Hour'];
  const pillars = [year, month, day, hour];
  console.log(i18n.pillarsHeading());
  for (let idx = 0; idx < 4; idx++) {
    const k = kinds[idx];
    const p = pillars[idx];
    const stemW = idx === 2 ? i18n.dayStemWord() : i18n.stemWord();
    console.log(`- ${i18n.pillarKindLabel(k)}: ${i18n.pillarLabel(p)} | ${stemW}: ${i18n.elementLabel(bazi.stemElement(p.stem))} ${i18n.polarityLabel(bazi.stemPolarity(p.stem))} | ${i18n.branchWord()}: ${i18n.elementLabel(bazi.branchElement(p.branch))} ${i18n.polarityLabel(bazi.branchPolarity(p.branch))}`);
  }
  console.log();
}

function printHiddenStems(year: Pillar, month: Pillar, day: Pillar, hour: Pillar, i18n: I18n): void {
  const kinds: PillarKind[] = ['Year', 'Month', 'Day', 'Hour'];
  const pillars = [year, month, day, hour];
  console.log(i18n.hiddenStemsHeading());
  for (let idx = 0; idx < 4; idx++) {
    console.log(`- ${i18n.branchKindLabel(kinds[idx])}: ${formatHiddenStems(i18n, pillars[idx].branch)}`);
  }
  console.log();
}

function printTenGods(year: Pillar, month: Pillar, day: Pillar, hour: Pillar, i18n: I18n): void {
  const kinds: PillarKind[] = ['Year', 'Month', 'Day', 'Hour'];
  const pillars = [year, month, day, hour];
  const ds = day.stem;
  console.log(i18n.tenGodsHeading());
  console.log(`- ${i18n.stemsLabel()}: ${kinds.map((k, i) => `${i18n.stemKindLabel(k)} ${i18n.tenGodLabel(bazi.tenGod(ds, pillars[i].stem))}`).join(' / ')}`);
  console.log(`- ${i18n.branchesMainLabel()}: ${kinds.map((k, i) => `${i18n.branchKindLabel(k)} ${i18n.tenGodLabel(bazi.tenGodBranch(ds, pillars[i].branch))}`).join(' / ')}`);
  for (let idx = 0; idx < 4; idx++) {
    console.log(`- ${i18n.branchesHiddenLabel(kinds[idx])}: ${formatHiddenStemsWithTengod(i18n, ds, pillars[idx].branch)}`);
  }
  console.log();
}

function printTwelveStages(dayStem: number, year: Pillar, month: Pillar, day: Pillar, hour: Pillar, i18n: I18n): void {
  const kinds: PillarKind[] = ['Year', 'Month', 'Day', 'Hour'];
  const pillars = [year, month, day, hour];
  console.log(i18n.twelveStagesHeading());
  console.log(`- ${kinds.map((k, i) => `${i18n.branchKindLabel(k)}: ${i18n.stageLabel(bazi.twelveStageIndex(dayStem, pillars[i].branch))}`).join(' / ')}`);
  console.log();
}

function printTwelveShinsal(yearBranch: number, year: Pillar, month: Pillar, day: Pillar, hour: Pillar, i18n: I18n): void {
  const kinds: PillarKind[] = ['Year', 'Month', 'Day', 'Hour'];
  const pillars = [year, month, day, hour];
  console.log(i18n.twelveShinsalHeading());
  console.log(`- ${kinds.map((k, i) => `${i18n.branchKindLabel(k)}: ${i18n.shinsalLabel(bazi.twelveShinsalIndex(yearBranch, pillars[i].branch))}`).join(' / ')}`);
  console.log();
}

function printStrength(strength: StrengthResult, i18n: I18n): void {
  const stageBonus = strength.stageClass === 'Strong' ? 2 : strength.stageClass === 'Weak' ? -2 : 0;
  const supportTotal = strength.supportStems * 2 + strength.supportHidden;
  const drainTotal = strength.drainStems * 2 + strength.drainHidden;

  console.log(i18n.strengthHeading());
  console.log(`- ${i18n.monthStageLabel()}: ${i18n.stageLabel(strength.stageIndex)} (${i18n.strengthClassLabel(strength.stageClass)})`);
  console.log(`- ${i18n.rootLabel()}: ${strength.rootCount} / ${i18n.supportLabel()}(${i18n.stemsLabel()} ${strength.supportStems}·${i18n.hiddenStemsHeading()} ${strength.supportHidden}) / ${i18n.drainLabel()}(${i18n.stemsLabel()} ${strength.drainStems}·${i18n.hiddenStemsHeading()} ${strength.drainHidden})`);
  console.log(`- ${i18n.scoreLabel()}: ${strength.total} (${i18n.basisLabel()} ${i18n.monthStageLabel()} ${stageBonus} + ${i18n.rootLabel()} ${strength.rootCount} + ${i18n.supportLabel()} ${supportTotal} - ${i18n.drainLabel()} ${drainTotal})`);
  console.log(`- ${i18n.verdictLabel()}: ${i18n.strengthVerdictLabel(strength.verdict)}`);
  console.log();
}

function printElements(year: Pillar, month: Pillar, day: Pillar, hour: Pillar, i18n: I18n): void {
  const counts = bazi.elementsCount([year, month, day, hour]);
  const elements: Element[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
  console.log(i18n.elementsHeading());
  console.log(`- ${elements.map((el, i) => `${i18n.elementShortLabel(el)} ${counts[i]}`).join(' / ')}`);
  console.log();
}

function printDaewon(direction: Direction, startMonths: number, items: luck.DaewonItem[], dayStem: number, i18n: I18n): void {
  console.log(`${i18n.daewonHeading()} (${i18n.directionLabel(direction)} , ${i18n.startLabel()} ${i18n.formatAge(startMonths, false)})`);
  for (const item of items) {
    console.log(`- ${i18n.formatAge(item.startMonths, true)}: ${i18n.pillarLabel(item.pillar)} | ${i18n.tenGodsLabel()}: ${i18n.stemsLabel()} ${i18n.tenGodLabel(bazi.tenGod(dayStem, item.pillar.stem))}, ${i18n.branchesLabel()} ${i18n.tenGodLabel(bazi.tenGodBranch(dayStem, item.pillar.branch))}`);
  }
  console.log();
}

function printYearlyLuck(years: luck.YearLuck[], dayStem: number, tzSpec: TimeZoneSpec, i18n: I18n): void {
  console.log(i18n.yearlyLuckHeading());
  for (const y of years) {
    const startLocal = timezone.toLocal(tzSpec, astro.datetimeFromJd(y.startJd));
    const endLocal = timezone.toLocal(tzSpec, astro.datetimeFromJd(y.endJd));
    console.log(`- ${i18n.formatYearLabel(y.year)}: ${startLocal.format('YYYY-MM-DD HH:mm')} ~ ${endLocal.format('YYYY-MM-DD HH:mm')} | ${i18n.pillarLabel(y.pillar)} | ${i18n.tenGodsLabel()}: ${i18n.stemsLabel()} ${i18n.tenGodLabel(bazi.tenGod(dayStem, y.pillar.stem))}, ${i18n.branchesLabel()} ${i18n.tenGodLabel(bazi.tenGodBranch(dayStem, y.pillar.branch))}`);
  }
  console.log();
}

function printMonthlyLuck(monthly: luck.MonthlyLuck, dayStem: number, tzSpec: TimeZoneSpec, i18n: I18n): void {
  console.log(i18n.monthlyLuckHeading(monthly.year));
  console.log(`- ${i18n.yearLuckLabel()}: ${i18n.pillarLabel(monthly.yearPillar)} | ${i18n.tenGodsLabel()}: ${i18n.stemsLabel()} ${i18n.tenGodLabel(bazi.tenGod(dayStem, monthly.yearPillar.stem))}, ${i18n.branchesLabel()} ${i18n.tenGodLabel(bazi.tenGodBranch(dayStem, monthly.yearPillar.branch))}`);
  for (const m of monthly.months) {
    const startLocal = timezone.toLocal(tzSpec, astro.datetimeFromJd(m.startJd));
    const endLocal = timezone.toLocal(tzSpec, astro.datetimeFromJd(m.endJd));
    console.log(`- ${i18n.monthLabel(m.branch)}: ${startLocal.format('YYYY-MM-DD HH:mm')} ~ ${endLocal.format('YYYY-MM-DD HH:mm')} | ${i18n.pillarLabel(m.pillar)} | ${i18n.tenGodsLabel()}: ${i18n.stemsLabel()} ${i18n.tenGodLabel(bazi.tenGod(dayStem, m.pillar.stem))}, ${i18n.branchesLabel()} ${i18n.tenGodLabel(bazi.tenGodBranch(dayStem, m.pillar.branch))}`);
  }
  console.log();
}

function printTerms(tzSpec: TimeZoneSpec, terms: SolarTerm[], i18n: I18n): void {
  console.log(`${i18n.termsHeading()} (${timezone.tzName(tzSpec)} ${i18n.tzLabel()})`);
  for (const term of terms) {
    const utcDate = astro.datetimeFromJd(term.jd);
    const local = timezone.toLocal(tzSpec, utcDate);
    console.log(`- ${i18n.termName(term.def)}: ${local.format('YYYY-MM-DD HH:mm:ss')}`);
  }
  console.log();
}
