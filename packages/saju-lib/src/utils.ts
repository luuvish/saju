/**
 * @fileoverview 공유 유틸리티 함수
 *
 * 여러 모듈에서 공통으로 사용되는 헬퍼 함수를 제공한다.
 */

/**
 * 유클리드 나머지 (항상 양수 반환).
 * JavaScript의 `%` 연산자는 피제수가 음수일 때 음수를 반환하므로,
 * 항상 0 이상의 결과가 필요한 순환 인덱스 계산에 이 함수를 사용한다.
 *
 * @param a 피제수
 * @param b 제수 (양수)
 * @returns 0 이상 b 미만의 나머지
 */
export function remEuclid(a: number, b: number): number {
  return ((a % b) + b) % b
}
