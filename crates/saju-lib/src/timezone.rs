use chrono::{DateTime, FixedOffset, NaiveDateTime, Offset, TimeZone, Utc};
use chrono_tz::Tz;
use std::str::FromStr;

#[derive(Clone, Copy, Debug)]
pub enum TimeZoneSpec {
    Fixed(FixedOffset),
    Named(Tz),
}

impl TimeZoneSpec {
    pub fn localize(&self, naive: NaiveDateTime) -> Result<DateTime<FixedOffset>, String> {
        use chrono::offset::LocalResult;
        match self {
            TimeZoneSpec::Fixed(offset) => offset
                .from_local_datetime(&naive)
                .single()
                .ok_or_else(|| "invalid local time for fixed offset".to_string()),
            TimeZoneSpec::Named(tz) => match tz.from_local_datetime(&naive) {
                LocalResult::Single(dt) => Ok(dt.with_timezone(&dt.offset().fix())),
                LocalResult::Ambiguous(dt1, _) => Ok(dt1.with_timezone(&dt1.offset().fix())),
                LocalResult::None => Err("local time does not exist in this timezone".to_string()),
            },
        }
    }

    pub fn to_local(&self, utc: DateTime<Utc>) -> DateTime<FixedOffset> {
        match self {
            TimeZoneSpec::Fixed(offset) => utc.with_timezone(offset),
            TimeZoneSpec::Named(tz) => {
                let dt = tz.from_utc_datetime(&utc.naive_utc());
                dt.with_timezone(&dt.offset().fix())
            }
        }
    }

    pub fn name(&self) -> String {
        match self {
            TimeZoneSpec::Fixed(offset) => format!("{}", offset),
            TimeZoneSpec::Named(tz) => tz.name().to_string(),
        }
    }
}

pub fn parse_timezone(input: &str) -> Result<TimeZoneSpec, String> {
    if let Some(offset) = parse_fixed_offset(input) {
        return Ok(TimeZoneSpec::Fixed(offset));
    }
    if let Ok(tz) = Tz::from_str(input) {
        return Ok(TimeZoneSpec::Named(tz));
    }
    Err("timezone must be IANA name (e.g., Asia/Seoul) or offset (+09:00)".to_string())
}

fn parse_fixed_offset(input: &str) -> Option<FixedOffset> {
    let trimmed = input.trim();
    let sign = if trimmed.starts_with('+') {
        1
    } else if trimmed.starts_with('-') {
        -1
    } else {
        return None;
    };
    let rest = &trimmed[1..];
    let (hours, minutes) = if let Some((h, m)) = rest.split_once(':') {
        (h, m)
    } else if rest.len() == 4 {
        (&rest[0..2], &rest[2..4])
    } else {
        return None;
    };
    let hours: i32 = hours.parse().ok()?;
    let minutes: i32 = minutes.parse().ok()?;
    if hours.abs() > 23 || minutes.abs() > 59 {
        return None;
    }
    let total = sign * (hours * 3600 + minutes * 60);
    FixedOffset::east_opt(total)
}
