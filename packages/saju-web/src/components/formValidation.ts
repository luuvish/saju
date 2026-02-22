import {
  isSajuValidationError,
  validateRequest,
  type SajuRequest,
  type ValidationErrorCode,
} from 'saju-lib';

export type FieldName = 'date' | 'time' | 'tz' | 'location';
export type FieldErrors = Partial<Record<FieldName, string>>;

export interface FormValidationInput {
  date: string
  time: string
  calendar: string
  leapMonth: boolean
  gender: string
  tz: string
  useLmt: boolean
  location: string | null
  longitude: number | null
  daewonCount: number
  monthYear: number | null
  yearStart: number | null
  yearCount: number
}

export interface ValidationResult {
  fieldErrors: FieldErrors
  summary: string | null
}

interface MappedValidationError {
  field: FieldName | null
  fieldLabel: string | null
  message: string
  summary?: string
}

const GENERIC_VALIDATION_MESSAGE = '입력 형식 또는 범위를 확인해 주세요.';

function toRequest(input: FormValidationInput): SajuRequest {
  return {
    date: input.date,
    time: input.time,
    calendar: input.calendar === 'Lunar' ? 'Lunar' : 'Solar',
    leapMonth: input.leapMonth,
    gender: input.gender === 'Female' ? 'Female' : 'Male',
    tz: input.tz,
    useLmt: input.useLmt,
    location: input.location,
    longitude: input.longitude,
    daewonCount: input.daewonCount,
    monthYear: input.monthYear,
    yearStart: input.yearStart,
    yearCount: input.yearCount,
  };
}

function mapValidationCode(code: ValidationErrorCode): MappedValidationError {
  switch (code) {
    case 'TIME_FORMAT':
      return { field: 'time', fieldLabel: '시간', message: '시간 형식이 올바르지 않습니다.' };
    case 'TIME_HOUR_RANGE':
    case 'TIME_MINUTE_RANGE':
    case 'TIME_SECOND_RANGE':
      return { field: 'time', fieldLabel: '시간', message: '시간은 00:00~23:59 범위로 입력해 주세요.' };
    case 'DATE_FORMAT':
      return { field: 'date', fieldLabel: '날짜', message: '날짜 형식이 올바르지 않습니다.' };
    case 'DATE_MONTH_RANGE':
    case 'DATE_DAY_RANGE':
    case 'DATE_SOLAR_INVALID':
      return { field: 'date', fieldLabel: '날짜', message: '존재하지 않는 날짜입니다.' };
    case 'DATE_SOLAR_YEAR_RANGE':
      return { field: 'date', fieldLabel: '날짜', message: '양력은 1900년~2100년까지만 지원합니다.' };
    case 'DATE_LUNAR_YEAR_RANGE':
      return { field: 'date', fieldLabel: '날짜', message: '음력은 1900년~2099년까지만 지원합니다.' };
    case 'DATE_LUNAR_MONTH_RANGE':
      return { field: 'date', fieldLabel: '날짜', message: '음력 월은 1~12월만 입력할 수 있습니다.' };
    case 'DATE_LUNAR_DAY_RANGE':
      return { field: 'date', fieldLabel: '날짜', message: '해당 월에 없는 날짜입니다.' };
    case 'DATE_LUNAR_LEAP_MISMATCH':
      return { field: 'date', fieldLabel: '날짜', message: '선택한 윤달 여부가 날짜와 맞지 않습니다.' };
    case 'LEAP_MONTH_WITH_SOLAR':
      return { field: 'date', fieldLabel: '날짜', message: '양력에서는 윤달을 선택할 수 없습니다.' };
    case 'DATE_LUNAR_SOLAR_RANGE':
      return { field: 'date', fieldLabel: '날짜', message: '해당 날짜는 음력 변환 지원 범위를 벗어났습니다.' };
    case 'DATE_LUNAR_CONVERSION_FAILED':
      return { field: 'date', fieldLabel: '날짜', message: '날짜를 다시 확인해 주세요.' };
    case 'TIMEZONE_INVALID':
      return { field: 'tz', fieldLabel: '시간대', message: '시간대를 다시 선택해 주세요.' };
    case 'LMT_LONGITUDE_LOCATION_CONFLICT':
    case 'LMT_LOCATION_UNKNOWN':
    case 'LMT_LOCATION_REQUIRED':
    case 'LMT_LONGITUDE_RANGE':
      return { field: 'location', fieldLabel: '지역', message: '선택한 지역을 다시 확인해 주세요.' };
    case 'MONTH_YEAR_RANGE':
      return {
        field: null,
        fieldLabel: null,
        message: '월운 기준 연도는 1900~2100 범위의 정수여야 합니다.',
        summary: '월운 기준 연도를 1900~2100 범위의 정수로 설정해 주세요.',
      };
    case 'YEAR_START_RANGE':
      return {
        field: null,
        fieldLabel: null,
        message: '세운 시작 연도는 1900~2100 범위의 정수여야 합니다.',
        summary: '세운 시작 연도를 1900~2100 범위의 정수로 설정해 주세요.',
      };
    case 'YEAR_LUCK_RANGE':
      return {
        field: null,
        fieldLabel: null,
        message: '세운 범위는 1900~2100년 안에서만 설정할 수 있습니다.',
        summary: '세운 범위를 1900~2100 안에서 설정해 주세요.',
      };
    case 'DAEWON_COUNT_MIN':
      return {
        field: null,
        fieldLabel: null,
        message: '대운 개수는 1 이상의 정수여야 합니다.',
        summary: '대운 개수를 1 이상의 정수로 설정해 주세요.',
      };
    case 'DAEWON_COUNT_MAX':
      return {
        field: null,
        fieldLabel: null,
        message: '대운 개수는 최대 120까지만 설정할 수 있습니다.',
        summary: '대운 개수를 120 이하로 설정해 주세요.',
      };
    case 'YEAR_COUNT_MIN':
      return {
        field: null,
        fieldLabel: null,
        message: '세운 표시 기간은 1 이상의 정수여야 합니다.',
        summary: '세운 표시 기간을 1 이상의 정수로 설정해 주세요.',
      };
    case 'YEAR_COUNT_MAX':
      return {
        field: null,
        fieldLabel: null,
        message: '세운 표시 기간은 최대 120년까지만 설정할 수 있습니다.',
        summary: '세운 표시 기간을 120 이하로 설정해 주세요.',
      };
    default:
      return {
        field: null,
        fieldLabel: null,
        message: GENERIC_VALIDATION_MESSAGE,
        summary: GENERIC_VALIDATION_MESSAGE,
      };
  }
}

export function validateSajuFormInput(input: FormValidationInput): ValidationResult {
  try {
    validateRequest(toRequest(input));
    return { fieldErrors: {}, summary: null };
  } catch (err: unknown) {
    const mapped = isSajuValidationError(err)
      ? mapValidationCode(err.code)
      : {
          field: null,
          fieldLabel: null,
          message: GENERIC_VALIDATION_MESSAGE,
          summary: GENERIC_VALIDATION_MESSAGE,
        };
    const fieldErrors: FieldErrors = {};
    if (mapped.field) fieldErrors[mapped.field] = mapped.message;
    const summary = mapped.summary
      ?? (mapped.fieldLabel
        ? `입력값을 다시 확인해 주세요 (${mapped.fieldLabel}).`
        : '입력값을 다시 확인해 주세요.');
    return { fieldErrors, summary };
  }
}
