use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::time::Duration;

#[derive(Debug, Deserialize)]
struct NapoleonRuntimeHttpRequest {
    url: Option<String>,
    path: Option<String>,
    method: Option<String>,
    #[serde(rename = "nativeAuth")]
    native_auth: Option<bool>,
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

#[derive(Debug, Serialize)]
struct NapoleonRuntimeConfigStatus {
    #[serde(rename = "endpointConfigured")]
    endpoint_configured: bool,
    #[serde(rename = "authConfigured")]
    auth_configured: bool,
}

#[tauri::command]
fn app_status() -> &'static str {
    "Concierge desktop shell running"
}

fn validate_runtime_request(request: &NapoleonRuntimeHttpRequest) -> Result<(), String> {
    let parsed = parsed_runtime_target(request)?;
    let method = request
        .method
        .as_deref()
        .unwrap_or("GET")
        .to_ascii_uppercase();
    match method.as_str() {
        "GET" | "POST" => {}
        _ => return Err("unsupported_http_method".to_string()),
    }
    let expected_method = governed_napoleon_runtime_method(parsed.path())
        .ok_or_else(|| "unsupported_runtime_target".to_string())?;
    if method != expected_method {
        return Err("unsupported_runtime_method_for_target".to_string());
    }
    Ok(())
}

fn parsed_runtime_target(request: &NapoleonRuntimeHttpRequest) -> Result<reqwest::Url, String> {
    if let Some(url) = request
        .url
        .as_deref()
        .map(str::trim)
        .filter(|url| !url.is_empty())
    {
        let parsed = reqwest::Url::parse(url).map_err(|_| "invalid_url".to_string())?;
        match parsed.scheme() {
            "http" | "https" => {}
            _ => return Err("unsupported_url_scheme".to_string()),
        }
        return Ok(parsed);
    }
    if let Some(path) = request
        .path
        .as_deref()
        .map(str::trim)
        .filter(|path| !path.is_empty())
    {
        if !path.starts_with('/') || path.starts_with("//") || path.contains('#') {
            return Err("invalid_runtime_path".to_string());
        }
        return reqwest::Url::parse(&format!("http://concierge-runtime.local{path}"))
            .map_err(|_| "invalid_runtime_path".to_string());
    }
    Err("missing_runtime_target".to_string())
}

fn governed_napoleon_runtime_method(path: &str) -> Option<&'static str> {
    if is_cos_trace_path(path)
        || is_evolution_proposal_status_path(path)
        || is_agent_manifest_path(path)
        || is_profile_metadata_path(path)
    {
        return Some("GET");
    }
    match path {
        "/cos/descriptor"
        | "/cos/capabilities"
        | "/v1/concierge/chief-of-staff/descriptor"
        | "/v1/concierge/chief-of-staff/capabilities"
        | "/agents" => Some("GET"),
        "/cos/text-turn"
        | "/v1/concierge/turn"
        | "/v1/concierge/evaluate"
        | "/v1/concierge/chief-of-staff/steering"
        | "/v1/concierge/memory-proposals"
        | "/chief-of-staff/requests"
        | "/chief-of-staff/reviews/evaluation"
        | "/chief-of-staff/reviews/evolution-proposals"
        | "/evolution/proposals"
        | "/governance/evaluate"
        | "/chief-of-staff/reviews/governance"
        | "/chief-of-staff/reviews/new-agent-proposals"
        | "/observability/traces" => Some("POST"),
        _ => None,
    }
}

fn is_cos_trace_path(path: &str) -> bool {
    path.strip_prefix("/cos/trace/")
        .is_some_and(|trace_id| !trace_id.is_empty() && !trace_id.contains('/'))
}

fn is_evolution_proposal_status_path(path: &str) -> bool {
    path.strip_prefix("/evolution/proposals/")
        .and_then(|suffix| suffix.strip_suffix("/status"))
        .is_some_and(|proposal_id| !proposal_id.is_empty() && !proposal_id.contains('/'))
}

fn is_agent_manifest_path(path: &str) -> bool {
    path.strip_prefix("/agents/")
        .is_some_and(|agent_id| !agent_id.is_empty() && !agent_id.contains('/'))
}

fn is_profile_metadata_path(path: &str) -> bool {
    path.strip_prefix("/profiles/")
        .is_some_and(|profile_id| !profile_id.is_empty() && !profile_id.contains('/'))
}

fn configured_runtime_auth_token() -> Result<Option<String>, String> {
    configured_runtime_auth_token_from(|key| std::env::var(key).ok())
}

fn configured_runtime_endpoint() -> Option<String> {
    configured_runtime_endpoint_from(|key| std::env::var(key).ok())
}

fn runtime_config_status_from<F>(get_env: F) -> NapoleonRuntimeConfigStatus
where
    F: Fn(&str) -> Option<String> + Copy,
{
    NapoleonRuntimeConfigStatus {
        endpoint_configured: configured_runtime_endpoint_from(get_env).is_some(),
        auth_configured: configured_runtime_auth_token_from(get_env)
            .ok()
            .flatten()
            .is_some(),
    }
}

fn runtime_config_status_probe_output_from<F>(get_env: F) -> String
where
    F: Fn(&str) -> Option<String> + Copy,
{
    let status = runtime_config_status_from(get_env);
    format!(
        r#"{{"endpointConfigured":{},"authConfigured":{}}}"#,
        status.endpoint_configured, status.auth_configured
    )
}

fn runtime_transport_probe_output(request_succeeded: bool, status_ok: bool) -> String {
    format!(
        r#"{{"requestSucceeded":{},"statusOk":{}}}"#,
        request_succeeded, status_ok
    )
}

