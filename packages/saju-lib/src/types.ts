/**
 * @fileoverview 사주팔자 핵심 타입 정의
 *
 * 사주(四柱) 계산에 사용되는 모든 인터페이스와 타입을 정의한다.
 * 천간(天干), 지지(地支), 오행(五行), 십성(十星), 신살(神殺) 등
 * 명리학 도메인의 기본 구조를 포함한다.
 */

/**
 * 사주의 기둥(柱) 하나를 나타내는 인터페이스.
 * 천간(stem)과 지지(branch)의 인덱스 쌍으로 구성된다.
 *
 * - stem: 0(갑/甲) ~ 9(계/癸)
 * - branch: 0(자/子) ~ 11(해/亥)
 */
export interface Pillar {
  stem: number;
  branch: number;
}

/** 사주 네 기둥의 위치: 연주(Year), 월주(Month), 일주(Day), 시주(Hour) */
export type PillarPosition = 'Year' | 'Month' | 'Day' | 'Hour';

/** 천간 관계 유형: 합(Hap, 天干合) 또는 충(Chung, 天干沖) */
export type StemRelationType = 'Hap' | 'Chung';

/**
 * 지지 관계 유형 (地支 關係)
 * - YukHap: 육합(六合) — 두 지지의 합
 * - Chung: 충(沖) — 대충 관계
 * - Hyung: 형(刑) — 삼형살 등
 * - Pa: 파(破)
 * - Hae: 해(害)
 * - BangHap: 방합(方合) — 같은 방위 삼지지의 합
 * - SamHap: 삼합(三合) — 삼합 오행 결합
 */
export type BranchRelationType =
  | 'YukHap'
  | 'Chung'
  | 'Hyung'
  | 'Pa'
  | 'Hae'
  | 'BangHap'
  | 'SamHap';

/** 천간 상호작용 (합 또는 충) 결과 */
export interface StemInteraction {
  /** 관계 유형 */
  relation: StemRelationType;
  /** 해당 관계가 발생한 두 기둥의 위치 */
  positions: [PillarPosition, PillarPosition];
  /** 관계에 참여하는 두 천간의 인덱스 */
  stems: [number, number];
  /** 합(合)인 경우 생성되는 오행, 충(沖)이면 null */
  resultElement: Element | null;
}

/** 지지 상호작용 (합/충/형/파/해) 결과 */
export interface BranchInteraction {
  /** 관계 유형 */
  relation: BranchRelationType;
  /** 해당 관계가 발생한 기둥 위치들 (방합/삼합은 3개) */
  positions: PillarPosition[];
  /** 관계에 참여하는 지지 인덱스들 */
  branches: number[];
  /** 합(合)인 경우 생성되는 오행, 그 외에는 null */
  resultElement: Element | null;
}

/**
 * 주요 신살(神殺) 종류.
 * 길신(吉神)과 흉신(凶神)을 모두 포함한다.
 */
export type ShinsalKind =
  | 'DoHwaSal'        // 도화살(桃花殺) — 매력, 이성
  | 'CheonEulGwiIn'   // 천을귀인(天乙貴人) — 최고 길신
  | 'YeokMaSal'       // 역마살(驛馬殺) — 이동, 변화
  | 'MunChangGwiIn'   // 문창귀인(文昌貴人) — 학문, 시험
  | 'HakDangGwiIn'    // 학당귀인(學堂貴人) — 학업 성취
  | 'CheonDeokGwiIn'  // 천덕귀인(天德貴人) — 재앙 해소
  | 'WolDeokGwiIn'    // 월덕귀인(月德貴人) — 재앙 해소
  | 'YangInSal'       // 양인살(羊刃殺) — 극단적 에너지
  | 'GongMang'        // 공망(空亡) — 빈 기운
  | 'BaekHoSal'       // 백호살(白虎殺) — 사고, 부상
  | 'GoeGangSal'      // 괴강살(魁罡殺) — 강한 개성
  | 'WonJinSal'       // 원진살(怨嗔殺) — 원한, 불화
  | 'GwiMunGwanSal';  // 귀문관살(鬼門關殺) — 신경 예민

/** 신살 검출 결과 */
export interface ShinsalEntry {
  /** 신살 종류 */
  kind: ShinsalKind;
  /** 해당 신살이 발견된 기둥 위치들 */
  foundAt: PillarPosition[];
  /** 판단 기준이 되는 기둥 (연주/일주/월주 등) */
  basis: PillarPosition;
}

