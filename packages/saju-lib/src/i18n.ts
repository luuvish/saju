/**
 * @fileoverview 다국어(I18n) 지원 모듈
 *
 * 사주 용어의 한국어(Ko)·영문(En) 표기를 제공한다.
 * 천간·지지·십성·12운성·신살·오행 등 명리학 용어와
 * UI 레이블을 포함한다.
 */

import type {
  BranchRelationType,
  Direction,
  Element,
  Gender,
  Pillar,
  PillarPosition,
  ShinsalKind,
  StemRelationType,
  StrengthClass,
  StrengthVerdict,
  TenGod,
  TermDef,
} from './types.js';

/** 지원 언어: 한국어(Ko) 또는 영어(En) */
export type Lang = 'Ko' | 'En';

/** 기둥 종류 (연/월/일/시) */
export type PillarKind = 'Year' | 'Month' | 'Day' | 'Hour';

// ── 천간(天干) 이름 ──
const STEMS_KO = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const STEMS_EN = ['Gap', 'Eul', 'Byeong', 'Jeong', 'Mu', 'Gi', 'Gyeong', 'Sin', 'Im', 'Gye'];
const STEMS_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

// ── 지지(地支) 이름 ──
const BRANCHES_KO = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
const BRANCHES_EN = ['Ja', 'Chuk', 'In', 'Myo', 'Jin', 'Sa', 'O', 'Mi', 'Sin', 'Yu', 'Sul', 'Hae'];
const BRANCHES_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// ── 12운성(十二運星) 이름 ──
const TWELVE_STAGES_KO = [
  '장생(長生)', '목욕(沐浴)', '관대(冠帶)', '건록(建祿)', '제왕(帝旺)',
  '쇠(衰)', '병(病)', '사(死)', '묘(墓)', '절(絶)', '태(胎)', '양(養)',
];
const TWELVE_STAGES_EN = [
  'Changsheng (長生)', 'Muyu (沐浴)', 'Guandai (冠帶)', 'Jianlu (建祿)', 'Dewang (帝旺)',
  'Shuai (衰)', 'Bing (病)', 'Si (死)', 'Mu (墓)', 'Jue (絶)', 'Tai (胎)', 'Yang (養)',
];

// ── 12신살(十二神殺) 이름 ──
const SHINSAL_NAMES_KO = [
  '지살(地殺)', '년살(年殺)', '월살(月殺)', '망신살(亡身殺)', '장성살(將星殺)',
  '반안살(攀鞍殺)', '역마살(驛馬殺)', '육해살(六害殺)', '화개살(華蓋殺)',
  '겁살(劫殺)', '재살(災殺)', '천살(天殺)',
];
const SHINSAL_NAMES_EN = [
  'Earth Kill (地殺)', 'Year Kill (年殺)', 'Month Kill (月殺)', 'Loss Star (亡身殺)',
  'General Star (將星殺)', 'Mounting Saddle (攀鞍殺)', 'Travel Horse (驛馬殺)',
  'Six Harm (六害殺)', 'Canopy (華蓋殺)', 'Robbery (劫殺)', 'Disaster (災殺)', 'Heaven Kill (天殺)',
];

/**
 * 다국어 레이블 제공 클래스.
 * 사주 관련 모든 용어와 UI 텍스트를 Lang에 따라 반환한다.
 */
export class I18n {
  constructor(public readonly lang: Lang) {}

  /** 메인 제목 */
  title(): string {
    return this.lang === 'Ko' ? '사주팔자 (입춘 기준)' : 'Saju Palja (Lichun 기준)';
  }

  // ── 입력/출력 섹션 레이블 ──

