# CLAUDE.md — Project Conventions

## Overview

사주팔자(Four Pillars of Destiny) 계산기. pnpm 모노레포로 구성되며,
핵심 라이브러리(saju-lib), CLI(saju-cli), 웹 앱(saju-web) 세 패키지로 나뉜다.

## Quick Commands

```bash
pnpm install          # 의존성 설치
pnpm build            # 전체 빌드 (saju-lib → saju-cli → saju-web)
pnpm test             # Vitest 테스트 실행
pnpm dev              # Next.js 개발 서버 (localhost:3000)
```

## Project Structure

- `packages/saju-lib/` — 핵심 계산 라이브러리 (TypeScript, tsup)
- `packages/saju-cli/` — Commander.js CLI (saju-lib 의존)
- `packages/saju-web/` — Next.js 15 App Router 웹 앱 (saju-lib 의존)

## Architecture Principles

- **saju-lib is the single source of truth.** 모든 사주 계산 로직은 saju-lib에 집중.
  CLI와 Web은 saju-lib의 `calculate()` 함수를 호출하여 결과를 표시만 한다.
- **No external API dependencies.** 절기 계산(VSOP87), 음양력 변환 모두 자체 구현.
- **Pure functions preferred.** bazi.ts, astro.ts, lunar.ts는 순수 함수로 구성.

## Coding Conventions

### Language & Style
- TypeScript strict mode
- 주석/JSDoc: 한국어 중심 (사주 도메인 용어), 영문 병기
- 코드 변수/함수명: 영문 (도메인 용어는 로마자 표기: `yongshin`, `daewon`, `shinsal`)
- No semicolons (prettier default)
- Single quotes for strings

### Type System
- 천간(Stems): `number` 0-9 (甲=0 ~ 癸=9)
- 지지(Branches): `number` 0-11 (子=0 ~ 亥=11)
- 오행(Elements): `'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water'`
- 성별(Gender): `'Male' | 'Female'`
- 기둥위치(PillarPosition): `'year' | 'month' | 'day' | 'hour'`

### File Organization (saju-lib)
- `types.ts` — 공유 타입/인터페이스 정의
- `bazi.ts` — 사주 계산 핵심 (기둥, 십성, 합충, 신살, 강약, 용신)
- `astro.ts` — 천문 계산 (절기, 율리우스일)
- `lunar.ts` — 음양력 변환
- `luck.ts` — 대운/세운/월운
- `timezone.ts` — 시간대 처리
- `location.ts` — 위치/LMT 보정
- `i18n.ts` — 한/영 라벨
- `service.ts` — 통합 API (`calculate()`, `parseTime()`)

### Web Components (saju-web)
- `components/utils.ts` — 공통 헬퍼 (elementCss, stemSub, branchSub)
- 각 컴포넌트는 `result: SajuResult`와 `i18n: I18n`을 props로 받음
- `'use client'` 지시어 사용 (Next.js App Router)

## Testing

- Vitest 사용, 테스트 파일: `packages/saju-lib/__tests__/service.test.ts`
- 코드 변경 후 반드시 `pnpm test` 실행하여 회귀 확인
- `pnpm build`로 TypeScript 컴파일 에러 없음 확인

## Domain Notes

- 일주 경계: 23:00 (자시 구분)
- 음력 변환 범위: 1900-2099
- 대운 기산: 3일 = 1년 비율
- 양남음녀(陽男陰女) 순행, 음남양녀(陰男陽女) 역행
- 절기 기반 월주: 입춘(立春)을 연 시작으로 사용
