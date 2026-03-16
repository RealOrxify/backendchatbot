"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [input]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok || !res.body) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantMsg += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantMsg };
          return updated;
        });
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠ Error: ${err instanceof Error ? err.message : "Something went wrong."}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, messages, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: 760, margin: "0 auto", fontFamily: "monospace" }}>
      <header style={{ padding: "14px 24px", borderBottom: "1px solid #222", background: "#0d0e11", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Mistral Chat</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>mistralai/Mistral-7B-Instruct-v0.3</div>
        </div>
        <button onClick={() => setMessages([])} style={{ fontSize: 11, color: "#555", background: "none", border: "1px solid #222", borderRadius: 4, padding: "4px 10px", cursor: "pointer" }}>
          ↺ clear
        </button>
      </header>

      <main style={{ flex: 1, overflowY: "auto", background: "#0d0e11", padding: "24px 0" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#444", marginTop: 80, fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⬡</div>
            <p>Start a conversation</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>Shift+Enter for newlines · Enter to send</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ padding: "14px 24px", borderLeft: `2px solid ${msg.role === "user" ? "#ff6b35" : "#2e3350"}`, background: msg.role === "user" ? "#13151a" : "#0f1118", marginBottom: 2 }}>
            <div style={{ fontSize: 10, color: msg.role === "user" ? "#ff6b35" : "#555", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
              {msg.role === "user" ? "you" : "mistral"}
            </div>
            <div style={{ color: "#d4d8f0", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {msg.content}
              {loading && i === messages.length - 1 && (
                <span style={{ display: "inline-block", width: 8, height: 14, background: "#ff6b35", marginLeft: 2, verticalAlign: "middle", animation: "blink 0.9s step-end infinite" }} />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      <footer style={{ padding: "16px 24px", borderTop: "1px solid #1f2230", background: "#13151a" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, background: "#0d0e11", border: "1px solid #2e3350", borderRadius: 6, padding: "10px 12px" }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            disabled={loading}
            rows={1}
            style={{ flex: 1, background: "none", border: "none", outline: "none", resize: "none", fontFamily: "monospace", fontSize: 14, color: "#d4d8f0", lineHeight: 1.6, minHeight: 24, maxHeight: 160 }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{ width: 32, height: 32, borderRadius: 4, border: "none", background: "#ff6b35", color: "#fff", fontSize: 16, cursor: "pointer", opacity: loading || !input.trim() ? 0.3 : 1 }}
          >
            ↑
          </button>
        </div>
      </footer>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}