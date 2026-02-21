# saju

Saju palja (Four Pillars of Destiny) calculator using solar terms (Lichun based).

## Features
- Solar or lunar input; outputs the converted date.
- Pillars (year/month/day/hour) based on Lichun and solar terms.
- Ten gods, hidden stems, 12 stages, 12 shinsal, five elements.
- Stem interactions (hap, chung) and branch interactions (yukhap, chung, hyung, pa, hae, banghap, samhap).
- 13 shinsal detection (dowhasa, cheonelgwiin, yeokmasal, etc.).
- Strength assessment (strong/weak/neutral).
- Daewon (decennial), yearly, and monthly luck.
- Local mean time correction by longitude or location.
- Output language: ko|en.
- Dark mode support (web).

## Tech Stack

| Area | Technology |
|------|-----------|
| Monorepo | pnpm workspace |
| Core library | TypeScript (saju-lib) |
| CLI | Commander.js (saju-cli) |
| Web | Next.js 15 App Router (saju-web) |
| Date/Timezone | dayjs + dayjs/plugin/timezone |
| Test | Vitest |
| Build | tsup (lib, cli), next build (web) |

## Project Structure

```
saju/
├── package.json                 # pnpm workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.config.ts
├── packages/
│   ├── saju-lib/                # Core library
│   │   ├── src/
│   │   │   ├── index.ts         # Re-exports
│   │   │   ├── types.ts         # Type definitions
│   │   │   ├── astro.ts         # Solar term calculations (VSOP87)
│   │   │   ├── lunar.ts         # Lunar/solar calendar conversion
│   │   │   ├── bazi.ts          # Four pillars, ten gods, interactions, shinsal
│   │   │   ├── luck.ts          # Daewon, yearly, monthly luck
│   │   │   ├── location.ts      # Korean city locations, LMT correction
│   │   │   ├── timezone.ts      # IANA/fixed offset timezone handling
│   │   │   ├── i18n.ts          # Korean/English labels
│   │   │   └── service.ts       # Unified calculate() function
│   │   └── __tests__/
│   │       └── service.test.ts  # 16 unit tests
│   ├── saju-cli/                # CLI tool
│   │   └── src/
│   │       └── main.ts          # Commander-based CLI
│   └── saju-web/                # Next.js web app
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── globals.css
│       │   └── api/calculate/
│       │       └── route.ts     # POST API endpoint
│       └── components/
│           ├── SajuForm.tsx
│           ├── ResultDashboard.tsx
│           ├── PillarTable.tsx
│           ├── ElementsChart.tsx
│           ├── StrengthSection.tsx
│           ├── RelationsSection.tsx
│           ├── ShinsalSection.tsx
│           ├── DaewonTimeline.tsx
│           ├── YearlyLuck.tsx
│           └── MonthlyLuck.tsx
```

## Requirements
- Node.js 20+
- pnpm 9+

## Setup

```bash
pnpm install
pnpm --filter saju-lib build
pnpm --filter saju-cli build
```

## Test

```bash
pnpm test
```

## CLI Usage

```bash
node packages/saju-cli/dist/main.js --date YYYY-MM-DD --time HH:MM --tz Asia/Seoul --gender male
```

### Common options
- `--calendar` solar|lunar (default: solar)
- `--leap-month` (only with `--calendar lunar`)
- `--time` HH:MM or HH:MM:SS
- `--tz` IANA name or offset (+09:00)
- `--gender` male|female|m|f
- `--lang` ko|en
- `--show-terms`
- `--daewon-count` N
- `--month-year` YYYY
- `--year-start` YYYY, `--year-count` N
- `--local-mean-time`
- `--longitude` DEG
- `--location` NAME

### Examples

Solar input:

```bash
node packages/saju-cli/dist/main.js --date 2000-01-15 --time 17:15 --tz Asia/Seoul --gender male
```

Lunar input:

```bash
node packages/saju-cli/dist/main.js --calendar lunar --date 2000-01-01 --time 12:00 --tz Asia/Seoul --gender male
```

English output:

```bash
node packages/saju-cli/dist/main.js --date 1990-05-20 --time 08:30 --gender female --lang en
```

Local mean time by location:

```bash
node packages/saju-cli/dist/main.js --date 2000-01-15 --time 17:15 --tz Asia/Seoul --gender male --local-mean-time --location seoul
```

Show solar terms:

```bash
node packages/saju-cli/dist/main.js --date 2000-01-15 --time 17:15 --tz Asia/Seoul --gender male --show-terms
```

## Web Usage

```bash
pnpm --filter saju-web dev
```

Open `http://localhost:3000` in your browser. The form auto-submits on field changes.

### API

```bash
curl -X POST http://localhost:3000/api/calculate \
  -H 'Content-Type: application/json' \
  -d '{"date":"2000-01-15","time":"17:15","gender":"Male","calendar":"Solar","tz":"Asia/Seoul"}'
```

## Notes
- Day boundary for the day pillar is 23:00.
- Local mean time correction is enabled when `--location` or `--longitude` is provided.
- Lunar conversion range: 1900-2099.
