# Live Text Interaction Pilot

Date: 2026-06-30

## Scope

This pilot launched the rendered Concierge desktop frontend against the real Napoleon `/cos` runtime through a local same-origin development proxy backed by the existing SSH tunnel. The proxy avoided browser CORS blocking and did not change Concierge's governed bridge checks, response validation, proof handling, or side-effect boundaries.

Endpoint hosts, tokens, raw prompts, request bodies, and response bodies are not retained in this report.

## Result

Status: passed for live text interaction pilot.

Concierge successfully used the user-facing settings path to configure the governed runtime endpoint and bridge token, discover the live descriptor, fetch advisory capabilities, and send an adult-owner live text turn. The adult turn returned an advisory answer with visible governance state, decision and audit references, trace reference, proof, selected capability/delegation provenance, blocked effects, and an explicit no-side-effect boundary.

The child-protected live turn was denied by Napoleon and Concierge failed closed. The UI now reports the denial as `governance_denied` instead of a credential problem, keeps the profile as `child_protected_user`, withholds accepted proof/delegation attribution, and states that Concierge did not send externally, write memory, dispatch agents, or capture approval.

## Evidence Observed

- Descriptor discovery: live descriptor ready; text-turn route advertised; runtime authority blocked.
- Capability discovery: 8 advisory capabilities; runtime authority blocked; response side-effect claims none.
- Adult-owner text turn: returned answer accepted; governance `allow_prepare_only`; decision, audit, trace, proof, delegation provenance, and blocked effects visible.
- Child-protected text turn: failed closed as `governance_denied`; no accepted proof; no delegation attribution; no memory write, external send, agent dispatch, or approval capture.
- Camera, microphone, wake word, avatar affect, and raw media storage remained off.

## Fixes Made

- Added a Vite development proxy at `/napoleon-runtime` so the rendered desktop frontend can reach the real Napoleon runtime through a same-origin local path during local pilots.
- Updated capability discovery to accept Napoleon's current `/cos/capabilities` response shape while preserving prepare-only and no-side-effect checks.
- Updated text-turn bridge handling so HTTP 403 responses are presented as governed denials instead of authentication failures.

## Remaining Constraint

The pilot used a local SSH tunnel and development proxy because the browser could not route directly to the LAN runtime and Napoleon does not currently provide CORS headers for browser-origin requests. This is suitable for local pilot validation but not a production connectivity story.

The next practical goal is to make the live runtime connection production-grade for the desktop shell: add a governed Tauri-side bridge transport or an equivalent packaged-app connection path that avoids browser CORS, keeps endpoint/token handling local, and preserves the same descriptor, proof, and no-side-effect gates.