#[derive(Debug)]
struct RuntimeLiveProbeStatus {
    descriptor_ok: bool,
    capabilities_ok: bool,
    text_turn_ok: bool,
    trace_ok: bool,
    side_effect_claimed: bool,
    route_family: Option<RuntimeLiveProbeRouteFamily>,
    failure_stage: &'static str,
    failure_kind: &'static str,
}

impl Default for RuntimeLiveProbeStatus {
    fn default() -> Self {
        Self {
            descriptor_ok: false,
            capabilities_ok: false,
            text_turn_ok: false,
            trace_ok: false,
            side_effect_claimed: false,
            route_family: None,
            failure_stage: "not_run",
            failure_kind: "not_run",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum RuntimeLiveProbeRouteFamily {
    Cos,
    Generated,
}

impl RuntimeLiveProbeRouteFamily {
    fn label(self) -> &'static str {
        match self {
            Self::Cos => "cos",
            Self::Generated => "generated",
        }
    }

    fn descriptor_path(self) -> &'static str {
        match self {
            Self::Cos => "/cos/descriptor",
            Self::Generated => "/v1/concierge/chief-of-staff/descriptor",
        }
    }

    fn capabilities_path(self) -> &'static str {
        match self {
            Self::Cos => "/cos/capabilities",
            Self::Generated => "/v1/concierge/chief-of-staff/capabilities",
        }
    }

    fn text_turn_path(self) -> &'static str {
        match self {
            Self::Cos => "/cos/text-turn",
            Self::Generated => "/v1/concierge/turn",
        }
    }

    fn text_turn_body(self) -> String {
        match self {
            Self::Cos => runtime_live_probe_cos_text_turn_body(),
            Self::Generated => runtime_live_probe_generated_text_turn_body(),
        }
    }
}

fn runtime_live_probe_output(status: RuntimeLiveProbeStatus) -> String {
    let route_family = status
        .route_family
        .map(RuntimeLiveProbeRouteFamily::label)
        .unwrap_or("unknown");
    format!(
        r#"{{"descriptorOk":{},"capabilitiesOk":{},"textTurnOk":{},"traceOk":{},"sideEffectClaimed":{},"routeFamily":"{}","failureStage":"{}","failureKind":"{}"}}"#,
        status.descriptor_ok,
        status.capabilities_ok,
        status.text_turn_ok,
        status.trace_ok,
        status.side_effect_claimed,
        route_family,
        status.failure_stage,
        status.failure_kind
    )
}

fn run_runtime_transport_probe() -> String {
    let result = tauri::async_runtime::block_on(async {
        let native_auth_token = configured_runtime_auth_token()?;
        let native_runtime_endpoint = configured_runtime_endpoint();
        perform_runtime_http_request_with_endpoint(
            NapoleonRuntimeHttpRequest {
                url: None,
                path: Some("/cos/capabilities".to_string()),
                method: Some("GET".to_string()),
                native_auth: Some(true),
                headers: None,
                body: None,
            },
            native_auth_token,
            native_runtime_endpoint,
        )
        .await
    });
    match result {
        Ok(response) => runtime_transport_probe_output(true, response.ok && response.status == 200),
        Err(_) => runtime_transport_probe_output(false, false),
    }
}

fn live_probe_request(
    path: &str,
    method: &str,
    body: Option<String>,
) -> NapoleonRuntimeHttpRequest {
    NapoleonRuntimeHttpRequest {
        url: None,
        path: Some(path.to_string()),
        method: Some(method.to_string()),
        native_auth: Some(true),
        headers: Some(HashMap::from([(
            "Content-Type".to_string(),
            "application/json".to_string(),
        )])),
        body,
    }
}

fn runtime_live_probe_route_family(endpoint: Option<&str>) -> Option<RuntimeLiveProbeRouteFamily> {
    let endpoint = endpoint?.trim();
    let parsed = reqwest::Url::parse(endpoint).ok()?;
    let path = parsed.path().trim_end_matches('/');
    if path == "/cos"
        || path == "/cos/descriptor"
        || path == "/cos/capabilities"
        || path == "/cos/text-turn"
        || path.starts_with("/cos/trace/")
    {
        return Some(RuntimeLiveProbeRouteFamily::Cos);
    }
    if path == "/v1/concierge/turn"
        || path == "/v1/concierge/evaluate"
        || path == "/v1/concierge/chief-of-staff/descriptor"
        || path == "/v1/concierge/chief-of-staff/capabilities"
        || path == "/v1/concierge/chief-of-staff/steering"
        || path == "/v1/concierge/memory-proposals"
    {
        return Some(RuntimeLiveProbeRouteFamily::Generated);
    }
    None
}

fn runtime_live_probe_cos_text_turn_body() -> String {
    serde_json::json!({
        "request_id": "cos_packaged_desktop_live_probe",
        "profile_mode": "adult_owner",
        "contract_version": "napoleon/concierge/text-turn/v1",
        "requested_capability": "governance_review",
        "user_text": "Packaged desktop live runtime validation probe. Return advisory metadata only.",
        "requested_effects": [],
        "authority_tier": "advisory_prepare_only",
        "approval_requirement": "chief_of_staff_review",
        "blocked_effects": ["memory_write", "approval_capture", "external_send", "agent_dispatch"],
        "source_evidence": ["packaged_desktop_live_probe"],
        "actor_id": "concierge.text",
        "trace_id": "trace_packaged_desktop_live_probe"
    })
    .to_string()
}

