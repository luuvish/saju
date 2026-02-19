use std::process::Command;

fn run_cli(args: &[&str]) -> (String, bool) {
    let output = Command::new("cargo")
        .args(["run", "-p", "saju-cli", "--"])
        .args(args)
        .output()
        .expect("failed to execute saju-cli");
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    (stdout, output.status.success())
}

#[test]
fn test_cli_basic_output() {
    let (stdout, success) = run_cli(&[
        "--date", "2000-01-15",
        "--time", "17:15",
        "--tz", "Asia/Seoul",
        "--gender", "male",
    ]);
    assert!(success, "CLI should exit successfully");
    assert!(stdout.contains("사주팔자"), "should contain title");
    assert!(stdout.contains("천간/지지"), "should contain pillars section");
    assert!(stdout.contains("지장간"), "should contain hidden stems");
    assert!(stdout.contains("십성"), "should contain ten gods");
    assert!(stdout.contains("12운성"), "should contain twelve stages");
    assert!(stdout.contains("12신살"), "should contain twelve shinsal");
    assert!(stdout.contains("신강/신약"), "should contain strength section");
    assert!(stdout.contains("대운"), "should contain daewon");
}

#[test]
fn test_cli_english_output() {
    let (stdout, success) = run_cli(&[
        "--date", "2000-01-15",
        "--time", "17:15",
        "--tz", "Asia/Seoul",
        "--gender", "male",
        "--lang", "en",
    ]);
    assert!(success, "CLI should exit successfully");
    assert!(stdout.contains("Saju Palja"), "should contain English title");
    assert!(stdout.contains("Stems/Branches"), "should contain pillars heading");
}

#[test]
fn test_cli_female_output() {
    let (stdout, success) = run_cli(&[
        "--date", "2000-01-15",
        "--time", "17:15",
        "--tz", "Asia/Seoul",
        "--gender", "female",
    ]);
    assert!(success, "CLI should exit successfully");
    assert!(stdout.contains("성별: 여"), "should show female gender");
}

#[test]
fn test_cli_lunar_input() {
    let (stdout, success) = run_cli(&[
        "--date", "2000-01-01",
        "--time", "17:15",
        "--tz", "Asia/Seoul",
        "--gender", "male",
        "--calendar", "lunar",
    ]);
    assert!(success, "CLI should exit successfully");
    assert!(stdout.contains("음력"), "should indicate lunar calendar");
}

#[test]
fn test_cli_invalid_time_fails() {
    let output = Command::new("cargo")
        .args(["run", "-p", "saju-cli", "--"])
        .args(&[
            "--date", "2000-01-15",
            "--time", "invalid",
            "--tz", "Asia/Seoul",
            "--gender", "male",
        ])
        .output()
        .expect("failed to execute saju-cli");
    assert!(!output.status.success(), "CLI should fail with invalid time");
}
