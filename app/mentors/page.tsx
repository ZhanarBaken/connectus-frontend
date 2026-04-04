import { fetchMentors } from "@/lib/api"
import MentorsList from "@/components/MentorsList"

export default async function MentorsPage() {
  const mentors = await fetchMentors()
  return <MentorsList mentors={mentors} />
}