fn runtime_live_probe_generated_text_turn_body() -> String {
    serde_json::json!({
        "requestKind": "text_turn",
        "traceId": "trace_packaged_desktop_live_probe",
        "conversationId": "conv_packaged_desktop_live_probe",
        "turnId": "turn_packaged_desktop_live_probe",
        "profile": "adult_owner",
        "profileMode": "adult_owner",
        "channel": "text",
        "message": "Packaged desktop live runtime validation probe. Return advisory metadata only.",
        "chiefOfStaffRequest": {
            "request_id": "generated_packaged_desktop_live_probe",
            "requester": "concierge.text",
            "request_type": "governance_review",
            "profile_mode": "adult_owner",
            "source_evidence": ["packaged_desktop_live_probe"],
            "requested_authority_tier": "advisory_review",
            "trace_id": "trace_packaged_desktop_live_probe",
            "payload_schema": "concierge_text_turn"
        },
        "governanceRequest": {
            "request_id": "generated_packaged_desktop_live_probe",
            "actor_id": "concierge.text",
            "action": "prepare_text_response",
            "target": "napoleon.chief_of_staff",
            "requested_authority_tier": "advisory_review",
            "evidence_links": ["packaged_desktop_live_probe"],
            "trace_id": "trace_packaged_desktop_live_probe"
        },
        "traceEnvelope": {
            "trace_id": "trace_packaged_desktop_live_probe",
            "parent_trace_id": "conv_packaged_desktop_live_probe",
            "actor_id": "concierge.text",
            "request_id": "generated_packaged_desktop_live_probe",
            "decision_id": "decision_packaged_desktop_live_probe",
            "timestamp": "2026-06-11T00:00:00.000Z"
        },
        "auditEnvelope": {
            "audit_id": "audit_packaged_desktop_live_probe",
            "trace_id": "trace_packaged_desktop_live_probe",
            "decision_id": "decision_packaged_desktop_live_probe",
            "actor_id": "concierge.text",
            "authority_tier": "advisory_review",
            "approval_requirement": "chief_of_staff_review",
            "evidence_links": ["packaged_desktop_live_probe"]
        },
        "requestedEffects": [],
        "blockedEffects": ["memory_write", "approval_capture", "external_send", "agent_dispatch"],
        "sourceEvidence": ["packaged_desktop_live_probe"]
    })
    .to_string()
}

fn response_json(response: &NapoleonRuntimeHttpResponse) -> Option<serde_json::Value> {
    serde_json::from_str(&response.body_text).ok()
}

fn response_claims_side_effects(value: &serde_json::Value) -> bool {
    let true_flags = [
        "approvalCaptured",
        "approval_captured",
        "memoryWritePerformed",
        "memory_write_performed",
        "agentDispatchPerformed",
        "agent_dispatch_performed",
        "externalSendPerformed",
        "external_send_performed",
        "runtimeAuthority",
        "runtime_authority",
    ];
    true_flags
        .iter()
        .any(|flag| value.get(*flag).and_then(serde_json::Value::as_bool) == Some(true))
}

fn response_trace_id(value: &serde_json::Value) -> Option<String> {
    response_string_at(
        value,
        &[
            &["trace_id"],
            &["traceId"],
            &["governanceDecision", "trace_id"],
            &["governanceDecision", "traceId"],
            &["traceEnvelope", "trace_id"],
            &["traceEnvelope", "traceId"],
        ],
    )
    .map(str::trim)
    .filter(|trace_id| !trace_id.is_empty() && !trace_id.contains('/'))
    .map(str::to_string)
}

fn response_string_at<'a>(value: &'a serde_json::Value, paths: &[&[&str]]) -> Option<&'a str> {
    paths.iter().find_map(|path| {
        path.iter()
            .try_fold(value, |current, key| current.get(*key))
            .and_then(serde_json::Value::as_str)
    })
}

fn response_has_generated_trace_proof(value: &serde_json::Value) -> bool {
    let has_trace = response_trace_id(value).is_some();
    let has_audit = response_string_at(
        value,
        &[
            &["governanceDecision", "audit_id"],
            &["governanceDecision", "auditId"],
            &["auditEnvelope", "audit_id"],
            &["auditEnvelope", "auditId"],
        ],
    )
    .map(str::trim)
    .filter(|audit_id| !audit_id.is_empty() && !audit_id.contains('/'))
    .is_some();
    has_trace && has_audit
}

