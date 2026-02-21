interface LocationDef {
  key: string;
  display: string;
  longitude: number;
  aliases: string[];
}

const LOCATIONS: LocationDef[] = [
  { key: 'seoul', display: 'Seoul/서울', longitude: 126.978, aliases: ['seoul', '서울'] },
  { key: 'busan', display: 'Busan/부산', longitude: 129.0756, aliases: ['busan', '부산'] },
  { key: 'daegu', display: 'Daegu/대구', longitude: 128.6014, aliases: ['daegu', '대구'] },
  { key: 'incheon', display: 'Incheon/인천', longitude: 126.7052, aliases: ['incheon', '인천'] },
  { key: 'gwangju', display: 'Gwangju/광주', longitude: 126.8514, aliases: ['gwangju', '광주'] },
  { key: 'daejeon', display: 'Daejeon/대전', longitude: 127.3845, aliases: ['daejeon', '대전'] },
  { key: 'ulsan', display: 'Ulsan/울산', longitude: 129.3114, aliases: ['ulsan', '울산'] },
  { key: 'sejong', display: 'Sejong/세종', longitude: 127.289, aliases: ['sejong', '세종'] },
  { key: 'suwon', display: 'Suwon/수원', longitude: 127.0078, aliases: ['suwon', '수원'] },
  { key: 'changwon', display: 'Changwon/창원', longitude: 128.6811, aliases: ['changwon', '창원'] },
  { key: 'cheongju', display: 'Cheongju/청주', longitude: 127.489, aliases: ['cheongju', '청주'] },
  { key: 'jeonju', display: 'Jeonju/전주', longitude: 127.148, aliases: ['jeonju', '전주'] },
  { key: 'jeju', display: 'Jeju/제주', longitude: 126.5312, aliases: ['jeju', '제주'] },
  { key: 'gangneung', display: 'Gangneung/강릉', longitude: 128.8761, aliases: ['gangneung', '강릉'] },
  { key: 'pohang', display: 'Pohang/포항', longitude: 129.365, aliases: ['pohang', '포항'] },
];

export interface LocationMatch {
  display: string;
  longitude: number;
}

export interface LocationInfo {
  key: string;
  display: string;
  longitude: number;
}

function normalizeLocation(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s\-_.]/g, '');
}

export function resolveLocation(input: string): LocationMatch | null {
  const norm = normalizeLocation(input);
  for (const loc of LOCATIONS) {
    if (normalizeLocation(loc.key) === norm) {
      return { display: loc.display, longitude: loc.longitude };
    }
    if (normalizeLocation(loc.display) === norm) {
      return { display: loc.display, longitude: loc.longitude };
    }
    if (loc.aliases.some((alias) => normalizeLocation(alias) === norm)) {
      return { display: loc.display, longitude: loc.longitude };
    }
  }
  return null;
}

export function locationHint(): string {
  return LOCATIONS.map((loc) => loc.key).join(', ');
}

export function locationList(): LocationInfo[] {
  return LOCATIONS.map((loc) => ({
    key: loc.key,
    display: loc.display,
    longitude: loc.longitude,
  }));
}

export function lmtCorrection(longitude: number, offsetSeconds: number): [number, number] {
  const stdMeridian = (offsetSeconds / 3600) * 15;
  const correctionSeconds = Math.round((longitude - stdMeridian) * 240);
  return [stdMeridian, correctionSeconds];
}
