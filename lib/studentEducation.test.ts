import { describe, expect, it } from "vitest"
import { studentGradeCode, studentDesiredCountriesSummary } from "./studentEducation"

describe("student education compatibility", () => {
  it("uses stable codes and falls back to exact legacy labels", () => {
    expect(studentGradeCode({ school_grade_code: "grade_11", school_grade: "11 класс" })).toBe("grade_11")
    expect(studentGradeCode({ school_grade: "Студент вуза" })).toBe("university")
    expect(studentGradeCode({ school_grade: "11" })).toBe("")
    expect(studentGradeCode({ school_grade: "unknown" })).toBe("")
  })
})


it("shows selected country codes for a new student with no legacy text", () => {
  const summary = studentDesiredCountriesSummary({ desired_country_codes: ["US", "CA"], desired_countries: "" }, "en")
  expect(summary).toContain("USA")
  expect(summary).toContain("Canada")
})
it("keeps legacy text alongside localized selections and supports old responses", () => {
  expect(studentDesiredCountriesSummary({ desired_countries: "Atlantis? undecided" }, "ru")).toBe("Atlantis? undecided")
  expect(studentDesiredCountriesSummary({ desired_country_codes: ["CA"], desired_countries: "Atlantis?" }, "ru")).toContain("Atlantis?")
  expect(studentDesiredCountriesSummary({ desired_country_codes: ["CA"] }, "ru")).toContain("Канада")
  expect(studentDesiredCountriesSummary({}, "kk")).toBe("")
})
