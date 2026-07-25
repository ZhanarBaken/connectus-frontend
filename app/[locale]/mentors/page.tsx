import { fetchMentors } from "@/lib/api"
import MentorsList from "@/components/MentorsList"

// Render on each request — backend isn't reachable at Vercel build
// time, so static prerendering would fail with ECONNREFUSED.
export const dynamic = "force-dynamic"

export default async function MentorsPage() {
  // Degrade gracefully when the backend is unreachable.
  let mentors: Awaited<ReturnType<typeof fetchMentors>> = []
  try {
    mentors = await fetchMentors()
  } catch {
    // Empty list — page still renders with the search/filter UI.
  }
  return <MentorsList mentors={mentors} />
}
