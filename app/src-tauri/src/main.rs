use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::time::Duration;

#[derive(Debug, Deserialize)]
struct NapoleonRuntimeHttpRequest {
    url: String,
    method: Option<String>,
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
}

#[derive(Debug, Serialize)]
struct NapoleonRuntimeHttpResponse {
    ok: bool,
    status: u16,
    #[serde(rename = "bodyText")]
    body_text: String,
}

#[tauri::command]
fn app_status() -> &'static str {
    "Concierge desktop shell running"
}

fn validate_runtime_request(request: &NapoleonRuntimeHttpRequest) -> Result<(), String> {
    let parsed = reqwest::Url::parse(request.url.trim()).map_err(|_| "invalid_url".to_string())?;
    match parsed.scheme() {
        "http" | "https" => {}
        _ => return Err("unsupported_url_scheme".to_string()),
    }
    let method = request.method.as_deref().unwrap_or("GET").to_ascii_uppercase();
    match method.as_str() {
        "GET" | "POST" => Ok(()),
        _ => Err("unsupported_http_method".to_string()),
    }
}

fn configured_runtime_auth_token() -> Result<Option<String>, String> {
    configured_runtime_auth_token_from(|key| std::env::var(key).ok())
}

fn configured_runtime_auth_token_from<F>(get_env: F) -> Result<Option<String>, String>
where
    F: Fn(&str) -> Option<String>,
{
    for key in ["NAPOLEON_RUNTIME_AUTH_TOKEN", "NAPOLEON_EVAL_TOKEN"] {
        if let Some(value) = get_env(key).map(|value| value.trim().to_string()) {
            if !value.is_empty() {
                return Ok(Some(value));
            }
        }
    }
    for key in ["NAPOLEON_RUNTIME_AUTH_TOKEN_FILE", "NAPOLEON_EVAL_TOKEN_FILE"] {
        if let Some(path) = get_env(key).map(|value| value.trim().to_string()) {
            if path.is_empty() {
                continue;
            }
            let token = fs::read_to_string(&path)
                .map_err(|_| "runtime_auth_token_file_unreadable".to_string())?
                .trim()
                .to_string();
            if token.is_empty() {
                return Err("runtime_auth_token_file_empty".to_string());
            }
            return Ok(Some(token));
        }
    }
    Ok(None)
}

fn request_has_auth_header(headers: &Option<HashMap<String, String>>) -> bool {
    headers.as_ref().is_some_and(|headers| {
        headers
            .keys()
            .any(|name| name.eq_ignore_ascii_case("authorization") || name.eq_ignore_ascii_case("x-napoleon-auth"))
    })
}

fn runtime_auth_header_for_url(url: &str) -> Result<(&'static str, bool), String> {
    let parsed = reqwest::Url::parse(url.trim()).map_err(|_| "invalid_url".to_string())?;
    if parsed.path().starts_with("/cos") {
        Ok(("X-Napoleon-Auth", false))
    } else {
        Ok(("Authorization", true))
    }
}

#[tauri::command]
async fn napoleon_runtime_http_request(
    request: NapoleonRuntimeHttpRequest,
) -> Result<NapoleonRuntimeHttpResponse, String> {
    let native_auth_token = configured_runtime_auth_token()?;
    perform_runtime_http_request(request, native_auth_token).await
}

