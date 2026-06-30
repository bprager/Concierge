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
}