/** 성별 */
export type Gender = 'Male' | 'Female';

/** 대운 진행 방향: 순행(Forward) 또는 역행(Backward) */
export type Direction = 'Forward' | 'Backward';

/** 오행(五行): 목(Wood), 화(Fire), 토(Earth), 금(Metal), 수(Water) */
export type Element = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';

/**
 * 일간 기준 오행 관계 (五行 關係)
 * - Same: 비겁(比劫) — 같은 오행
 * - Output: 식상(食傷) — 일간이 생하는 오행
 * - Wealth: 재성(財星) — 일간이 극하는 오행
 * - Officer: 관성(官星) — 일간을 극하는 오행
 * - Resource: 인성(印星) — 일간을 생하는 오행
 */
export type Relation = 'Same' | 'Output' | 'Wealth' | 'Officer' | 'Resource';

/**
 * 십성(十星 / 십신).
 * 일간과 다른 천간의 음양·오행 관계에 따라 결정된다.
 */
export type TenGod =
  | 'BiGyeon'   // 비견(比肩) — 같은 오행, 같은 음양
  | 'GeopJae'   // 겁재(劫財) — 같은 오행, 다른 음양
  | 'SikShin'   // 식신(食神) — 생하는 오행, 같은 음양
  | 'SangGwan'  // 상관(傷官) — 생하는 오행, 다른 음양
  | 'PyeonJae'  // 편재(偏財) — 극하는 오행, 같은 음양
  | 'JeongJae'  // 정재(正財) — 극하는 오행, 다른 음양
  | 'ChilSal'   // 편관(偏官/七殺) — 극받는 오행, 같은 음양
  | 'JeongGwan' // 정관(正官) — 극받는 오행, 다른 음양
  | 'PyeonIn'   // 편인(偏印) — 생받는 오행, 같은 음양
  | 'JeongIn';  // 정인(正印) — 생받는 오행, 다른 음양

/** 12운성 기반 강약 분류: 강(Strong), 약(Weak), 중(Neutral) */
export type StrengthClass = 'Strong' | 'Weak' | 'Neutral';

/** 신강/신약 최종 판정 결과 */
export type StrengthVerdict = 'Strong' | 'Weak' | 'Neutral';

/** 24절기 정의 */
export interface TermDef {
  /** 절기 키 (예: 'lichun', 'jingzhe') */
  key: string;
  /** 한글 이름 (예: '입춘') */
  nameKo: string;
  /** 한자 이름 (예: '立春') */
  nameHanja: string;
  /** 영문 이름 (예: 'Lichun') */
  nameEn: string;
  /** 태양 황경 각도 (0~360도, 춘분=0) */
  angle: number;
}

/** 특정 연도의 절기 발생 시점 */
export interface SolarTerm {
  /** 절기 정의 */
  def: TermDef;
  /** 율리우스일(Julian Date) — 절기 발생 시각 */
  jd: number;
}

/** 음력 날짜 */
export interface LunarDate {
  year: number;
  month: number;
  day: number;
  /** 윤달 여부 */
  isLeap: boolean;
}

/**
 * 용신(用神) 판정 결과.
 * 억부용신법(抑扶用神法)에 따라 일간의 강약을 보완하는 오행을 결정한다.
 */
export interface YongshinResult {
  /** 용신(用神) — 가장 필요한 오행 */
  yongshin: Element;
  /** 희신(喜神) — 두 번째로 도움이 되는 오행 */
  heeshin: Element;
  /** 기신(忌神) — 가장 해로운 오행 */
  gishin: Element;
  /** 구신(仇神) — 두 번째로 해로운 오행 */
  gushin: Element;
  /** 억부법 방향: suppress=신강(억제), support=신약(부조) */
  method: 'suppress' | 'support';
}

/**
 * 평태양시(LMT, Local Mean Time) 보정 정보.
 * 표준시와 실제 지역 경도 차이에 의한 시간 보정을 담는다.
 */
export interface LmtInfo {
  /** 지역 경도 (도 단위) */
  longitude: number;
  /** 표준자오선 경도 (도 단위, 예: 한국 135도) */
  stdMeridian: number;
  /** 보정 시간 (초 단위, 양수=동쪽으로 보정) */
  correctionSeconds: number;
  /** 보정 후 지역 시각 (YYYY-MM-DD HH:mm:ss) */
  correctedLocal: string;
  /** 지역명 (예: 'Seoul/서울'), 경도 직접 입력 시 null */
  locationLabel: string | null;
}
