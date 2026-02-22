/**
 * @fileoverview 사주팔자 CLI 도구
 *
 * 명령줄에서 생년월일·시간·성별 등을 입력받아 사주팔자를 계산하고
 * 텍스트 형식으로 출력한다. commander 라이브러리 기반.
 *
 * 사용 예:
 *   saju --date 2000-01-15 --time 12:00 --gender male
 *   saju --date 1990-05-20 --time 08:30 --gender female --calendar lunar
 */

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
  strength as str,
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
import {
  parseIntegerOption,
  parseOptionalIntegerOption,
  parseOptionalNumberOption,
} from './cliParsing.js';

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`error: ${message}`);
      process.exit(1);
    }
  });

program.parse();

/**
 * CLI 메인 실행 함수.
 * 커맨드라인 옵션을 SajuRequest로 변환 후 계산·출력한다.
 */
/** CLI 옵션 타입 */
interface CliOptions {
  date: string
  time: string
  gender: string
  calendar: string
  leapMonth: boolean
  tz: string
  lang: string
  daewonCount: string
  monthYear?: string
  yearStart?: string
  yearCount: string
  localMeanTime: boolean
  longitude?: string
  location?: string
  showTerms: boolean
}

function run(opts: CliOptions): void {
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
    longitude: parseOptionalNumberOption(opts.longitude, '--longitude'),
    location: opts.location ?? null,
    daewonCount: parseIntegerOption(opts.daewonCount, '--daewon-count'),
    monthYear: parseOptionalIntegerOption(opts.monthYear, '--month-year'),
    yearStart: parseOptionalIntegerOption(opts.yearStart, '--year-start'),
    yearCount: parseIntegerOption(opts.yearCount, '--year-count'),
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

/** 성별 문자열을 Gender 타입으로 파싱한다 */
function parseGender(input: string): Gender {
  switch (input.toLowerCase()) {
    case 'male': case 'm': case '남': return 'Male';
    case 'female': case 'f': case '여': return 'Female';
    default: throw new Error('gender must be male|female|m|f|남|여');
  }
}

/** 보정 초를 '±00m00s' 형식으로 포맷한다 */
function formatCorrection(seconds: number): string {
  const sign = seconds >= 0 ? '+' : '-';
  const abs = Math.abs(seconds);
  const mins = Math.floor(abs / 60);
  const secs = abs % 60;
  return `${sign}${String(mins).padStart(2, '0')}m${String(secs).padStart(2, '0')}s`;
}

/** 지장간을 '갑(甲), 병(丙), 무(戊)' 형식으로 포맷한다 */
function formatHiddenStems(i18n: I18n, branch: number): string {
  return bazi.hiddenStems(branch).map((stem) => i18n.stemLabel(stem)).join(', ');
}

/** 지장간을 십성과 함께 포맷한다 */
function formatHiddenStemsWithTengod(i18n: I18n, dayStem: number, branch: number): string {
  return bazi.hiddenStems(branch)
    .map((stem) => `${i18n.stemLabel(stem)} ${i18n.tenGodLabel(bazi.tenGod(dayStem, stem))}`)
    .join(', ');
}

/** 입력 정보 및 보정 내역을 출력한다 */
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

/** 사주 네 기둥을 출력한다 */
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

/** 지장간을 출력한다 */
function printHiddenStems(year: Pillar, month: Pillar, day: Pillar, hour: Pillar, i18n: I18n): void {
  const kinds: PillarKind[] = ['Year', 'Month', 'Day', 'Hour'];
  const pillars = [year, month, day, hour];
  console.log(i18n.hiddenStemsHeading());
  for (let idx = 0; idx < 4; idx++) {
    console.log(`- ${i18n.branchKindLabel(kinds[idx])}: ${formatHiddenStems(i18n, pillars[idx].branch)}`);
  }
  console.log();
}

/** 십성(천간·지지·지장간)을 출력한다 */
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

/** 12운성을 출력한다 */
function printTwelveStages(dayStem: number, year: Pillar, month: Pillar, day: Pillar, hour: Pillar, i18n: I18n): void {
  const kinds: PillarKind[] = ['Year', 'Month', 'Day', 'Hour'];
  const pillars = [year, month, day, hour];
  console.log(i18n.twelveStagesHeading());
  console.log(`- ${kinds.map((k, i) => `${i18n.branchKindLabel(k)}: ${i18n.stageLabel(bazi.twelveStageIndex(dayStem, pillars[i].branch))}`).join(' / ')}`);
  console.log();
}

/** 12신살을 출력한다 */
function printTwelveShinsal(yearBranch: number, year: Pillar, month: Pillar, day: Pillar, hour: Pillar, i18n: I18n): void {
  const kinds: PillarKind[] = ['Year', 'Month', 'Day', 'Hour'];
  const pillars = [year, month, day, hour];
  console.log(i18n.twelveShinsalHeading());
  console.log(`- ${kinds.map((k, i) => `${i18n.branchKindLabel(k)}: ${i18n.shinsalLabel(bazi.twelveShinsalIndex(yearBranch, pillars[i].branch))}`).join(' / ')}`);
  console.log();
}

/** 신강/신약 판정 결과를 출력한다 */
function printStrength(strength: StrengthResult, i18n: I18n): void {
  const { STAGE_BONUS, STEM_WEIGHT, HIDDEN_WEIGHT } = str.STRENGTH_WEIGHTS;
  const stageBonus = strength.stageClass === 'Strong' ? STAGE_BONUS : strength.stageClass === 'Weak' ? -STAGE_BONUS : 0;
  const supportTotal = strength.supportStems * STEM_WEIGHT + strength.supportHidden * HIDDEN_WEIGHT;
  const drainTotal = strength.drainStems * STEM_WEIGHT + strength.drainHidden * HIDDEN_WEIGHT;

  console.log(i18n.strengthHeading());
  console.log(`- ${i18n.monthStageLabel()}: ${i18n.stageLabel(strength.stageIndex)} (${i18n.strengthClassLabel(strength.stageClass)})`);
  console.log(`- ${i18n.rootLabel()}: ${strength.rootCount} / ${i18n.supportLabel()}(${i18n.stemsLabel()} ${strength.supportStems}·${i18n.hiddenStemsHeading()} ${strength.supportHidden}) / ${i18n.drainLabel()}(${i18n.stemsLabel()} ${strength.drainStems}·${i18n.hiddenStemsHeading()} ${strength.drainHidden})`);
  console.log(`- ${i18n.scoreLabel()}: ${strength.total} (${i18n.basisLabel()} ${i18n.monthStageLabel()} ${stageBonus} + ${i18n.rootLabel()} ${strength.rootCount} + ${i18n.supportLabel()} ${supportTotal} - ${i18n.drainLabel()} ${drainTotal})`);
  console.log(`- ${i18n.verdictLabel()}: ${i18n.strengthVerdictLabel(strength.verdict)}`);
  console.log();
}

/** 오행 분포를 출력한다 */
function printElements(year: Pillar, month: Pillar, day: Pillar, hour: Pillar, i18n: I18n): void {
  const counts = bazi.elementsCount([year, month, day, hour]);
  const elements: Element[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
  console.log(i18n.elementsHeading());
  console.log(`- ${elements.map((el, i) => `${i18n.elementShortLabel(el)} ${counts[i]}`).join(' / ')}`);
  console.log();
}

/** 대운을 출력한다 */
function printDaewon(direction: Direction, startMonths: number, items: luck.DaewonItem[], dayStem: number, i18n: I18n): void {
  console.log(`${i18n.daewonHeading()} (${i18n.directionLabel(direction)} , ${i18n.startLabel()} ${i18n.formatAge(startMonths, false)})`);
  for (const item of items) {
    console.log(`- ${i18n.formatAge(item.startMonths, true)}: ${i18n.pillarLabel(item.pillar)} | ${i18n.tenGodsLabel()}: ${i18n.stemsLabel()} ${i18n.tenGodLabel(bazi.tenGod(dayStem, item.pillar.stem))}, ${i18n.branchesLabel()} ${i18n.tenGodLabel(bazi.tenGodBranch(dayStem, item.pillar.branch))}`);
  }
  console.log();
}

/** 세운(연운)을 출력한다 */
function printYearlyLuck(years: luck.YearLuck[], dayStem: number, tzSpec: TimeZoneSpec, i18n: I18n): void {
  console.log(i18n.yearlyLuckHeading());
  for (const y of years) {
    const startLocal = timezone.toLocal(tzSpec, astro.datetimeFromJd(y.startJd));
    const endLocal = timezone.toLocal(tzSpec, astro.datetimeFromJd(y.endJd));
    console.log(`- ${i18n.formatYearLabel(y.year)}: ${startLocal.format('YYYY-MM-DD HH:mm')} ~ ${endLocal.format('YYYY-MM-DD HH:mm')} | ${i18n.pillarLabel(y.pillar)} | ${i18n.tenGodsLabel()}: ${i18n.stemsLabel()} ${i18n.tenGodLabel(bazi.tenGod(dayStem, y.pillar.stem))}, ${i18n.branchesLabel()} ${i18n.tenGodLabel(bazi.tenGodBranch(dayStem, y.pillar.branch))}`);
  }
  console.log();
}

/** 월운을 출력한다 */
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

/** 24절기를 출력한다 */
function printTerms(tzSpec: TimeZoneSpec, terms: SolarTerm[], i18n: I18n): void {
  console.log(`${i18n.termsHeading()} (${timezone.tzName(tzSpec)} ${i18n.tzLabel()})`);
  for (const term of terms) {
    const utcDate = astro.datetimeFromJd(term.jd);
    const local = timezone.toLocal(tzSpec, utcDate);
    console.log(`- ${i18n.termName(term.def)}: ${local.format('YYYY-MM-DD HH:mm:ss')}`);
  }
  console.log();
}