  inputLabel(): string { return this.lang === 'Ko' ? '입력' : 'Input'; }
  convertedSolarLabel(): string { return this.lang === 'Ko' ? '변환 양력' : 'Converted solar'; }
  convertedLunarLabel(): string { return this.lang === 'Ko' ? '변환 음력' : 'Converted lunar'; }
  leapSuffix(): string { return this.lang === 'Ko' ? ' (윤달)' : ' (Leap)'; }
  localMeanTimeLabel(): string { return this.lang === 'Ko' ? '지역시 보정(평태양시)' : 'Local mean time correction'; }
  correctedTimeLabel(): string { return this.lang === 'Ko' ? '보정 시각' : 'Corrected time'; }
  genderLabel(): string { return this.lang === 'Ko' ? '성별' : 'Gender'; }
  dayBoundaryLabel(): string { return this.lang === 'Ko' ? '일주 경계' : 'Day boundary'; }

  // ── 사주 테이블 섹션 제목 ──

  pillarsHeading(): string { return this.lang === 'Ko' ? '천간/지지' : 'Stems/Branches'; }
  hiddenStemsHeading(): string { return this.lang === 'Ko' ? '지장간' : 'Hidden Stems'; }
  tenGodsHeading(): string { return this.lang === 'Ko' ? '십성(일간 기준)' : 'Ten Gods (Day stem)'; }
  twelveStagesHeading(): string { return this.lang === 'Ko' ? '12운성(일간 기준)' : '12 Stages (Day stem)'; }
  twelveShinsalHeading(): string { return this.lang === 'Ko' ? '12신살(연지 삼합 기준)' : '12 Shinsal (Year branch trine)'; }
  strengthHeading(): string { return this.lang === 'Ko' ? '신강/신약(간단 판정)' : 'Strength (simple)'; }
  elementsHeading(): string { return this.lang === 'Ko' ? '오행 분포(천간+지지)' : 'Five Elements (stems + branches)'; }
  daewonHeading(): string { return this.lang === 'Ko' ? '대운' : 'Decennial Luck'; }
  yearlyLuckHeading(): string { return this.lang === 'Ko' ? '세운 (입춘 기준)' : 'Yearly Luck (Lichun)'; }
  monthlyLuckHeading(year: number): string { return this.lang === 'Ko' ? `월운 (${year}년)` : `Monthly Luck (${year})`; }
  termsHeading(): string { return this.lang === 'Ko' ? '절기' : 'Solar Terms'; }
  tzLabel(): string { return this.lang === 'Ko' ? '기준' : 'time zone'; }

  // ── 기둥(柱) 위치 레이블 ──

  /** 기둥 종류 레이블 (예: '연주', '월주') */
  pillarKindLabel(kind: PillarKind): string {
    const map: Record<Lang, Record<PillarKind, string>> = {
      Ko: { Year: '연주', Month: '월주', Day: '일주', Hour: '시주' },
      En: { Year: 'Year Pillar', Month: 'Month Pillar', Day: 'Day Pillar', Hour: 'Hour Pillar' },
    };
    return map[this.lang][kind];
  }

  /** 천간 위치 레이블 (예: '연간', '일간') */
  stemKindLabel(kind: PillarKind): string {
    const map: Record<Lang, Record<PillarKind, string>> = {
      Ko: { Year: '연간', Month: '월간', Day: '일간', Hour: '시간' },
      En: { Year: 'Year stem', Month: 'Month stem', Day: 'Day stem', Hour: 'Hour stem' },
    };
    return map[this.lang][kind];
  }

  /** 지지 위치 레이블 (예: '연지', '일지') */
  branchKindLabel(kind: PillarKind): string {
    const map: Record<Lang, Record<PillarKind, string>> = {
      Ko: { Year: '연지', Month: '월지', Day: '일지', Hour: '시지' },
      En: { Year: 'Year branch', Month: 'Month branch', Day: 'Day branch', Hour: 'Hour branch' },
    };
    return map[this.lang][kind];
  }

  // ── 공통 용어 ──

