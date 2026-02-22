import type { PillarPosition } from 'saju-lib';

/** 화면 표시용 표준 기둥 순서 (오른쪽→왼쪽: 연-월-일-시, 즉 좌→우는 시-일-월-연) */
export const PILLAR_DISPLAY_ORDER: readonly PillarPosition[] = ['Hour', 'Day', 'Month', 'Year'];

/** 미리보기/툴팁도 본문과 같은 순서를 사용한다 */
export const PREVIEW_PILLAR_ORDER: readonly PillarPosition[] = PILLAR_DISPLAY_ORDER;

const ORDER_RANK: Readonly<Record<PillarPosition, number>> = {
  Hour: 0,
  Day: 1,
  Month: 2,
  Year: 3,
};

/** 위치 배열을 화면 표시 순서로 정렬한다 */
export function sortPillarPositions(positions: readonly PillarPosition[]): PillarPosition[] {
  return [...positions].sort((a, b) => ORDER_RANK[a] - ORDER_RANK[b]);
}
