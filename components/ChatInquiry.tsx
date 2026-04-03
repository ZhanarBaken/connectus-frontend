"use client"

import { useState } from "react"
import { ChatMessage } from "@/types"

export default function ChatInquiry({ mentorName }: { mentorName: string }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")

  const handleSend = () => {
    if (!input.trim()) return

    const studentMsg: ChatMessage = {
      id: Date.now(),
      sender_id: 0,
      sender_role: "student",
      content: input.trim(),
      created_at: new Date().toISOString(),
    }

    const mentorReply: ChatMessage = {
      id: Date.now() + 1,
      sender_id: 1,
      sender_role: "mentor",
      content: "Спасибо за вопрос! Отвечу в ближайшее время.",
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, studentMsg, mentorReply])
    setInput("")
  }

  return (
    <div className="mt-8 border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50 transition"
      >
        <span className="font-semibold">Записаться на консультацию</span>
        <span className="text-gray-400 text-sm">{open ? "Скрыть" : "Открыть"}</span>
      </button>

      {open && (
        <div className="border-t">
          {messages.length === 0 && (
            <p className="text-sm text-gray-400 px-5 py-4">
              Напиши ментору — он ответит и вы договоритесь о встрече
            </p>
          )}

          <div className="flex flex-col gap-3 px-5 py-4 max-h-64 overflow-y-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_role === "student" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs text-sm px-4 py-2 rounded-2xl ${
                    msg.sender_role === "student"
                      ? "bg-black text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 px-5 py-3 border-t">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Напиши вопрос..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-40"
            >
              Отправить
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