  stemWord(): string { return this.lang === 'Ko' ? '천간' : 'Stem'; }
  branchWord(): string { return this.lang === 'Ko' ? '지지' : 'Branch'; }
  dayStemWord(): string { return this.lang === 'Ko' ? '일간' : 'Day stem'; }
  stemsLabel(): string { return this.lang === 'Ko' ? '천간' : 'Stems'; }
  branchesLabel(): string { return this.lang === 'Ko' ? '지지' : 'Branches'; }
  branchesMainLabel(): string { return this.lang === 'Ko' ? '지지(본기)' : 'Branches (main)'; }
  branchesHiddenLabel(kind: PillarKind): string {
    return this.lang === 'Ko'
      ? `${this.branchKindLabel(kind)}(지장간)`
      : `${this.branchKindLabel(kind)} (hidden)`;
  }
  tenGodsLabel(): string { return this.lang === 'Ko' ? '십성' : 'Ten Gods'; }
  yearLuckLabel(): string { return this.lang === 'Ko' ? '세운' : 'Annual Pillar'; }

  // ── 대운 관련 ──

  /** 대운 진행 방향 레이블 */
  directionLabel(direction: Direction): string {
    const map: Record<Lang, Record<Direction, string>> = {
      Ko: { Forward: '순행', Backward: '역행' },
      En: { Forward: 'Forward', Backward: 'Backward' },
    };
    return map[this.lang][direction];
  }

  startLabel(): string { return this.lang === 'Ko' ? '시작' : 'start'; }
  yearUnit(): string { return this.lang === 'Ko' ? '년' : 'y'; }
  monthUnit(): string { return this.lang === 'Ko' ? '개월' : 'm'; }

  // ── 역법·성별 ──

  /** 역법 레이블 (양력/음력/윤달) */
  calendarLabel(isLunar: boolean, leap: boolean): string {
    if (this.lang === 'Ko') {
      if (isLunar) return leap ? '음력(윤달)' : '음력';
      return '양력';
    }
    if (isLunar) return leap ? 'Lunar (Leap)' : 'Lunar';
    return 'Solar';
  }

  /** 성별 표시 값 (남/여) */
  genderValue(gender: Gender): string {
    const map: Record<Lang, Record<Gender, string>> = {
      Ko: { Male: '남', Female: '여' },
      En: { Male: 'Male', Female: 'Female' },
    };
    return map[this.lang][gender];
  }

  // ── 나이·연도 포맷 ──

  /**
   * 개월 수를 '00년 00개월' 형식으로 포맷한다.
   * @param months 개월 수
   * @param aligned 정렬 모드 (true면 숫자 패딩 적용)
   */
  formatAge(months: number, aligned: boolean): string {
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (rem === 0) {
      return aligned ? `${String(years).padStart(2)}${this.yearUnit()}` : `${years}${this.yearUnit()}`;
    }
    return aligned
      ? `${String(years).padStart(2)}${this.yearUnit()} ${rem}${this.monthUnit()}`
      : `${years}${this.yearUnit()} ${rem}${this.monthUnit()}`;
  }

  /** 연도 레이블 (예: '2024년' 또는 '2024') */
  formatYearLabel(year: number): string {
    return this.lang === 'Ko' ? `${year}년` : `${year}`;
  }

  /**
   * 월운의 월 레이블을 생성한다.
   * 지지 인덱스로부터 월 번호와 해당 절기명을 조합한다.
   * @param branch 월지 인덱스 (0~11)
   */
  monthLabel(branch: number): string {
    const month = ((branch - 2 + 12) % 12) + 1;
    const termsKo = ['대설', '소한', '입춘', '경칩', '청명', '입하', '망종', '소서', '입추', '백로', '한로', '입동'];
    const termsEn = ['Daxue', 'Xiaohan', 'Lichun', 'Jingzhe', 'Qingming', 'Lixia', 'Mangzhong', 'Xiaoshu', 'Liqiu', 'Bailu', 'Hanlu', 'Lidong'];
    const term = this.lang === 'Ko' ? termsKo[branch] : termsEn[branch];
    return this.lang === 'Ko' ? `${month}월 ${term}` : `M${month} ${term}`;
  }

