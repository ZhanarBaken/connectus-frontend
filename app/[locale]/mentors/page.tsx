import { fetchMentors } from "@/lib/api"
import MentorsList from "@/components/MentorsList"

// Render on each request — backend isn't reachable at Vercel build
// time, so static prerendering would fail with ECONNREFUSED.
export const dynamic = "force-dynamic"

export default async function MentorsPage() {
  let mentors: Awaited<ReturnType<typeof fetchMentors>> = []
  let loadError = false
  try {
    mentors = await fetchMentors()
  } catch {
    loadError = true
  }
  return <MentorsList mentors={mentors} loadError={loadError} />
}
