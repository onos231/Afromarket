"use client";

import { useState, useEffect, useRef } from "react";

type ChatMessage = {
  id?: string;
  sender: string;
  content: string;
  timestamp?: string;
};

export default function ChatBox({
  offerId,
  currentUser,
}: {
  offerId: string;
  currentUser: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Load history (no token for now)
    fetch(`http://localhost:8000/offers/${offerId}/chat`)
      .then((res) => res.json())
      .then((data) => setMessages(data.messages || []))
      .catch((err) => console.error("Error loading history:", err));

    // Connect WebSocket
    const ws = new WebSocket(`ws://localhost:8000/ws/chat/${offerId}`);
    wsRef.current = ws;

    ws.onopen = () => console.log("✅ WebSocket connected");
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      setMessages((prev) => [...prev, msg]);
    };
    ws.onclose = () => console.log("❌ WebSocket disconnected");

    return () => ws.close();
  }, [offerId]);

  const sendMessage = () => {
  if (!newMessage.trim() || !wsRef.current) return;

  wsRef.current.send(JSON.stringify({ sender: currentUser, content: newMessage }));
  setNewMessage("");
};

  return (
    <div>
      <div className="h-32 overflow-y-auto border rounded p-2 mb-2 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg, idx) => (
            <p key={msg.id ?? idx} className="text-sm text-gray-800 mb-1">
              <strong>{msg.sender}:</strong> {msg.content}
            </p>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 border rounded p-2 text-sm"
        />
        <button
          onClick={sendMessage}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}