async fn run_runtime_live_probe_family(
    family: RuntimeLiveProbeRouteFamily,
    native_auth_token: Option<String>,
    native_runtime_endpoint: Option<String>,
) -> Result<RuntimeLiveProbeStatus, String> {
    let mut status = RuntimeLiveProbeStatus::default();
    status.route_family = Some(family);

    let descriptor = match perform_runtime_http_request_with_endpoint(
        live_probe_request(family.descriptor_path(), "GET", None),
        native_auth_token.clone(),
        native_runtime_endpoint.clone(),
    )
    .await
    {
        Ok(response) => response,
        Err(_) => {
            status.failure_stage = "descriptor";
            status.failure_kind = "request_failed";
            return Ok(status);
        }
    };
    status.descriptor_ok = descriptor.ok;
    if let Some(value) = response_json(&descriptor) {
        status.side_effect_claimed |= response_claims_side_effects(&value);
    }
    if !status.descriptor_ok {
        status.failure_stage = "descriptor";
        status.failure_kind = "http_not_ok";
        return Ok(status);
    }

    let capabilities = match perform_runtime_http_request_with_endpoint(
        live_probe_request(family.capabilities_path(), "GET", None),
        native_auth_token.clone(),
        native_runtime_endpoint.clone(),
    )
    .await
    {
        Ok(response) => response,
        Err(_) => {
            status.failure_stage = "capabilities";
            status.failure_kind = "request_failed";
            return Ok(status);
        }
    };
    status.capabilities_ok = capabilities.ok;
    if let Some(value) = response_json(&capabilities) {
        status.side_effect_claimed |= response_claims_side_effects(&value);
    }
    if !status.capabilities_ok {
        status.failure_stage = "capabilities";
        status.failure_kind = "http_not_ok";
        return Ok(status);
    }

    let text_turn = match perform_runtime_http_request_with_endpoint(
        live_probe_request(
            family.text_turn_path(),
            "POST",
            Some(family.text_turn_body()),
        ),
        native_auth_token.clone(),
        native_runtime_endpoint.clone(),
    )
    .await
    {
        Ok(response) => response,
        Err(_) => {
            status.failure_stage = "text_turn";
            status.failure_kind = "request_failed";
            return Ok(status);
        }
    };
    status.text_turn_ok = text_turn.ok;
    if let Some(value) = response_json(&text_turn) {
        status.side_effect_claimed |= response_claims_side_effects(&value);
        if !status.text_turn_ok {
            status.failure_stage = "text_turn";
            status.failure_kind = "http_not_ok";
            return Ok(status);
        }
        match family {
            RuntimeLiveProbeRouteFamily::Cos => {
                if let Some(trace_id) = response_trace_id(&value) {
                    let trace = match perform_runtime_http_request_with_endpoint(
                        live_probe_request(&format!("/cos/trace/{trace_id}"), "GET", None),
                        native_auth_token,
                        native_runtime_endpoint,
                    )
                    .await
                    {
                        Ok(response) => response,
                        Err(_) => {
                            status.failure_stage = "trace";
                            status.failure_kind = "request_failed";
                            return Ok(status);
                        }
                    };
                    status.trace_ok = trace.ok;
                    if let Some(trace_value) = response_json(&trace) {
                        status.side_effect_claimed |= response_claims_side_effects(&trace_value);
                    }
                    if !status.trace_ok {
                        status.failure_stage = "trace";
                        status.failure_kind = "http_not_ok";
                        return Ok(status);
                    }
                } else {
                    status.failure_stage = "trace";
                    status.failure_kind = "missing_trace_id";
                    return Ok(status);
                }
            }
            RuntimeLiveProbeRouteFamily::Generated => {
                status.trace_ok = response_has_generated_trace_proof(&value);
                if !status.trace_ok {
                    status.failure_stage = "trace";
                    status.failure_kind = "missing_generated_proof";
                    return Ok(status);
                }
            }
        }
    } else {
        status.failure_stage = "text_turn";
        status.failure_kind = "invalid_json";
        return Ok(status);
    }

    status.failure_stage = "none";
    status.failure_kind = "none";
    Ok(status)
}

fn run_runtime_live_probe() -> String {
    let status = tauri::async_runtime::block_on(async {
        let native_auth_token = configured_runtime_auth_token()?;
        let native_runtime_endpoint = configured_runtime_endpoint();
        if let Some(family) = runtime_live_probe_route_family(native_runtime_endpoint.as_deref()) {
            return run_runtime_live_probe_family(
                family,
                native_auth_token,
                native_runtime_endpoint,
            )
            .await;
        }

        let generated = run_runtime_live_probe_family(
            RuntimeLiveProbeRouteFamily::Generated,
            native_auth_token.clone(),
            native_runtime_endpoint.clone(),
        )
        .await?;
        if generated.descriptor_ok {
            return Ok(generated);
        }

        run_runtime_live_probe_family(
            RuntimeLiveProbeRouteFamily::Cos,
            native_auth_token,
            native_runtime_endpoint,
        )
        .await
    })
    .unwrap_or_default();

    runtime_live_probe_output(status)
}

fn configured_runtime_endpoint_from<F>(get_env: F) -> Option<String>
where
    F: Fn(&str) -> Option<String>,
{
    for key in [
        "NAPOLEON_RUNTIME_ENDPOINT",
        "NAPOLEON_BRIDGE_ENDPOINT",
        "NAPOLEON_EVAL_ENDPOINT",
    ] {
        if let Some(value) = get_env(key).map(|value| value.trim().to_string()) {
            if !value.is_empty() {
                return Some(value);
            }
        }
    }
    None
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
    for key in [
        "NAPOLEON_RUNTIME_AUTH_TOKEN_FILE",
        "NAPOLEON_EVAL_TOKEN_FILE",
    ] {
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
        headers.keys().any(|name| {
            name.eq_ignore_ascii_case("authorization")
                || name.eq_ignore_ascii_case("x-napoleon-auth")
        })
    })
}

fn native_auth_enabled(request: &NapoleonRuntimeHttpRequest) -> bool {
    request.native_auth.unwrap_or(true)
}

fn auth_sanitized_headers(
    headers: Option<HashMap<String, String>>,
    use_native_auth: bool,
) -> Option<HashMap<String, String>> {
    if !use_native_auth {
        return headers;
    }
    let headers = headers?;
    Some(
        headers
            .into_iter()
            .filter(|(name, _)| {
                !name.eq_ignore_ascii_case("authorization")
                    && !name.eq_ignore_ascii_case("x-napoleon-auth")
            })
            .collect(),
    )
}

fn runtime_auth_header_for_url(url: &str) -> Result<(&'static str, bool), String> {
    let parsed = reqwest::Url::parse(url.trim()).map_err(|_| "invalid_url".to_string())?;
    if parsed.path().starts_with("/cos") {
        Ok(("X-Napoleon-Auth", false))
    } else {
        Ok(("Authorization", true))
    }
}

