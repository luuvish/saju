use std::process::{Child, Command};
use std::time::Duration;

struct TestServer {
    child: Child,
    base_url: String,
}

impl TestServer {
    fn start() -> Self {
        let child = Command::new("cargo")
            .args(["run", "-p", "saju-web"])
            .spawn()
            .expect("failed to start saju-web");

        std::thread::sleep(Duration::from_secs(3));

        TestServer {
            child,
            base_url: "http://localhost:3000".to_string(),
        }
    }

    fn get(&self, path: &str) -> (u16, String) {
        let url = format!("{}{}", self.base_url, path);
        let output = Command::new("curl")
            .args(["-s", "-o", "-", "-w", "\n%{http_code}", &url])
            .output()
            .expect("curl failed");
        let full = String::from_utf8_lossy(&output.stdout).to_string();
        let lines: Vec<&str> = full.rsplitn(2, '\n').collect();
        let status: u16 = lines[0].trim().parse().unwrap_or(0);
        let body = lines.get(1).unwrap_or(&"").to_string();
        (status, body)
    }

    fn post_form(&self, path: &str, data: &str) -> (u16, String) {
        let url = format!("{}{}", self.base_url, path);
        let output = Command::new("curl")
            .args(["-s", "-X", "POST", "-d", data, "-o", "-", "-w", "\n%{http_code}", &url])
            .output()
            .expect("curl failed");
        let full = String::from_utf8_lossy(&output.stdout).to_string();
        let lines: Vec<&str> = full.rsplitn(2, '\n').collect();
        let status: u16 = lines[0].trim().parse().unwrap_or(0);
        let body = lines.get(1).unwrap_or(&"").to_string();
        (status, body)
    }
}

impl Drop for TestServer {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

#[test]
#[ignore] // Run with: cargo test -p saju-web -- --ignored
fn test_index_page() {
    let server = TestServer::start();
    let (status, body) = server.get("/");
    assert_eq!(status, 200);
    assert!(body.contains("사주팔자 계산기"), "index should contain title");
    assert!(body.contains("<form"), "index should contain form");
    assert!(body.contains("hx-post"), "index should contain HTMX attributes");
}

#[test]
#[ignore]
fn test_calculate_returns_dashboard() {
    let server = TestServer::start();
    let (status, body) = server.post_form(
        "/calculate",
        "date=2000-01-15&time=17:15&calendar=solar&gender=male&tz=Asia/Seoul&lang=ko",
    );
    assert_eq!(status, 200);
    assert!(body.contains("result-dashboard"), "should contain dashboard");
    assert!(body.contains("pillars-grid"), "should contain pillars");
    assert!(body.contains("elementsChart"), "should contain chart canvas");
    assert!(body.contains("luck-timeline"), "should contain luck timeline");
}

#[test]
#[ignore]
fn test_calculate_english() {
    let server = TestServer::start();
    let (status, body) = server.post_form(
        "/calculate",
        "date=2000-01-15&time=17:15&calendar=solar&gender=male&tz=Asia/Seoul&lang=en",
    );
    assert_eq!(status, 200);
    assert!(body.contains("Saju Palja"), "should contain English title");
}

#[test]
#[ignore]
fn test_calculate_invalid_date() {
    let server = TestServer::start();
    let (status, body) = server.post_form(
        "/calculate",
        "date=bad-date&time=17:15&calendar=solar&gender=male&tz=Asia/Seoul&lang=ko",
    );
    assert_eq!(status, 200);
    assert!(body.contains("error-message"), "should contain error message div");
}

#[test]
#[ignore]
fn test_calculate_lunar_input() {
    let server = TestServer::start();
    let (status, body) = server.post_form(
        "/calculate",
        "date=2000-01-01&time=17:15&calendar=lunar&gender=male&tz=Asia/Seoul&lang=ko",
    );
    assert_eq!(status, 200);
    assert!(body.contains("result-dashboard"), "lunar input should return dashboard");
}
