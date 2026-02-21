export interface Pillar {
  stem: number;
  branch: number;
}

export type PillarPosition = 'Year' | 'Month' | 'Day' | 'Hour';

export type StemRelationType = 'Hap' | 'Chung';

export type BranchRelationType =
  | 'YukHap'
  | 'Chung'
  | 'Hyung'
  | 'Pa'
  | 'Hae'
  | 'BangHap'
  | 'SamHap';

export interface StemInteraction {
  relation: StemRelationType;
  positions: [PillarPosition, PillarPosition];
  stems: [number, number];
  resultElement: Element | null;
}

export interface BranchInteraction {
  relation: BranchRelationType;
  positions: PillarPosition[];
  branches: number[];
  resultElement: Element | null;
}

export type ShinsalKind =
  | 'DoHwaSal'
  | 'CheonEulGwiIn'
  | 'YeokMaSal'
  | 'MunChangGwiIn'
  | 'HakDangGwiIn'
  | 'CheonDeokGwiIn'
  | 'WolDeokGwiIn'
  | 'YangInSal'
  | 'GongMang'
  | 'BaekHoSal'
  | 'GoeGangSal'
  | 'WonJinSal'
  | 'GwiMunGwanSal';

export interface ShinsalEntry {
  kind: ShinsalKind;
  foundAt: PillarPosition[];
  basis: PillarPosition;
}

export type Gender = 'Male' | 'Female';

export type Direction = 'Forward' | 'Backward';

export type Element = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';

export type Relation = 'Same' | 'Output' | 'Wealth' | 'Officer' | 'Resource';

export type TenGod =
  | 'BiGyeon'
  | 'GeopJae'
  | 'SikShin'
  | 'SangGwan'
  | 'PyeonJae'
  | 'JeongJae'
  | 'ChilSal'
  | 'JeongGwan'
  | 'PyeonIn'
  | 'JeongIn';

export type StrengthClass = 'Strong' | 'Weak' | 'Neutral';

export type StrengthVerdict = 'Strong' | 'Weak' | 'Neutral';

export interface TermDef {
  key: string;
  nameKo: string;
  nameHanja: string;
  nameEn: string;
  angle: number;
}

export interface SolarTerm {
  def: TermDef;
  jd: number;
}

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeap: boolean;
}

export interface LmtInfo {
  longitude: number;
  stdMeridian: number;
  correctionSeconds: number;
  correctedLocal: string;
  locationLabel: string | null;
}
