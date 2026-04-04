"use client"

import { useState, useEffect } from "react"
import { fetchStudentProfile, updateStudentProfile } from "@/lib/api"
import { StudentProfile } from "@/types"

export default function ProfilePage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [fullName, setFullName] = useState("")
  const [age, setAge] = useState("")
  const [currentSchool, setCurrentSchool] = useState("")
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchStudentProfile().then((p) => {
      setProfile(p)
      setFullName(p.full_name ?? "")
      setAge(p.age != null ? String(p.age) : "")
      setCurrentSchool(p.current_school_or_university ?? "")
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const updated = await updateStudentProfile({
      full_name: fullName,
      age: Number(age),
      current_school_or_university: currentSchool,
    })
    setProfile(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!profile) {
    return (
      <main className="max-w-sm mx-auto px-4 py-20 text-center text-gray-400">
        Загрузка...
      </main>
    )
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Мой профиль</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm text-gray-500 mb-1">Имя</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">Возраст</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            min={10}
            max={100}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">Школа / учебное заведение</label>
          <input
            type="text"
            value={currentSchool}
            onChange={(e) => setCurrentSchool(e.target.value)}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <button
          type="submit"
          className="bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition"
        >
          {saved ? "Сохранено" : "Сохранить"}
        </button>
      </form>
    </main>
  )
}
