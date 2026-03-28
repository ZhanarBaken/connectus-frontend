import { fetchMentor } from "@/lib/api"
import { notFound } from "next/navigation"

interface Props {
  params: { id: string }
}

export default async function MentorPage({ params }: Props) {
  const mentor = await fetchMentor(Number(params.id)).catch(() => null)
  if (!mentor) notFound()

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold text-gray-500">
          {mentor.full_name[0]}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{mentor.full_name}</h1>
          <p className="text-gray-500">{mentor.school} · {mentor.country}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {mentor.expertise_areas.map((area) => (
          <span key={area} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
            {area}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-400">GPA</p>
          <p className="font-semibold">{mentor.gpa}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-400">Экзамены</p>
          <p className="font-semibold">{mentor.exam_results}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-gray-400">Грант</p>
          <p className="font-semibold">{mentor.grant_or_scholarship}</p>
        </div>
      </div>

      {mentor.detailed_bio && (
        <p className="text-gray-700 mb-8">{mentor.detailed_bio}</p>
      )}

      <h2 className="text-xl font-bold mb-4">Услуги</h2>
      <div className="grid gap-3">
        {mentor.services.map((service) => (
          <div key={service.id} className="border rounded-xl p-4 flex justify-between items-center">
            <div>
              <p className="font-semibold">{service.title}</p>
              <p className="text-sm text-gray-500">{service.description}</p>
              <p className="text-xs text-gray-400 mt-1">{service.duration_minutes} мин</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">${service.price}</p>
              <button className="mt-2 bg-black text-white text-sm px-4 py-1.5 rounded-lg hover:bg-gray-800 transition">
                Заказать
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
