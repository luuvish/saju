import { describe, expect, it } from 'vitest';
import {
  closeAllTooltips,
  closeTooltipHover,
  EMPTY_TOOLTIP_STATE,
  isTooltipOpen,
  nextTooltipStateOnKey,
  openTooltipHover,
  togglePinnedTooltip,
} from '../src/components/tooltipState';

describe('tooltipState', () => {
  it('같은 카드를 다시 누르면 고정 오픈이 닫힌다', () => {
    const s1 = { pinnedKey: 'a', hoverKey: null };
    expect(togglePinnedTooltip(s1, 'a')).toEqual({ pinnedKey: null, hoverKey: null });
  });

  it('다른 카드를 누르면 고정 오픈 대상이 교체된다', () => {
    const s1 = { pinnedKey: 'a', hoverKey: null };
    expect(togglePinnedTooltip(s1, 'b')).toEqual({ pinnedKey: 'b', hoverKey: null });
  });

  it('hover가 남아 있어도 같은 카드를 다시 누르면 완전히 닫힌다', () => {
    const s1 = { pinnedKey: 'a', hoverKey: 'a' };
    expect(togglePinnedTooltip(s1, 'a')).toEqual(EMPTY_TOOLTIP_STATE);
  });

  it('새 카드를 고정 오픈하면 기존 hover 상태를 정리한다', () => {
    const s1 = { pinnedKey: null, hoverKey: 'a' };
    expect(togglePinnedTooltip(s1, 'b')).toEqual({ pinnedKey: 'b', hoverKey: null });
  });

  it('hover 진입/이탈이 동작한다', () => {
    const s1 = openTooltipHover(EMPTY_TOOLTIP_STATE, 'k1');
    expect(s1).toEqual({ pinnedKey: null, hoverKey: 'k1' });
    expect(closeTooltipHover(s1, 'k1')).toEqual(EMPTY_TOOLTIP_STATE);
  });

  it('pinned가 있으면 다른 카드 hover 오픈을 무시한다', () => {
    const s1 = { pinnedKey: 'k1', hoverKey: null };
    expect(openTooltipHover(s1, 'k2')).toEqual(s1);
  });

  it('focus -> click(pin) -> blur 순서에서도 pinned 오픈은 유지된다', () => {
    const s1 = openTooltipHover(EMPTY_TOOLTIP_STATE, 'k1');
    const s2 = togglePinnedTooltip(s1, 'k1');
    const s3 = closeTooltipHover(s2, 'k1');
    expect(s3).toEqual({ pinnedKey: 'k1', hoverKey: null });
    expect(isTooltipOpen(s3, 'k1')).toBe(true);
  });

  it('isTooltipOpen은 hover 또는 pinned일 때 true', () => {
    expect(isTooltipOpen({ pinnedKey: 'k1', hoverKey: null }, 'k1')).toBe(true);
    expect(isTooltipOpen({ pinnedKey: null, hoverKey: 'k1' }, 'k1')).toBe(true);
    expect(isTooltipOpen(EMPTY_TOOLTIP_STATE, 'k1')).toBe(false);
  });

  it('Enter/Space로 pinned 토글, Escape로 전체 닫힘', () => {
    const s1 = nextTooltipStateOnKey(EMPTY_TOOLTIP_STATE, 'k1', 'Enter');
    expect(s1).toEqual({ pinnedKey: 'k1', hoverKey: null });
    const s2 = nextTooltipStateOnKey(s1, 'k1', ' ');
    expect(s2).toEqual(EMPTY_TOOLTIP_STATE);
    const s3 = nextTooltipStateOnKey({ pinnedKey: 'k1', hoverKey: 'k1' }, 'k1', 'Escape');
    expect(s3).toEqual(EMPTY_TOOLTIP_STATE);
  });

  it('outside action은 전체 툴팁을 닫는다', () => {
    const s1 = { pinnedKey: 'k1', hoverKey: 'k2' };
    expect(closeAllTooltips(s1)).toEqual(EMPTY_TOOLTIP_STATE);
  });
});
