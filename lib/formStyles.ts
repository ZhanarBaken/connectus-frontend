// Shared Tailwind classes for text/number/date inputs and native <select>s
// across the profile-edit and onboarding forms (mentor + student). Kept as
// plain string constants (not a component) since call sites still need to
// conditionally append error-state border classes on top of these.
export const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all bg-white"

// Native <select> renders its own grey arrow and uses a system font that
// looks heavier than the input next to it. We kill the native chrome
// (appearance-none), match input typography (text-gray-900), and paint
// the chevron ourselves so the field aligns visually with text inputs.
export const selectClass = `${inputClass} appearance-none text-gray-900 pr-10 bg-no-repeat bg-[right_0.875rem_center] bg-[length:1rem_1rem] cursor-pointer bg-[url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%239ca3af' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 8 10 12 14 8'/%3E%3C/svg%3E")]`
