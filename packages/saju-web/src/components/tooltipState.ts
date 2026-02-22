export interface TooltipState {
  pinnedKey: string | null;
  hoverKey: string | null;
}

export const EMPTY_TOOLTIP_STATE: TooltipState = {
  pinnedKey: null,
  hoverKey: null,
};

/** 같은 카드를 다시 누르면 닫고, 다른 카드를 누르면 교체한다 */
export function togglePinnedTooltip(state: TooltipState, key: string): TooltipState {
  if (state.pinnedKey === key) return EMPTY_TOOLTIP_STATE;
  return { pinnedKey: key, hoverKey: null };
}

/** hover/focus 진입 시 툴팁을 임시로 연다 */
export function openTooltipHover(state: TooltipState, key: string): TooltipState {
  // pinned 상태에서는 hover로 다른 카드를 열지 않는다.
  if (state.pinnedKey !== null) return state;
  if (state.hoverKey === key) return state;
  return { ...state, hoverKey: key };
}

/** hover/focus 이탈 시 해당 카드의 임시 오픈을 닫는다 */
export function closeTooltipHover(state: TooltipState, key: string): TooltipState {
  if (state.hoverKey !== key) return state;
  return { ...state, hoverKey: null };
}

/** 그룹 전체 툴팁을 닫는다 (바깥 클릭/터치, Escape) */
export function closeAllTooltips(state: TooltipState): TooltipState {
  if (state.pinnedKey === null && state.hoverKey === null) return state;
  return EMPTY_TOOLTIP_STATE;
}

/** 카드별 실제 오픈 상태 */
export function isTooltipOpen(state: TooltipState, key: string): boolean {
  return state.pinnedKey === key || state.hoverKey === key;
}

/** 키보드 조작에 따른 툴팁 상태 전이 */
export function nextTooltipStateOnKey(state: TooltipState, key: string, pressedKey: string): TooltipState {
  if (pressedKey === 'Enter' || pressedKey === ' ') return togglePinnedTooltip(state, key);
  if (pressedKey === 'Escape') return closeAllTooltips(state);
  return state;
}
