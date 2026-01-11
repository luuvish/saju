# saju

Saju palja calculator using solar terms (Lichun based).

## Features
- Solar or lunar input; outputs the converted date.
- Pillars (year/month/day/hour) based on Lichun and solar terms.
- Ten gods, hidden stems, 12 stages, 12 shinsal, five elements.
- Daewon (decennial), yearly, and monthly luck.
- Local mean time correction by longitude or location.
- Output language: ko|en.

## Requirements
- Rust 1.70+ (edition 2021)
- Cargo

## Build

```bash
cargo build
```

## Run

```bash
cargo run -- --date YYYY-MM-DD --time HH:MM --tz Asia/Seoul --gender male
```

## Common options
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

## Examples

Solar input:

```bash
cargo run -- --date YYYY-MM-DD --time HH:MM --tz Asia/Seoul --gender male
```

Lunar input:

```bash
cargo run -- --calendar lunar --date YYYY-MM-DD --time HH:MM --tz Asia/Seoul --gender male
```

Lunar input with leap month:

```bash
cargo run -- --calendar lunar --leap-month --date YYYY-MM-DD --time HH:MM --tz Asia/Seoul --gender female
```

Local mean time by location:

```bash
cargo run -- --date YYYY-MM-DD --time HH:MM --tz Asia/Seoul --gender male --location seoul
```

Local mean time by longitude:

```bash
cargo run -- --local-mean-time --longitude 126.9780 --date YYYY-MM-DD --time HH:MM --tz Asia/Seoul --gender male
```

Show solar terms for the input year:

```bash
cargo run -- --date YYYY-MM-DD --time HH:MM --tz Asia/Seoul --gender male --show-terms
```

## Notes
- Day boundary for the day pillar is 23:00.
- Local mean time correction is enabled when `--location` or `--longitude` is provided.
- Lunar conversion range: 1900-2099.
