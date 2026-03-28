import { fetchMentors } from "@/lib/api"
import Link from "next/link"

export default async function HomePage() {
  const mentors = await fetchMentors()

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-2">Найди своего ментора</h1>
      <p className="text-gray-500 mb-8">Поступление за рубеж, гранты, визы, документы</p>

      <div className="grid gap-4">
        {mentors.map((mentor) => (
          <Link
            key={mentor.id}
            href={`/mentors/${mentor.id}`}
            className="border rounded-xl p-5 hover:shadow-md transition block"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold">{mentor.full_name}</h2>
                <p className="text-gray-500 text-sm">{mentor.school} · {mentor.country}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {mentor.expertise_areas.map((area) => (
                    <span
                      key={area}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">от</p>
                <p className="font-bold text-lg">
                  ${mentor.services[0]?.price ?? "—"}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
