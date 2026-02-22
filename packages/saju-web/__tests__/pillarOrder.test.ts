import { describe, expect, it } from 'vitest';
import { PREVIEW_PILLAR_ORDER, sortPillarPositions } from '../src/components/pillarOrder';

describe('PREVIEW_PILLAR_ORDER', () => {
  it('천간/지지 본문 순서와 동일한 시-일-월-연(오른쪽→왼쪽 기준)을 유지한다', () => {
    expect(PREVIEW_PILLAR_ORDER).toEqual(['Hour', 'Day', 'Month', 'Year']);
  });

  it('위치 배열을 시-일-월-연 순으로 정렬한다', () => {
    expect(sortPillarPositions(['Hour', 'Year', 'Day'])).toEqual(['Hour', 'Day', 'Year']);
  });
});
