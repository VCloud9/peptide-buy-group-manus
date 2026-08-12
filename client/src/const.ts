export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Supabase Auth owns the external Railway sign-in flow. Keep the originally
// requested path so users return to their intended member/admin screen.
export const getLoginUrl = () => {
  if (typeof window === "undefined") return "/login";
  const returnPath = `${window.location.pathname}${window.location.search}`;
  return `/login?redirectTo=${encodeURIComponent(returnPath)}`;
};
