"use client"

import { useState } from "react"

interface Faq {
  q: string
  a: string
}

export default function FaqList({ items }: { items: Faq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-4">
      {items.map((faq, i) => {
        const isOpen = openIndex === i
        return (
          <div
            key={faq.q}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-[border-color,box-shadow] duration-300 hover:border-indigo-200 hover:shadow-sm"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 p-6 text-left [-webkit-tap-highlight-color:transparent]"
            >
              <h3 className="font-semibold text-gray-900 text-base sm:text-lg">{faq.q}</h3>
              <span
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg transform-gpu transition-[transform,background-color,color] duration-300 ${
                  isOpen
                    ? "bg-indigo-600 text-white rotate-45"
                    : "bg-indigo-50 text-indigo-600"
                }`}
                style={{ WebkitBackfaceVisibility: "hidden" }}
                aria-hidden
              >
                +
              </span>
            </button>

            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <p className="text-gray-500 text-sm leading-relaxed px-6 pb-6">{faq.a}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
