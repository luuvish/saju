import { describe, expect, it } from 'vitest';
import { shouldCloseTooltipOnPointerDown } from '../src/components/tooltipDom';

describe('shouldCloseTooltipOnPointerDown', () => {
  it('루트 내부 클릭이면 닫지 않는다', () => {
    const inside = { nodeType: 1 } as Node;
    const root = { contains: (target: Node | null) => target === inside };
    expect(shouldCloseTooltipOnPointerDown(root, inside)).toBe(false);
  });

  it('루트 외부 클릭이면 닫는다', () => {
    const inside = { nodeType: 1 } as Node;
    const outside = { nodeType: 1 } as Node;
    const root = { contains: (target: Node | null) => target === inside };
    expect(shouldCloseTooltipOnPointerDown(root, outside)).toBe(true);
  });

  it('target이 없으면 닫고, root가 없으면 닫지 않는다', () => {
    const root = { contains: (_target: Node | null) => false };
    expect(shouldCloseTooltipOnPointerDown(root, null)).toBe(true);
    expect(shouldCloseTooltipOnPointerDown(null, 'outside')).toBe(false);
  });

  it('Node가 아닌 target이면 바깥 클릭으로 본다', () => {
    const root = { contains: (_target: Node | null) => false };
    expect(shouldCloseTooltipOnPointerDown(root, 'outside')).toBe(true);
    expect(shouldCloseTooltipOnPointerDown(root, { foo: 'bar' })).toBe(true);
  });
});
