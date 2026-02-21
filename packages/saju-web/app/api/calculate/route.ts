import { NextResponse } from 'next/server';
import { calculate, type SajuRequest } from 'saju-lib';

/** 요청 본문 검증. 실패 시 에러 메시지 반환, 성공 시 null */
function validateRequest(body: Record<string, unknown>): string | null {
  if (!body.date || typeof body.date !== 'string') {
    return 'date is required (YYYY-MM-DD)'
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return 'date must be YYYY-MM-DD format'
  }

  if (!body.time || typeof body.time !== 'string') {
    return 'time is required (HH:MM or HH:MM:SS)'
  }
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(body.time)) {
    return 'time must be HH:MM or HH:MM:SS format'
  }

  if (body.calendar !== undefined && body.calendar !== 'Solar' && body.calendar !== 'Lunar') {
    return 'calendar must be Solar or Lunar'
  }

  if (body.gender !== undefined && body.gender !== 'Male' && body.gender !== 'Female') {
    return 'gender must be Male or Female'
  }

  if (body.daewonCount !== undefined) {
    if (typeof body.daewonCount !== 'number' || !Number.isInteger(body.daewonCount) || body.daewonCount < 1) {
      return 'daewonCount must be a positive integer'
    }
  }

  if (body.yearCount !== undefined) {
    if (typeof body.yearCount !== 'number' || !Number.isInteger(body.yearCount) || body.yearCount < 1) {
      return 'yearCount must be a positive integer'
    }
  }

  if (body.tz !== undefined) {
    if (typeof body.tz !== 'string' || body.tz.trim() === '') {
      return 'tz must be a non-empty string'
    }
  }

  if (body.longitude !== undefined && body.longitude !== null) {
    if (typeof body.longitude !== 'number' || body.longitude < -180 || body.longitude > 180) {
      return 'longitude must be a number between -180 and 180'
    }
  }

  if (body.location !== undefined && body.location !== null) {
    if (typeof body.location !== 'string') {
      return 'location must be a string'
    }
  }

  return null
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const error = validateRequest(body)
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    const req: SajuRequest = {
      date: body.date,
      time: body.time,
      calendar: body.calendar ?? 'Solar',
      leapMonth: body.leapMonth ?? false,
      gender: body.gender ?? 'Male',
      tz: body.tz ?? 'Asia/Seoul',
      useLmt: body.useLmt ?? false,
      longitude: body.longitude ?? null,
      location: body.location ?? null,
      daewonCount: body.daewonCount ?? 10,
      monthYear: body.monthYear ?? null,
      yearStart: body.yearStart ?? null,
      yearCount: body.yearCount ?? 3,
    };

    try {
      const result = calculate(req);
      return NextResponse.json(result);
    } catch (calcError: unknown) {
      // calculate() 내부 에러는 서버 오류로 분류
      const message = calcError instanceof Error ? calcError.message : 'Internal server error';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (error: unknown) {
    // JSON 파싱 에러 등 요청 처리 에러는 클라이언트 오류
    const message = error instanceof Error ? error.message : 'Bad request';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