fn resolved_runtime_url(
    request: &NapoleonRuntimeHttpRequest,
    native_runtime_endpoint: Option<&str>,
) -> Result<String, String> {
    if let Some(url) = request
        .url
        .as_deref()
        .map(str::trim)
        .filter(|url| !url.is_empty())
    {
        return Ok(url.to_string());
    }
    let path = request
        .path
        .as_deref()
        .map(str::trim)
        .filter(|path| !path.is_empty())
        .ok_or_else(|| "missing_runtime_target".to_string())?;
    let endpoint = native_runtime_endpoint
        .map(str::trim)
        .filter(|endpoint| !endpoint.is_empty())
        .ok_or_else(|| "runtime_endpoint_unconfigured".to_string())?;
    let base = reqwest::Url::parse(endpoint).map_err(|_| "invalid_runtime_endpoint".to_string())?;
    match base.scheme() {
        "http" | "https" => {}
        _ => return Err("unsupported_runtime_endpoint_scheme".to_string()),
    }
    base.join(path)
        .map(|url| url.to_string())
        .map_err(|_| "invalid_runtime_path".to_string())
}

#[tauri::command]
fn napoleon_runtime_config_status() -> NapoleonRuntimeConfigStatus {
    runtime_config_status_from(|key| std::env::var(key).ok())
}

#[tauri::command]
async fn napoleon_runtime_http_request(
    request: NapoleonRuntimeHttpRequest,
) -> Result<NapoleonRuntimeHttpResponse, String> {
    let native_auth_token = configured_runtime_auth_token()?;
    let native_runtime_endpoint = configured_runtime_endpoint();
    perform_runtime_http_request_with_endpoint(request, native_auth_token, native_runtime_endpoint)
        .await
}

#[cfg(test)]
async fn perform_runtime_http_request(
    request: NapoleonRuntimeHttpRequest,
    native_auth_token: Option<String>,
) -> Result<NapoleonRuntimeHttpResponse, String> {
    perform_runtime_http_request_with_endpoint(request, native_auth_token, None).await
}

