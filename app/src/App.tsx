import { useState } from "react";
import { sendToNapoleon } from "./napoleonBridge";
import { emitEvent, newTraceId } from "./telemetry";
import type { ConciergeMessage } from "./types";

export function App() {
  const [messages, setMessages] = useState<ConciergeMessage[]>([
    {
      role: "assistant",
      content: "Concierge text MVP is ready. Camera and microphone are off.",
    },
  ]);
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState("adult_owner");

  async function submit() {
    const content = input.trim();
    if (!content) return;

    const traceId = newTraceId();
    emitEvent("user_message_received", { traceId, channel: "text", profile });

    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");

    const response = await sendToNapoleon({
      traceId,
      profile,
      channel: "text",
      message: content,
    });

    emitEvent("response_generated", { traceId, responseType: "text" });
    setMessages((m) => [...m, { role: "assistant", content: response.text }]);
  }

  return (
    <main className="shell">
      <header>
        <h1>Concierge</h1>
        <p>Text MVP. Voice and avatar are feature-gated.</p>
      </header>

      <section className="settings">
        <label>
          User profile
          <select value={profile} onChange={(e) => setProfile(e.target.value)}>
            <option value="adult_owner">Adult owner</option>
            <option value="child_protected">Child protected</option>
            <option value="guest">Guest</option>
          </select>
        </label>
        <span className="capture">Camera off, microphone off</span>
      </section>

      <section className="messages">
        {messages.map((m, i) => (
          <article key={i} className={m.role}>
            <strong>{m.role}</strong>
            <p>{m.content}</p>
          </article>
        ))}
      </section>

      <section className="composer">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Napoleon through Concierge..."
        />
        <button onClick={submit}>Send</button>
      </section>
    </main>
  );
}
