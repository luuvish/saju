import { NextResponse } from 'next/server';
import { calculate, type SajuRequest } from 'saju-lib';

export async function POST(request: Request) {
  try {
    const body = await request.json();

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

    const result = calculate(req);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
