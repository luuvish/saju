struct LocationDef {
    key: &'static str,
    display: &'static str,
    longitude: f64,
    aliases: &'static [&'static str],
}

const LOCATIONS: [LocationDef; 15] = [
    LocationDef {
        key: "seoul",
        display: "Seoul/서울",
        longitude: 126.9780,
        aliases: &["seoul", "서울"],
    },
    LocationDef {
        key: "busan",
        display: "Busan/부산",
        longitude: 129.0756,
        aliases: &["busan", "부산"],
    },
    LocationDef {
        key: "daegu",
        display: "Daegu/대구",
        longitude: 128.6014,
        aliases: &["daegu", "대구"],
    },
    LocationDef {
        key: "incheon",
        display: "Incheon/인천",
        longitude: 126.7052,
        aliases: &["incheon", "인천"],
    },
    LocationDef {
        key: "gwangju",
        display: "Gwangju/광주",
        longitude: 126.8514,
        aliases: &["gwangju", "광주"],
    },
    LocationDef {
        key: "daejeon",
        display: "Daejeon/대전",
        longitude: 127.3845,
        aliases: &["daejeon", "대전"],
    },
    LocationDef {
        key: "ulsan",
        display: "Ulsan/울산",
        longitude: 129.3114,
        aliases: &["ulsan", "울산"],
    },
    LocationDef {
        key: "sejong",
        display: "Sejong/세종",
        longitude: 127.2890,
        aliases: &["sejong", "세종"],
    },
    LocationDef {
        key: "suwon",
        display: "Suwon/수원",
        longitude: 127.0078,
        aliases: &["suwon", "수원"],
    },
    LocationDef {
        key: "changwon",
        display: "Changwon/창원",
        longitude: 128.6811,
        aliases: &["changwon", "창원"],
    },
    LocationDef {
        key: "cheongju",
        display: "Cheongju/청주",
        longitude: 127.4890,
        aliases: &["cheongju", "청주"],
    },
    LocationDef {
        key: "jeonju",
        display: "Jeonju/전주",
        longitude: 127.1480,
        aliases: &["jeonju", "전주"],
    },
    LocationDef {
        key: "jeju",
        display: "Jeju/제주",
        longitude: 126.5312,
        aliases: &["jeju", "제주"],
    },
    LocationDef {
        key: "gangneung",
        display: "Gangneung/강릉",
        longitude: 128.8761,
        aliases: &["gangneung", "강릉"],
    },
    LocationDef {
        key: "pohang",
        display: "Pohang/포항",
        longitude: 129.3650,
        aliases: &["pohang", "포항"],
    },
];

pub struct LocationMatch {
    pub display: &'static str,
    pub longitude: f64,
}

pub fn resolve_location(input: &str) -> Option<LocationMatch> {
    let norm = normalize_location(input);
    for loc in LOCATIONS.iter() {
        if normalize_location(loc.key) == norm {
            return Some(LocationMatch {
                display: loc.display,
                longitude: loc.longitude,
            });
        }
        if normalize_location(loc.display) == norm {
            return Some(LocationMatch {
                display: loc.display,
                longitude: loc.longitude,
            });
        }
        if loc
            .aliases
            .iter()
            .any(|alias| normalize_location(alias) == norm)
        {
            return Some(LocationMatch {
                display: loc.display,
                longitude: loc.longitude,
            });
        }
    }
    None
}

pub fn location_hint() -> String {
    LOCATIONS
        .iter()
        .map(|loc| loc.key)
        .collect::<Vec<_>>()
        .join(", ")
}

pub fn lmt_correction(longitude: f64, offset_seconds: i32) -> (f64, i64) {
    let std_meridian = (offset_seconds as f64) / 3600.0 * 15.0;
    let correction_seconds = ((longitude - std_meridian) * 240.0).round() as i64;
    (std_meridian, correction_seconds)
}

fn normalize_location(input: &str) -> String {
    input
        .trim()
        .to_lowercase()
        .chars()
        .filter(|c| !c.is_whitespace() && *c != '-' && *c != '_' && *c != '.')
        .collect()
}