async fn perform_runtime_http_request_with_endpoint(
    mut request: NapoleonRuntimeHttpRequest,
    native_auth_token: Option<String>,
    native_runtime_endpoint: Option<String>,
) -> Result<NapoleonRuntimeHttpResponse, String> {
    validate_runtime_request(&request)?;
    let target_url = resolved_runtime_url(&request, native_runtime_endpoint.as_deref())?;
    let use_native_auth = native_auth_enabled(&request);
    request.headers = auth_sanitized_headers(request.headers, use_native_auth);
    let method = request
        .method
        .as_deref()
        .unwrap_or("GET")
        .to_ascii_uppercase();
    let method = reqwest::Method::from_bytes(method.as_bytes())
        .map_err(|_| "unsupported_http_method".to_string())?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|_| "runtime_client_unavailable".to_string())?;
    let mut builder = client.request(method, target_url.as_str());
    if use_native_auth && !request_has_auth_header(&request.headers) {
        if let Some(token) = native_auth_token
            .as_deref()
            .map(str::trim)
            .filter(|token| !token.is_empty())
        {
            let (header_name, bearer_prefix) = runtime_auth_header_for_url(&target_url)?;
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
        let header_value = reqwest::header::HeaderValue::from_str(&value)
            .map_err(|_| "invalid_header".to_string())?;
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
    if std::env::var("CONCIERGE_DESKTOP_RUNTIME_LIVE_PROBE")
        .ok()
        .as_deref()
        == Some("1")
    {
        println!("{}", run_runtime_live_probe());
        return;
    }

    if std::env::var("CONCIERGE_DESKTOP_RUNTIME_TRANSPORT_PROBE")
        .ok()
        .as_deref()
        == Some("1")
    {
        println!("{}", run_runtime_transport_probe());
        return;
    }

    if std::env::var("CONCIERGE_DESKTOP_RUNTIME_CONFIG_PROBE")
        .ok()
        .as_deref()
        == Some("1")
    {
        println!(
            "{}",
            runtime_config_status_probe_output_from(|key| std::env::var(key).ok())
        );
        return;
    }

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            app_status,
            napoleon_runtime_config_status,
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
            let base_url = format!(
                "http://{}",
                listener.local_addr().expect("local harness address")
            );
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
        let body =
            String::from_utf8(body_bytes[..content_length].to_vec()).expect("utf8 request body");

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
            url: Some("file:///Users/bernd/.ssh/config".to_string()),
            path: None,
            method: Some("GET".to_string()),
            native_auth: None,
            headers: None,
            body: None,
        };

        assert_eq!(
            validate_runtime_request(&request),
            Err("unsupported_url_scheme".to_string())
        );
    }

    #[test]
    fn rejects_http_runtime_targets_outside_governed_napoleon_paths() {
        let request = NapoleonRuntimeHttpRequest {
            url: Some("https://example.com/unrelated-api".to_string()),
            path: None,
            method: Some("POST".to_string()),
            native_auth: None,
            headers: None,
            body: Some(r#"{"requestKind":"text_turn"}"#.to_string()),
        };

        assert_eq!(
            validate_runtime_request(&request),
            Err("unsupported_runtime_target".to_string())
        );
    }

    #[test]
    fn enforces_governed_runtime_methods_for_known_paths() {
        let valid_targets = [
            ("https://napoleon.example/cos/descriptor", "GET"),
            ("https://napoleon.example/cos/capabilities", "GET"),
            ("https://napoleon.example/cos/trace/trace_123", "GET"),
            ("https://napoleon.example/cos/text-turn", "POST"),
            (
                "https://napoleon.example/v1/concierge/chief-of-staff/descriptor",
                "GET",
            ),
            (
                "https://napoleon.example/v1/concierge/chief-of-staff/capabilities",
                "GET",
            ),
            ("https://napoleon.example/v1/concierge/turn", "POST"),
            ("https://napoleon.example/v1/concierge/evaluate", "POST"),
            (
                "https://napoleon.example/v1/concierge/chief-of-staff/steering",
                "POST",
            ),
            (
                "https://napoleon.example/v1/concierge/memory-proposals",
                "POST",
            ),
            ("https://napoleon.example/chief-of-staff/requests", "POST"),
            (
                "https://napoleon.example/chief-of-staff/reviews/evaluation",
                "POST",
            ),
            (
                "https://napoleon.example/chief-of-staff/reviews/evolution-proposals",
                "POST",
            ),
            ("https://napoleon.example/evolution/proposals", "POST"),
            (
                "https://napoleon.example/evolution/proposals/proposal_123/status",
                "GET",
            ),
            ("https://napoleon.example/governance/evaluate", "POST"),
            (
                "https://napoleon.example/chief-of-staff/reviews/governance",
                "POST",
            ),
            (
                "https://napoleon.example/chief-of-staff/reviews/new-agent-proposals",
                "POST",
            ),
            ("https://napoleon.example/observability/traces", "POST"),
            ("https://napoleon.example/agents", "GET"),
            ("https://napoleon.example/agents/chief-of-staff", "GET"),
            ("https://napoleon.example/profiles/adult_owner", "GET"),
        ];
        for (url, method) in valid_targets {
            let request = NapoleonRuntimeHttpRequest {
                url: Some(url.to_string()),
                path: None,
                method: Some(method.to_string()),
                native_auth: None,
                headers: None,
                body: None,
            };
            assert_eq!(validate_runtime_request(&request), Ok(()), "{method} {url}");
        }

        let wrong_method_targets = [
            ("https://napoleon.example/cos/descriptor", "POST"),
            ("https://napoleon.example/cos/text-turn", "GET"),
            (
                "https://napoleon.example/evolution/proposals/proposal_123/status",
                "POST",
            ),
            ("https://napoleon.example/observability/traces", "GET"),
        ];
        for (url, method) in wrong_method_targets {
            let request = NapoleonRuntimeHttpRequest {
                url: Some(url.to_string()),
                path: None,
                method: Some(method.to_string()),
                native_auth: None,
                headers: None,
                body: None,
            };
            assert_eq!(
                validate_runtime_request(&request),
                Err("unsupported_runtime_method_for_target".to_string()),
                "{method} {url}",
            );
        }
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
                url: Some(harness.url("/cos/descriptor")),
                path: None,
                method: Some("GET".to_string()),
                native_auth: Some(false),
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
        assert!(descriptor_response
            .body_text
            .contains(r#""runtimeAuthority":false"#));

        let text_response = tauri::async_runtime::block_on(napoleon_runtime_http_request(
            NapoleonRuntimeHttpRequest {
                url: Some(harness.url("/cos/text-turn")),
                path: None,
                method: Some("POST".to_string()),
                native_auth: None,
                headers: Some(HashMap::from([(
                    "Content-Type".to_string(),
                    "application/json".to_string(),
                )])),
                body: Some(
                    r#"{"requestKind":"text_turn","profileMode":"adult_owner"}"#.to_string(),
                ),
            },
        ))
        .expect("text turn request succeeds");
        assert_eq!(text_response.status, 200);
        assert!(text_response.ok);
        assert!(text_response
            .body_text
            .contains(r#""approvalCaptured":false"#));

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
                url: Some(harness.url("/cos/capabilities")),
                path: None,
                method: Some("GET".to_string()),
                native_auth: None,
                headers: Some(HashMap::from([(
                    "Accept".to_string(),
                    "application/json".to_string(),
                )])),
                body: None,
            },
            Some("native_auth_value".to_string()),
        ))
        .expect("capability request succeeds");
        assert_eq!(capability_response.status, 200);

        let text_response = tauri::async_runtime::block_on(perform_runtime_http_request(
            NapoleonRuntimeHttpRequest {
                url: Some(harness.url("/v1/concierge/turn")),
                path: None,
                method: Some("POST".to_string()),
                native_auth: None,
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
    fn desktop_runtime_command_strips_webview_auth_when_native_auth_is_enabled() {
        let harness =
            RuntimeHarness::start(vec![r#"{"capabilities":[],"runtimeAuthority":false}"#]);

        let response = tauri::async_runtime::block_on(perform_runtime_http_request(
            NapoleonRuntimeHttpRequest {
                url: Some(harness.url("/cos/capabilities")),
                path: None,
                method: Some("GET".to_string()),
                native_auth: Some(true),
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
            Some(&"native_auth_value".to_string())
        );
        assert_eq!(request.headers.get("authorization"), None);

        harness.join();
    }

    #[test]
    fn desktop_runtime_command_resolves_path_against_local_runtime_endpoint() {
        let harness =
            RuntimeHarness::start(vec![r#"{"capabilities":[],"runtimeAuthority":false}"#]);

        let response = tauri::async_runtime::block_on(perform_runtime_http_request_with_endpoint(
            NapoleonRuntimeHttpRequest {
                url: None,
                path: Some("/cos/capabilities".to_string()),
                method: Some("GET".to_string()),
                native_auth: Some(true),
                headers: Some(HashMap::from([(
                    "Accept".to_string(),
                    "application/json".to_string(),
                )])),
                body: None,
            },
            Some("native_auth_value".to_string()),
            Some(harness.base_url.clone()),
        ))
        .expect("path-only capability request succeeds");
        assert_eq!(response.status, 200);

        let request = harness.next_request();
        assert_eq!(request.method, "GET");
        assert_eq!(request.path, "/cos/capabilities");
        assert_eq!(
            request.headers.get("x-napoleon-auth"),
            Some(&"native_auth_value".to_string())
        );

        harness.join();
    }

    #[test]
    fn desktop_runtime_config_status_reports_only_sanitized_booleans() {
        let status = runtime_config_status_from(|key| match key {
            "NAPOLEON_RUNTIME_ENDPOINT" => Some("https://napoleon.example/cos".to_string()),
            "NAPOLEON_RUNTIME_AUTH_TOKEN" => Some("native_auth_value".to_string()),
            _ => None,
        });

        assert!(status.endpoint_configured);
        assert!(status.auth_configured);
    }

    #[test]
    fn desktop_runtime_config_status_probe_outputs_only_sanitized_booleans() {
        let output = runtime_config_status_probe_output_from(|key| match key {
            "NAPOLEON_RUNTIME_ENDPOINT" => Some("https://napoleon.example/cos".to_string()),
            "NAPOLEON_RUNTIME_AUTH_TOKEN" => Some("native_auth_value".to_string()),
            _ => None,
        });

        assert_eq!(
            output,
            r#"{"endpointConfigured":true,"authConfigured":true}"#
        );
        assert!(!output.contains("napoleon.example"));
        assert!(!output.contains("native_auth_value"));
    }

    #[test]
    fn desktop_runtime_transport_probe_outputs_only_sanitized_booleans() {
        let success = runtime_transport_probe_output(true, true);
        let failure = runtime_transport_probe_output(false, false);

        assert_eq!(success, r#"{"requestSucceeded":true,"statusOk":true}"#);
        assert_eq!(failure, r#"{"requestSucceeded":false,"statusOk":false}"#);
        assert!(!success.contains("napoleon.example"));
        assert!(!success.contains("native_auth_value"));
    }

    #[test]
    fn desktop_runtime_transport_probe_uses_native_endpoint_and_auth() {
        let harness =
            RuntimeHarness::start(vec![r#"{"capabilities":[],"runtimeAuthority":false}"#]);

        let response = tauri::async_runtime::block_on(perform_runtime_http_request_with_endpoint(
            NapoleonRuntimeHttpRequest {
                url: None,
                path: Some("/cos/capabilities".to_string()),
                method: Some("GET".to_string()),
                native_auth: Some(true),
                headers: None,
                body: None,
            },
            Some("native_auth_value".to_string()),
            Some(harness.base_url.clone()),
        ))
        .expect("transport probe request succeeds");
        assert_eq!(
            runtime_transport_probe_output(response.ok, response.status == 200),
            r#"{"requestSucceeded":true,"statusOk":true}"#
        );

        let request = harness.next_request();
        assert_eq!(request.method, "GET");
        assert_eq!(request.path, "/cos/capabilities");
        assert_eq!(
            request.headers.get("x-napoleon-auth"),
            Some(&"native_auth_value".to_string())
        );

        harness.join();
    }

    #[test]
    fn desktop_runtime_live_probe_outputs_only_sanitized_booleans() {
        let output = runtime_live_probe_output(RuntimeLiveProbeStatus {
            descriptor_ok: true,
            capabilities_ok: true,
            text_turn_ok: true,
            trace_ok: true,
            side_effect_claimed: false,
            route_family: Some(RuntimeLiveProbeRouteFamily::Cos),
            failure_stage: "none",
            failure_kind: "none",
        });

        assert_eq!(
            output,
            r#"{"descriptorOk":true,"capabilitiesOk":true,"textTurnOk":true,"traceOk":true,"sideEffectClaimed":false,"routeFamily":"cos","failureStage":"none","failureKind":"none"}"#
        );
        assert!(!output.contains("napoleon.example"));
        assert!(!output.contains("native_auth_value"));
        assert!(!output.contains("Packaged desktop live runtime validation probe"));
    }

    #[test]
    fn desktop_runtime_live_probe_reports_sanitized_failure_reason() {
        let output = runtime_live_probe_output(RuntimeLiveProbeStatus {
            descriptor_ok: false,
            capabilities_ok: false,
            text_turn_ok: false,
            trace_ok: false,
            side_effect_claimed: false,
            route_family: Some(RuntimeLiveProbeRouteFamily::Generated),
            failure_stage: "descriptor",
            failure_kind: "http_not_ok",
        });

        assert_eq!(
            output,
            r#"{"descriptorOk":false,"capabilitiesOk":false,"textTurnOk":false,"traceOk":false,"sideEffectClaimed":false,"routeFamily":"generated","failureStage":"descriptor","failureKind":"http_not_ok"}"#
        );
        assert!(!output.contains("napoleon.example"));
        assert!(!output.contains("127.0.0.1"));
        assert!(!output.contains("native_auth_value"));
        assert!(!output.contains("not found"));
    }

    #[test]
    fn desktop_runtime_live_probe_uses_governed_native_sequence() {
        let harness = RuntimeHarness::start(vec![
            r#"{"descriptor":{"runtimeAuthority":false}}"#,
            r#"{"capabilities":[{"id":"napoleon.capability.governed_text_turn","proposalOnly":true}],"runtimeAuthority":false}"#,
            r#"{"trace_id":"trace_packaged_desktop_live_probe","governance_decision":{"decision":"allow_prepare_only"},"approval_captured":false,"memory_write_performed":false,"agent_dispatch_performed":false,"external_send_performed":false}"#,
            r#"{"trace_id":"trace_packaged_desktop_live_probe"}"#,
        ]);
        let native_auth = Some("native_auth_value".to_string());
        let native_endpoint = Some(harness.base_url.clone());
        let mut status = RuntimeLiveProbeStatus::default();
        status.route_family = Some(RuntimeLiveProbeRouteFamily::Cos);

        let descriptor =
            tauri::async_runtime::block_on(perform_runtime_http_request_with_endpoint(
                live_probe_request("/cos/descriptor", "GET", None),
                native_auth.clone(),
                native_endpoint.clone(),
            ))
            .expect("descriptor request succeeds");
        status.descriptor_ok = descriptor.ok;

        let capabilities =
            tauri::async_runtime::block_on(perform_runtime_http_request_with_endpoint(
                live_probe_request("/cos/capabilities", "GET", None),
                native_auth.clone(),
                native_endpoint.clone(),
            ))
            .expect("capabilities request succeeds");
        status.capabilities_ok = capabilities.ok;

        let text_turn = tauri::async_runtime::block_on(perform_runtime_http_request_with_endpoint(
            live_probe_request(
                "/cos/text-turn",
                "POST",
                Some(runtime_live_probe_cos_text_turn_body()),
            ),
            native_auth.clone(),
            native_endpoint.clone(),
        ))
        .expect("text turn request succeeds");
        status.text_turn_ok = text_turn.ok;
        let trace_id = response_json(&text_turn)
            .and_then(|value| response_trace_id(&value))
            .expect("text response includes trace id");

        let trace = tauri::async_runtime::block_on(perform_runtime_http_request_with_endpoint(
            live_probe_request(&format!("/cos/trace/{trace_id}"), "GET", None),
            native_auth,
            native_endpoint,
        ))
        .expect("trace request succeeds");
        status.trace_ok = trace.ok;
        status.failure_stage = "none";
        status.failure_kind = "none";

        assert_eq!(
            runtime_live_probe_output(status),
            r#"{"descriptorOk":true,"capabilitiesOk":true,"textTurnOk":true,"traceOk":true,"sideEffectClaimed":false,"routeFamily":"cos","failureStage":"none","failureKind":"none"}"#
        );

        let descriptor_request = harness.next_request();
        assert_eq!(descriptor_request.method, "GET");
        assert_eq!(descriptor_request.path, "/cos/descriptor");
        assert_eq!(
            descriptor_request.headers.get("x-napoleon-auth"),
            Some(&"native_auth_value".to_string())
        );

        let capabilities_request = harness.next_request();
        assert_eq!(capabilities_request.method, "GET");
        assert_eq!(capabilities_request.path, "/cos/capabilities");

        let text_turn_request = harness.next_request();
        assert_eq!(text_turn_request.method, "POST");
        assert_eq!(text_turn_request.path, "/cos/text-turn");
        assert!(text_turn_request
            .body
            .contains(r#""request_id":"cos_packaged_desktop_live_probe""#));
        assert!(!text_turn_request.body.contains("native_auth_value"));

        let trace_request = harness.next_request();
        assert_eq!(trace_request.method, "GET");
        assert_eq!(
            trace_request.path,
            "/cos/trace/trace_packaged_desktop_live_probe"
        );

        harness.join();
    }

    #[test]
    fn desktop_runtime_live_probe_uses_generated_governed_sequence() {
        let harness = RuntimeHarness::start(vec![
            r#"{"descriptor":{"runtimeAuthority":false}}"#,
            r#"{"capabilities":[{"id":"napoleon.capability.governed_text_turn","proposalOnly":true}],"runtimeAuthority":false}"#,
            r#"{"governanceDecision":{"trace_id":"trace_packaged_desktop_live_probe","audit_id":"audit_packaged_desktop_live_probe","outcome":"allow_prepare_only"},"approvalCaptured":false,"memoryWritePerformed":false,"agentDispatchPerformed":false,"externalSendPerformed":false}"#,
        ]);

        let status = tauri::async_runtime::block_on(run_runtime_live_probe_family(
            RuntimeLiveProbeRouteFamily::Generated,
            Some("native_auth_value".to_string()),
            Some(harness.base_url.clone()),
        ))
        .expect("generated live probe succeeds");

        assert_eq!(
            runtime_live_probe_output(status),
            r#"{"descriptorOk":true,"capabilitiesOk":true,"textTurnOk":true,"traceOk":true,"sideEffectClaimed":false,"routeFamily":"generated","failureStage":"none","failureKind":"none"}"#
        );

        let descriptor_request = harness.next_request();
        assert_eq!(descriptor_request.method, "GET");
        assert_eq!(
            descriptor_request.path,
            "/v1/concierge/chief-of-staff/descriptor"
        );
        assert_eq!(
            descriptor_request.headers.get("authorization"),
            Some(&"Bearer native_auth_value".to_string())
        );
        assert_eq!(descriptor_request.headers.get("x-napoleon-auth"), None);

        let capabilities_request = harness.next_request();
        assert_eq!(capabilities_request.method, "GET");
        assert_eq!(
            capabilities_request.path,
            "/v1/concierge/chief-of-staff/capabilities"
        );

        let text_turn_request = harness.next_request();
        assert_eq!(text_turn_request.method, "POST");
        assert_eq!(text_turn_request.path, "/v1/concierge/turn");
        assert!(text_turn_request
            .body
            .contains(r#""requestKind":"text_turn""#));
        assert!(text_turn_request
            .body
            .contains(r#""traceId":"trace_packaged_desktop_live_probe""#));
        assert!(!text_turn_request.body.contains("native_auth_value"));

        harness.join();
    }

    #[test]
    fn desktop_runtime_command_preserves_explicit_webview_auth_when_native_auth_is_disabled() {
        let harness =
            RuntimeHarness::start(vec![r#"{"capabilities":[],"runtimeAuthority":false}"#]);

        let response = tauri::async_runtime::block_on(perform_runtime_http_request(
            NapoleonRuntimeHttpRequest {
                url: Some(harness.url("/cos/capabilities")),
                path: None,
                method: Some("GET".to_string()),
                native_auth: Some(false),
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