  // ── 오행 관련 ──

  /** 오행 레이블 (한자 포함, 예: '목(木)') */
  elementLabel(element: Element): string {
    const map: Record<Lang, Record<Element, string>> = {
      Ko: { Wood: '목(木)', Fire: '화(火)', Earth: '토(土)', Metal: '금(金)', Water: '수(水)' },
      En: { Wood: 'Wood (木)', Fire: 'Fire (火)', Earth: 'Earth (土)', Metal: 'Metal (金)', Water: 'Water (水)' },
    };
    return map[this.lang][element];
  }

  /** 오행 단축 레이블 (예: '목', 'Wood') */
  elementShortLabel(element: Element): string {
    const map: Record<Lang, Record<Element, string>> = {
      Ko: { Wood: '목', Fire: '화', Earth: '토', Metal: '금', Water: '수' },
      En: { Wood: 'Wood', Fire: 'Fire', Earth: 'Earth', Metal: 'Metal', Water: 'Water' },
    };
    return map[this.lang][element];
  }

  /** 음양 레이블 */
  polarityLabel(isYang: boolean): string {
    if (this.lang === 'Ko') return isYang ? '양' : '음';
    return isYang ? 'Yang' : 'Yin';
  }

  // ── 십성(十星) ──

  /** 십성 레이블 (한자 포함) */
  tenGodLabel(god: TenGod): string {
    const map: Record<Lang, Record<TenGod, string>> = {
      Ko: {
        BiGyeon: '비견(比肩)', GeopJae: '겁재(劫財)', SikShin: '식신(食神)', SangGwan: '상관(傷官)',
        PyeonJae: '편재(偏財)', JeongJae: '정재(正財)', ChilSal: '편관(偏官)', JeongGwan: '정관(正官)',
        PyeonIn: '편인(偏印)', JeongIn: '정인(正印)',
      },
      En: {
        BiGyeon: 'Companion (比肩)', GeopJae: 'Rob Wealth (劫財)', SikShin: 'Eating God (食神)',
        SangGwan: 'Hurting Officer (傷官)', PyeonJae: 'Indirect Wealth (偏財)', JeongJae: 'Direct Wealth (正財)',
        ChilSal: 'Indirect Officer (偏官)', JeongGwan: 'Direct Officer (正官)',
        PyeonIn: 'Indirect Resource (偏印)', JeongIn: 'Direct Resource (正印)',
      },
    };
    return map[this.lang][god];
  }

  // ── 12운성·12신살 ──

  /** 12운성 레이블 (인덱스 0~11) */
  stageLabel(index: number): string {
    return this.lang === 'Ko' ? TWELVE_STAGES_KO[index] : TWELVE_STAGES_EN[index];
  }

  /** 12신살 레이블 (인덱스 0~11) */
  shinsalLabel(index: number): string {
    return this.lang === 'Ko' ? SHINSAL_NAMES_KO[index] : SHINSAL_NAMES_EN[index];
  }

  // ── 신강/신약 ──

  strengthClassLabel(cls: StrengthClass): string {
    const map: Record<Lang, Record<StrengthClass, string>> = {
      Ko: { Strong: '강', Weak: '약', Neutral: '중' },
      En: { Strong: 'Strong', Weak: 'Weak', Neutral: 'Neutral' },
    };
    return map[this.lang][cls];
  }

  /** 최종 강약 판정 레이블 (신강/신약/중화) */
  strengthVerdictLabel(verdict: StrengthVerdict): string {
    const map: Record<Lang, Record<StrengthVerdict, string>> = {
      Ko: { Strong: '신강', Weak: '신약', Neutral: '중화' },
      En: { Strong: 'Strong', Weak: 'Weak', Neutral: 'Balanced' },
    };
    return map[this.lang][verdict];
  }

