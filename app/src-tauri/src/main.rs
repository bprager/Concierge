use serde::{Deserialize, Serialize};
use std::collections::HashMap;
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

#[tauri::command]
async fn napoleon_runtime_http_request(
    request: NapoleonRuntimeHttpRequest,
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
}
