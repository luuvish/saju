use chrono::{DateTime, NaiveDate, NaiveDateTime, NaiveTime, TimeZone, Utc};

use crate::types::{SolarTerm, TermDef};

pub const TERM_DEFS: [TermDef; 24] = [
    TermDef {
        key: "xiaohan",
        name_ko: "소한",
        name_hanja: "小寒",
        name_en: "Xiaohan",
        angle: 285.0,
    },
    TermDef {
        key: "dahan",
        name_ko: "대한",
        name_hanja: "大寒",
        name_en: "Dahan",
        angle: 300.0,
    },
    TermDef {
        key: "lichun",
        name_ko: "입춘",
        name_hanja: "立春",
        name_en: "Lichun",
        angle: 315.0,
    },
    TermDef {
        key: "yushui",
        name_ko: "우수",
        name_hanja: "雨水",
        name_en: "Yushui",
        angle: 330.0,
    },
    TermDef {
        key: "jingzhe",
        name_ko: "경칩",
        name_hanja: "驚蟄",
        name_en: "Jingzhe",
        angle: 345.0,
    },
    TermDef {
        key: "chunfen",
        name_ko: "춘분",
        name_hanja: "春分",
        name_en: "Chunfen",
        angle: 0.0,
    },
    TermDef {
        key: "qingming",
        name_ko: "청명",
        name_hanja: "清明",
        name_en: "Qingming",
        angle: 15.0,
    },
    TermDef {
        key: "guyu",
        name_ko: "곡우",
        name_hanja: "谷雨",
        name_en: "Guyu",
        angle: 30.0,
    },
    TermDef {
        key: "lixia",
        name_ko: "입하",
        name_hanja: "立夏",
        name_en: "Lixia",
        angle: 45.0,
    },
    TermDef {
        key: "xiaoman",
        name_ko: "소만",
        name_hanja: "小滿",
        name_en: "Xiaoman",
        angle: 60.0,
    },
    TermDef {
        key: "mangzhong",
        name_ko: "망종",
        name_hanja: "芒種",
        name_en: "Mangzhong",
        angle: 75.0,
    },
    TermDef {
        key: "xiazhi",
        name_ko: "하지",
        name_hanja: "夏至",
        name_en: "Xiazhi",
        angle: 90.0,
    },
    TermDef {
        key: "xiaoshu",
        name_ko: "소서",
        name_hanja: "小暑",
        name_en: "Xiaoshu",
        angle: 105.0,
    },
    TermDef {
        key: "dashu",
        name_ko: "대서",
        name_hanja: "大暑",
        name_en: "Dashu",
        angle: 120.0,
    },
    TermDef {
        key: "liqiu",
        name_ko: "입추",
        name_hanja: "立秋",
        name_en: "Liqiu",
        angle: 135.0,
    },
    TermDef {
        key: "chushu",
        name_ko: "처서",
        name_hanja: "處暑",
        name_en: "Chushu",
        angle: 150.0,
    },
    TermDef {
        key: "bailu",
        name_ko: "백로",
        name_hanja: "白露",
        name_en: "Bailu",
        angle: 165.0,
    },
    TermDef {
        key: "qiufen",
        name_ko: "추분",
        name_hanja: "秋分",
        name_en: "Qiufen",
        angle: 180.0,
    },
    TermDef {
        key: "hanlu",
        name_ko: "한로",
        name_hanja: "寒露",
        name_en: "Hanlu",
        angle: 195.0,
    },
    TermDef {
        key: "shuangjiang",
        name_ko: "상강",
        name_hanja: "霜降",
        name_en: "Shuangjiang",
        angle: 210.0,
    },
    TermDef {
        key: "lidong",
        name_ko: "입동",
        name_hanja: "立冬",
        name_en: "Lidong",
        angle: 225.0,
    },
    TermDef {
        key: "xiaoxue",
        name_ko: "소설",
        name_hanja: "小雪",
        name_en: "Xiaoxue",
        angle: 240.0,
    },
    TermDef {
        key: "daxue",
        name_ko: "대설",
        name_hanja: "大雪",
        name_en: "Daxue",
        angle: 255.0,
    },
    TermDef {
        key: "dongzhi",
        name_ko: "동지",
        name_hanja: "冬至",
        name_en: "Dongzhi",
        angle: 270.0,
    },
];