  // ── 용신(用神) ──

  yongshinHeading(): string { return this.lang === 'Ko' ? '용신(用神)' : 'Use God (Yongshin)'; }
  yongshinLabel(): string { return this.lang === 'Ko' ? '용신(用神)' : 'Use God'; }
  heeshinLabel(): string { return this.lang === 'Ko' ? '희신(喜神)' : 'Joy God'; }
  gishinLabel(): string { return this.lang === 'Ko' ? '기신(忌神)' : 'Jealous God'; }
  gushinLabel(): string { return this.lang === 'Ko' ? '구신(仇神)' : 'Enemy God'; }
  yongshinMethodLabel(method: 'suppress' | 'support'): string {
    const map: Record<Lang, Record<string, string>> = {
      Ko: { suppress: '억부법(抑扶法) — 신강: 억제 필요', support: '억부법(抑扶法) — 신약: 부조 필요' },
      En: { suppress: 'Suppress method — Strong: needs restraint', support: 'Support method — Weak: needs aid' },
    };
    return map[this.lang][method];
  }

  // ── 신강/신약 상세 ──

  scoreLabel(): string { return this.lang === 'Ko' ? '점수' : 'Score'; }
  basisLabel(): string { return this.lang === 'Ko' ? '기준' : 'Basis'; }
  verdictLabel(): string { return this.lang === 'Ko' ? '판정' : 'Verdict'; }
  rootLabel(): string { return this.lang === 'Ko' ? '뿌리' : 'Roots'; }
  supportLabel(): string { return this.lang === 'Ko' ? '지원' : 'Support'; }
  drainLabel(): string { return this.lang === 'Ko' ? '억제' : 'Drain'; }
  monthStageLabel(): string { return this.lang === 'Ko' ? '월지 운성' : 'Month branch stage'; }
  locationLabel(): string { return this.lang === 'Ko' ? '위치' : 'Location'; }
  longitudeLabel(): string { return this.lang === 'Ko' ? '경도' : 'Longitude'; }
  stdMeridianLabel(): string { return this.lang === 'Ko' ? '표준경도' : 'Std meridian'; }
  correctionLabel(): string { return this.lang === 'Ko' ? '보정' : 'Correction'; }

  // ── 절기·기둥 표기 ──

  /** 절기 이름 (한글+한자 또는 영문+한자) */
  termName(term: TermDef): string {
    return this.lang === 'Ko'
      ? `${term.nameKo}(${term.nameHanja})`
      : `${term.nameEn} (${term.nameHanja})`;
  }

  /** 기둥 표기 (예: '갑자(甲子)') */
  pillarLabel(pillar: Pillar): string {
    const stem = this.stemName(pillar.stem);
    const branch = this.branchName(pillar.branch);
    return `${stem}${branch}(${STEMS_HANJA[pillar.stem]}${BRANCHES_HANJA[pillar.branch]})`;
  }

  /** 천간 표기 (예: '갑(甲)') */
  stemLabel(stem: number): string {
    return `${this.stemName(stem)}(${STEMS_HANJA[stem]})`;
  }

  /** 지지 표기 (예: '자(子)') */
  branchLabel(branch: number): string {
    return `${this.branchName(branch)}(${BRANCHES_HANJA[branch]})`;
  }

  // ── 합충형파해 관계 ──

  /** 천간 관계 레이블 (천간합/천간충) */
  stemRelationLabel(rel: StemRelationType): string {
    const map: Record<Lang, Record<StemRelationType, string>> = {
      Ko: { Hap: '천간합(天干合)', Chung: '천간충(天干沖)' },
      En: { Hap: 'Stem Combine (天干合)', Chung: 'Stem Clash (天干沖)' },
    };
    return map[this.lang][rel];
  }

