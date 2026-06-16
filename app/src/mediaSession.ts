import type { LocalProfile } from "./contractBridge.js";

export type LocalMediaPermissionStatus = "not_requested" | "requested" | "granted" | "denied" | "unavailable";
export type LocalMediaSurface = "microphone" | "camera" | "playback";
export type LocalMediaSessionStatus =
  | "unavailable"
  | "permission_needed"
  | "permission_requested"
  | "available"
  | "blocked"
  | "active_preview"
  | "stopped";

export interface MediaSessionSurfaceInput {
  surface: LocalMediaSurface;
  profileMode: LocalProfile;
  localPreferenceEnabled: boolean;
  permissionStatus: LocalMediaPermissionStatus;
  mediaApiAvailable: boolean;
  activePreview?: boolean;
}

export interface MediaSessionSurfaceState {
  surface: LocalMediaSurface;
  status: LocalMediaSessionStatus;
  profileMode: LocalProfile;
  childProtected: boolean;
  localPreferenceEnabled: boolean;
  permissionStatus: LocalMediaPermissionStatus;
  authorityBoundary: string;
  guardianReviewReminder: string;
  captureStarted: false;
  microphoneCaptureStarted: false;
  cameraCaptureStarted: false;
  audioPlaybackStarted: false;
  rawAudioStored: false;
  rawVideoStored: false;
  liveNapoleonContacted: false;
  memoryWritePerformed: false;
  approvalCaptured: false;
  guardianApprovalCaptured: false;
  agentDispatchPerformed: false;
  externalSendPerformed: false;
  blockedEffects: string[];
}

export interface MediaSessionSummaryInput {
  profileMode: LocalProfile;
  microphoneEnabled: boolean;
  microphonePermissionStatus: LocalMediaPermissionStatus;
  cameraEnabled: boolean;
  cameraPermissionStatus: LocalMediaPermissionStatus;
  mediaApiAvailable: boolean;
}

export interface MediaSessionSummary {
  localSessionOnly: true;
  profileMode: LocalProfile;
  childProtected: boolean;
  microphone: MediaSessionSurfaceState;
  camera: MediaSessionSurfaceState;
  playback: MediaSessionSurfaceState;
  authorityBoundary: string;
}

export function buildMediaSessionSurface(input: MediaSessionSurfaceInput): MediaSessionSurfaceState {
  const childProtected = input.profileMode === "child_protected";
  const status = resolveSurfaceStatus(input, childProtected);
  const blockedEffects = blockedEffectsForSurface(input.surface, childProtected);
  return {
    surface: input.surface,
    status,
    profileMode: input.profileMode,
    childProtected,
    localPreferenceEnabled: input.localPreferenceEnabled,
    permissionStatus: input.permissionStatus,
    authorityBoundary:
      "Media session state is local visibility only; it is not capture, playback, Napoleon approval, memory, agent dispatch, or permission to send externally.",
    guardianReviewReminder: childProtected
      ? "Guardian review is required before child microphone, camera, playback, avatar, or voice features can become active."
      : "No guardian review reminder for this profile.",
    captureStarted: false,
    microphoneCaptureStarted: false,
    cameraCaptureStarted: false,
    audioPlaybackStarted: false,
    rawAudioStored: false,
    rawVideoStored: false,
    liveNapoleonContacted: false,
    memoryWritePerformed: false,
    approvalCaptured: false,
    guardianApprovalCaptured: false,
    agentDispatchPerformed: false,
    externalSendPerformed: false,
    blockedEffects,
  };
}

export function buildMediaSessionSummary(input: MediaSessionSummaryInput): MediaSessionSummary {
  const microphone = buildMediaSessionSurface({
    surface: "microphone",
    profileMode: input.profileMode,
    localPreferenceEnabled: input.microphoneEnabled,
    permissionStatus: input.microphonePermissionStatus,
    mediaApiAvailable: input.mediaApiAvailable,
  });
  const camera = buildMediaSessionSurface({
    surface: "camera",
    profileMode: input.profileMode,
    localPreferenceEnabled: input.cameraEnabled,
    permissionStatus: input.cameraPermissionStatus,
    mediaApiAvailable: input.mediaApiAvailable,
  });
  const playback = buildMediaSessionSurface({
    surface: "playback",
    profileMode: input.profileMode,
    localPreferenceEnabled: true,
    permissionStatus: "granted",
    mediaApiAvailable: true,
  });
  return {
    localSessionOnly: true,
    profileMode: input.profileMode,
    childProtected: input.profileMode === "child_protected",
    microphone,
    camera,
    playback,
    authorityBoundary:
      "Media session summary is local preflight only; it is not Napoleon approval, guardian approval, live voice, live avatar capture, memory, agent dispatch, or external send permission.",
  };
}

function resolveSurfaceStatus(input: MediaSessionSurfaceInput, childProtected: boolean): LocalMediaSessionStatus {
  if (childProtected) return "blocked";
  if (!input.localPreferenceEnabled) return "blocked";
  if (input.surface === "playback") return input.activePreview ? "active_preview" : "stopped";
  if (!input.mediaApiAvailable || input.permissionStatus === "unavailable") return "unavailable";
  if (input.permissionStatus === "requested") return "permission_requested";
  if (input.permissionStatus === "denied") return "blocked";
  if (input.permissionStatus === "not_requested") return "permission_needed";
  if (input.activePreview) return "active_preview";
  return "stopped";
}

function blockedEffectsForSurface(surface: LocalMediaSurface, childProtected: boolean): string[] {
  const surfaceEffects =
    surface === "camera"
      ? ["camera_capture", "raw_video_storage"]
      : surface === "microphone"
        ? ["microphone_capture", "raw_audio_storage"]
        : ["audio_playback", "raw_audio_storage"];
  const sharedEffects = [
    "live_napoleon_contact",
    "memory_write",
    "approval_capture",
    "external_send",
    "agent_dispatch",
  ];
  if (childProtected) return [...surfaceEffects, "guardian_approval_capture", ...sharedEffects];
  return [...surfaceEffects, ...sharedEffects];
}
