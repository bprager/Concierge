from dataclasses import dataclass
from typing import List


@dataclass
class UserStateSignal:
    present: bool
    looking_at_screen: bool
    speaking: bool
    estimated_state: str
    confidence: float
    evidence: List[str]


@dataclass
class VoiceSegment:
    start_ms: int
    end_ms: int
    transcript: str
    confidence: float
