export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Railway injects runtime variables after the Vite build, so retain these
// public Manus OAuth defaults in the compiled browser bundle as a fallback.
// The app ID is an OAuth client identifier, not a secret.
const DEFAULT_OAUTH_PORTAL_URL = "https://manus.im";
const DEFAULT_APP_ID = "QN4sea9PxazJ9HdbMAp8cn";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl =
    import.meta.env.VITE_OAUTH_PORTAL_URL || DEFAULT_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID || DEFAULT_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