  /** 지지 관계 레이블 (육합/충/형/파/해/방합/삼합) */
  branchRelationLabel(rel: BranchRelationType): string {
    const map: Record<Lang, Record<BranchRelationType, string>> = {
      Ko: { YukHap: '육합(六合)', Chung: '충(沖)', Hyung: '형(刑)', Pa: '파(破)', Hae: '해(害)', BangHap: '방합(方合)', SamHap: '삼합(三合)' },
      En: { YukHap: 'Six Combine (六合)', Chung: 'Clash (沖)', Hyung: 'Punishment (刑)', Pa: 'Break (破)', Hae: 'Harm (害)', BangHap: 'Directional (方合)', SamHap: 'Triple (三合)' },
    };
    return map[this.lang][rel];
  }

  // ── 주요 신살 ──

  /** 주요 신살 종류별 레이블 */
  shinsalKindLabel(kind: ShinsalKind): string {
    const map: Record<Lang, Record<ShinsalKind, string>> = {
      Ko: {
        DoHwaSal: '도화살(桃花殺)', CheonEulGwiIn: '천을귀인(天乙貴人)', YeokMaSal: '역마살(驛馬殺)',
        MunChangGwiIn: '문창귀인(文昌貴人)', HakDangGwiIn: '학당귀인(學堂貴人)', CheonDeokGwiIn: '천덕귀인(天德貴人)',
        WolDeokGwiIn: '월덕귀인(月德貴人)', YangInSal: '양인살(羊刃殺)', GongMang: '공망(空亡)',
        BaekHoSal: '백호살(白虎殺)', GoeGangSal: '괴강살(魁罡殺)', WonJinSal: '원진살(怨嗔殺)', GwiMunGwanSal: '귀문관살(鬼門關殺)',
      },
      En: {
        DoHwaSal: 'Peach Blossom (桃花殺)', CheonEulGwiIn: 'Heavenly Noble (天乙貴人)', YeokMaSal: 'Travel Horse (驛馬殺)',
        MunChangGwiIn: 'Literary Star (文昌貴人)', HakDangGwiIn: 'Academic Star (學堂貴人)', CheonDeokGwiIn: 'Heavenly Virtue (天德貴人)',
        WolDeokGwiIn: 'Monthly Virtue (月德貴人)', YangInSal: 'Blade (羊刃殺)', GongMang: 'Void (空亡)',
        BaekHoSal: 'White Tiger (白虎殺)', GoeGangSal: 'Kuigang (魁罡殺)', WonJinSal: 'Grudge (怨嗔殺)', GwiMunGwanSal: 'Ghost Gate (鬼門關殺)',
      },
    };
    return map[this.lang][kind];
  }

  /** 기둥 위치 단축 레이블 (년/월/일/시) */
  positionLabel(pos: PillarPosition): string {
    const map: Record<Lang, Record<PillarPosition, string>> = {
      Ko: { Year: '년', Month: '월', Day: '일', Hour: '시' },
      En: { Year: 'Year', Month: 'Month', Day: 'Day', Hour: 'Hour' },
    };
    return map[this.lang][pos];
  }

  relationsHeading(): string { return this.lang === 'Ko' ? '합충형파해(合沖刑破害)' : 'Interactions'; }
  shinsalExtraHeading(): string { return this.lang === 'Ko' ? '주요 신살(神殺)' : 'Key Spirits'; }

  /** '~주 기준' 레이블 (예: '일주 기준') */
  basisPositionLabel(pos: PillarPosition): string {
    return this.lang === 'Ko'
      ? `${this.positionLabel(pos)}주 기준`
      : `${this.positionLabel(pos)} basis`;
  }

  // ── private helpers ──

  private stemName(stem: number): string {
    return this.lang === 'Ko' ? STEMS_KO[stem] : STEMS_EN[stem];
  }

  private branchName(branch: number): string {
    return this.lang === 'Ko' ? BRANCHES_KO[branch] : BRANCHES_EN[branch];
  }
}
