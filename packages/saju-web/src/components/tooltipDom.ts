interface ContainsTarget {
  contains: (target: Node | null) => boolean;
}

function isNodeLike(target: unknown): target is Node {
  return !!target && typeof target === 'object' && 'nodeType' in (target as { nodeType?: unknown });
}

/**
 * 바깥 pointerdown인지 판단한다.
 * root가 없으면(언마운트 상태) 닫지 않는다.
 */
export function shouldCloseTooltipOnPointerDown(root: ContainsTarget | null, target: unknown): boolean {
  if (!root) return false;
  if (target === null || target === undefined) return true;
  if (!isNodeLike(target)) return true;
  return !root.contains(target);
}