async fn perform_runtime_http_request(
    request: NapoleonRuntimeHttpRequest,
    native_auth_token: Option<String>,
) -> Result<NapoleonRuntimeHttpResponse, String> {
    validate_runtime_request(&request)?;
    let method = request.method.as_deref().unwrap_or("GET").to_ascii_uppercase();
    let method = reqwest::Method::from_bytes(method.as_bytes())
        .map_err(|_| "unsupported_http_method".to_string())?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|_| "runtime_client_unavailable".to_string())?;
    let mut builder = client.request(method, request.url.trim());
    if !request_has_auth_header(&request.headers) {
        if let Some(token) = native_auth_token.as_deref().map(str::trim).filter(|token| !token.is_empty()) {
            let (header_name, bearer_prefix) = runtime_auth_header_for_url(&request.url)?;
            let header_value = if bearer_prefix {
                format!("Bearer {token}")
            } else {
                token.to_string()
            };
            builder = builder.header(header_name, header_value);
        }
    }
    for (name, value) in request.headers.unwrap_or_default() {
        let header_name = reqwest::header::HeaderName::from_bytes(name.as_bytes())
            .map_err(|_| "invalid_header".to_string())?;
        let header_value =
            reqwest::header::HeaderValue::from_str(&value).map_err(|_| "invalid_header".to_string())?;
        builder = builder.header(header_name, header_value);
    }
    if let Some(body) = request.body {
        builder = builder.body(body);
    }
    let response = builder
        .send()
        .await
        .map_err(|_| "runtime_request_failed".to_string())?;
    let status = response.status().as_u16();
    let body_text = response
        .text()
        .await
        .map_err(|_| "runtime_response_unreadable".to_string())?;
    Ok(NapoleonRuntimeHttpResponse {
        ok: (200..300).contains(&status),
        status,
        body_text,
    })
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            app_status,
            napoleon_runtime_http_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running Concierge");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::{TcpListener, TcpStream};
    use std::sync::mpsc::{self, Receiver};
    use std::thread;

    #[derive(Debug)]
    struct RecordedRequest {
        method: String,
        path: String,
        headers: HashMap<String, String>,
        body: String,
    }

    struct RuntimeHarness {
        base_url: String,
        requests: Receiver<RecordedRequest>,
        handle: thread::JoinHandle<()>,
    }

    impl RuntimeHarness {
        fn start(responses: Vec<&'static str>) -> Self {
            let listener = TcpListener::bind("127.0.0.1:0").expect("bind local runtime harness");
            let base_url = format!("http://{}", listener.local_addr().expect("local harness address"));
            let (sender, requests) = mpsc::channel();
            let handle = thread::spawn(move || {
                for response in responses {
                    let (mut stream, _) = listener.accept().expect("accept runtime request");
                    let recorded = read_http_request(&mut stream);
                    sender.send(recorded).expect("record runtime request");
                    let response = format!(
                        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                        response.len(),
                        response
                    );
                    stream
                        .write_all(response.as_bytes())
                        .expect("write runtime response");
                }
            });

            Self {
                base_url,
                requests,
                handle,
            }
        }

        fn url(&self, path: &str) -> String {
            format!("{}{}", self.base_url, path)
        }

        fn next_request(&self) -> RecordedRequest {
            self.requests.recv().expect("recorded runtime request")
        }

        fn join(self) {
            self.handle.join().expect("runtime harness thread joined");
        }
    }

    fn read_http_request(stream: &mut TcpStream) -> RecordedRequest {
        let mut buffer = Vec::new();
        let mut chunk = [0_u8; 512];
        loop {
            let read = stream.read(&mut chunk).expect("read runtime request");
            assert_ne!(read, 0, "runtime request closed before headers completed");
            buffer.extend_from_slice(&chunk[..read]);
            if buffer.windows(4).any(|window| window == b"\r\n\r\n") {
                break;
            }
        }

        let header_end = buffer
            .windows(4)
            .position(|window| window == b"\r\n\r\n")
            .expect("runtime request header boundary")
            + 4;
        let header_text = String::from_utf8_lossy(&buffer[..header_end]).to_string();
        let mut lines = header_text.split("\r\n");
        let request_line = lines.next().expect("runtime request line");
        let mut request_parts = request_line.split_whitespace();
        let method = request_parts.next().unwrap_or_default().to_string();
        let path = request_parts.next().unwrap_or_default().to_string();
        let mut headers = HashMap::new();
        for line in lines {
            if line.is_empty() {
                continue;
            }
            if let Some((name, value)) = line.split_once(':') {
                headers.insert(name.trim().to_ascii_lowercase(), value.trim().to_string());
            }
        }
        let content_length = headers
            .get("content-length")
            .and_then(|value| value.parse::<usize>().ok())
            .unwrap_or(0);
        let mut body_bytes = buffer[header_end..].to_vec();
        while body_bytes.len() < content_length {
            let read = stream.read(&mut chunk).expect("read runtime request body");
            assert_ne!(read, 0, "runtime request closed before body completed");
            body_bytes.extend_from_slice(&chunk[..read]);
        }
        let body = String::from_utf8(body_bytes[..content_length].to_vec()).expect("utf8 request body");

        RecordedRequest {
            method,
            path,
            headers,
            body,
        }
    }

    #[test]
    fn rejects_non_http_runtime_targets() {
        let request = NapoleonRuntimeHttpRequest {
            url: "file:///Users/bernd/.ssh/config".to_string(),
            method: Some("GET".to_string()),
            headers: None,
            body: None,
        };

        assert_eq!(
            validate_runtime_request(&request),
            Err("unsupported_url_scheme".to_string())
        );
    }

    #[test]
    fn resolves_runtime_auth_from_environment_or_token_file() {
        assert_eq!(
            configured_runtime_auth_token_from(|key| match key {
                "NAPOLEON_RUNTIME_AUTH_TOKEN" => Some(" env_auth_value ".to_string()),
                _ => None,
            })
            .expect("environment token resolves"),
            Some("env_auth_value".to_string())
        );

        let token_path = std::env::temp_dir().join(format!(
            "concierge-runtime-auth-test-{}",
            std::process::id()
        ));
        fs::write(&token_path, " file_auth_value\n").expect("write test token file");
        let resolved = configured_runtime_auth_token_from(|key| match key {
            "NAPOLEON_RUNTIME_AUTH_TOKEN_FILE" => Some(token_path.to_string_lossy().to_string()),
            _ => None,
        })
        .expect("token file resolves");
        fs::remove_file(&token_path).expect("remove test token file");

        assert_eq!(resolved, Some("file_auth_value".to_string()));
    }

    #[test]
    fn desktop_runtime_command_forwards_governed_get_and_post_requests() {
        let harness = RuntimeHarness::start(vec![
            r#"{"descriptor":{"runtimeAuthority":false},"checksum":{"expected":"sha256:test","actual":"sha256:test"}}"#,
            r#"{"text":"review draft","approvalCaptured":false,"memoryWritePerformed":false,"agentDispatchPerformed":false,"externalSendPerformed":false}"#,
        ]);

        let descriptor_response = tauri::async_runtime::block_on(napoleon_runtime_http_request(
            NapoleonRuntimeHttpRequest {
                url: harness.url("/cos/descriptor"),
                method: Some("GET".to_string()),
                headers: Some(HashMap::from([(
                    "X-Napoleon-Auth".to_string(),
                    "test_auth_value".to_string(),
                )])),
                body: None,
            },
        ))
        .expect("descriptor request succeeds");
        assert_eq!(descriptor_response.status, 200);
        assert!(descriptor_response.ok);
        assert!(descriptor_response.body_text.contains(r#""runtimeAuthority":false"#));

        let text_response = tauri::async_runtime::block_on(napoleon_runtime_http_request(
            NapoleonRuntimeHttpRequest {
                url: harness.url("/cos/text-turn"),
                method: Some("POST".to_string()),
                headers: Some(HashMap::from([(
                    "Content-Type".to_string(),
                    "application/json".to_string(),
                )])),
                body: Some(r#"{"requestKind":"text_turn","profileMode":"adult_owner"}"#.to_string()),
            },
        ))
        .expect("text turn request succeeds");
        assert_eq!(text_response.status, 200);
        assert!(text_response.ok);
        assert!(text_response.body_text.contains(r#""approvalCaptured":false"#));

        let descriptor_request = harness.next_request();
        assert_eq!(descriptor_request.method, "GET");
        assert_eq!(descriptor_request.path, "/cos/descriptor");
        assert_eq!(
            descriptor_request.headers.get("x-napoleon-auth"),
            Some(&"test_auth_value".to_string())
        );
        assert_eq!(descriptor_request.body, "");

        let text_request = harness.next_request();
        assert_eq!(text_request.method, "POST");
        assert_eq!(text_request.path, "/cos/text-turn");
        assert_eq!(
            text_request.headers.get("content-type"),
            Some(&"application/json".to_string())
        );
        assert_eq!(
            text_request.body,
            r#"{"requestKind":"text_turn","profileMode":"adult_owner"}"#
        );

        harness.join();
    }

    #[test]
    fn desktop_runtime_command_attaches_native_auth_when_webview_omits_auth() {
        let harness = RuntimeHarness::start(vec![
            r#"{"capabilities":[],"runtimeAuthority":false}"#,
            r#"{"text":"review draft","approvalCaptured":false,"memoryWritePerformed":false,"agentDispatchPerformed":false,"externalSendPerformed":false}"#,
        ]);

        let capability_response = tauri::async_runtime::block_on(perform_runtime_http_request(
            NapoleonRuntimeHttpRequest {
                url: harness.url("/cos/capabilities"),
                method: Some("GET".to_string()),
                headers: Some(HashMap::from([("Accept".to_string(), "application/json".to_string())])),
                body: None,
            },
            Some("native_auth_value".to_string()),
        ))
        .expect("capability request succeeds");
        assert_eq!(capability_response.status, 200);

        let text_response = tauri::async_runtime::block_on(perform_runtime_http_request(
            NapoleonRuntimeHttpRequest {
                url: harness.url("/v1/concierge/turn"),
                method: Some("POST".to_string()),
                headers: Some(HashMap::from([(
                    "Content-Type".to_string(),
                    "application/json".to_string(),
                )])),
                body: Some(r#"{"requestKind":"text_turn"}"#.to_string()),
            },
            Some("native_auth_value".to_string()),
        ))
        .expect("text turn request succeeds");
        assert_eq!(text_response.status, 200);

        let capability_request = harness.next_request();
        assert_eq!(capability_request.method, "GET");
        assert_eq!(capability_request.path, "/cos/capabilities");
        assert_eq!(
            capability_request.headers.get("x-napoleon-auth"),
            Some(&"native_auth_value".to_string())
        );
        assert_eq!(capability_request.headers.get("authorization"), None);

        let text_request = harness.next_request();
        assert_eq!(text_request.method, "POST");
        assert_eq!(text_request.path, "/v1/concierge/turn");
        assert_eq!(
            text_request.headers.get("authorization"),
            Some(&"Bearer native_auth_value".to_string())
        );
        assert_eq!(text_request.headers.get("x-napoleon-auth"), None);

        harness.join();
    }

    #[test]
    fn desktop_runtime_command_preserves_explicit_webview_auth() {
        let harness = RuntimeHarness::start(vec![r#"{"capabilities":[],"runtimeAuthority":false}"#]);

        let response = tauri::async_runtime::block_on(perform_runtime_http_request(
            NapoleonRuntimeHttpRequest {
                url: harness.url("/cos/capabilities"),
                method: Some("GET".to_string()),
                headers: Some(HashMap::from([(
                    "X-Napoleon-Auth".to_string(),
                    "webview_auth_value".to_string(),
                )])),
                body: None,
            },
            Some("native_auth_value".to_string()),
        ))
        .expect("capability request succeeds");
        assert_eq!(response.status, 200);

        let request = harness.next_request();
        assert_eq!(request.method, "GET");
        assert_eq!(request.path, "/cos/capabilities");
        assert_eq!(
            request.headers.get("x-napoleon-auth"),
            Some(&"webview_auth_value".to_string())
        );
        assert_eq!(request.headers.get("authorization"), None);

        harness.join();
    }
}