pub fn jd_from_datetime(dt: DateTime<Utc>) -> f64 {
    let seconds = dt.timestamp() as f64 + (dt.timestamp_subsec_nanos() as f64) / 1e9;
    seconds / 86400.0 + 2440587.5
}

pub fn datetime_from_jd(jd: f64) -> DateTime<Utc> {
    let seconds = (jd - 2440587.5) * 86400.0;
    let mut whole = seconds.floor() as i64;
    let mut nanos = ((seconds - whole as f64) * 1e9).round() as i64;
    if nanos >= 1_000_000_000 {
        whole += 1;
        nanos -= 1_000_000_000;
    } else if nanos < 0 {
        whole -= 1;
        nanos += 1_000_000_000;
    }
    DateTime::<Utc>::from_timestamp(whole, nanos as u32).unwrap()
}

pub fn jd_from_utc_date(year: i32, month: u32, day: u32, hour: u32, min: u32, sec: u32) -> f64 {
    let date = NaiveDate::from_ymd_opt(year, month, day).unwrap();
    let time = NaiveTime::from_hms_opt(hour, min, sec).unwrap();
    let naive = NaiveDateTime::new(date, time);
    let dt = Utc.from_utc_datetime(&naive);
    jd_from_datetime(dt)
}

pub fn compute_solar_terms(year: i32) -> Vec<SolarTerm> {
    let start = jd_from_utc_date(year, 1, 1, 0, 0, 0);
    let end = jd_from_utc_date(year + 1, 1, 1, 0, 0, 0);
    let days = (end - start).ceil() as i64;

    let mut targets = Vec::with_capacity(TERM_DEFS.len());
    let mut last = -1.0;
    for def in TERM_DEFS.iter() {
        let mut angle = def.angle;
        while angle <= last {
            angle += 360.0;
        }
        targets.push(angle);
        last = angle;
    }

    let mut results = Vec::with_capacity(TERM_DEFS.len());
    let mut target_idx = 0;
    let mut prev_jd = start;
    let mut prev_unwrapped = sun_apparent_longitude(prev_jd);

    for day in 1..=days {
        let jd = start + day as f64;
        let mut lon = sun_apparent_longitude(jd);
        if lon < prev_unwrapped {
            lon += 360.0;
        }
        while target_idx < targets.len() && targets[target_idx] <= lon {
            let target = targets[target_idx];
            if target < prev_unwrapped {
                target_idx += 1;
                continue;
            }
            let term_jd = refine_term(prev_jd, jd, prev_unwrapped, target);
            results.push(SolarTerm {
                def: &TERM_DEFS[target_idx],
                jd: term_jd,
            });
            target_idx += 1;
        }
        prev_jd = jd;
        prev_unwrapped = lon;
    }

    results
}

fn sun_apparent_longitude(jd: f64) -> f64 {
    let t = (jd - 2451545.0) / 36525.0;
    let l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
    let m = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
    let m_rad = deg_to_rad(m);
    let c = (1.914602 - 0.004817 * t - 0.000014 * t * t) * m_rad.sin()
        + (0.019993 - 0.000101 * t) * (2.0 * m_rad).sin()
        + 0.000289 * (3.0 * m_rad).sin();
    let true_long = l0 + c;
    let omega = 125.04 - 1934.136 * t;
    let lambda = true_long - 0.00569 - 0.00478 * deg_to_rad(omega).sin();
    norm_deg(lambda)
}

fn refine_term(jd0: f64, jd1: f64, lon0: f64, target: f64) -> f64 {
    let mut lo = jd0;
    let mut hi = jd1;
    let mut lo_lon = lon0;
    for _ in 0..60 {
        let mid = (lo + hi) / 2.0;
        let mut mid_lon = sun_apparent_longitude(mid);
        if mid_lon < lo_lon {
            mid_lon += 360.0;
        }
        if mid_lon >= target {
            hi = mid;
        } else {
            lo = mid;
            lo_lon = mid_lon;
        }
    }
    (lo + hi) / 2.0
}

fn deg_to_rad(deg: f64) -> f64 {
    deg.to_radians()
}

fn norm_deg(mut deg: f64) -> f64 {
    deg = deg % 360.0;
    if deg < 0.0 {
        deg += 360.0;
    }
    deg
}
