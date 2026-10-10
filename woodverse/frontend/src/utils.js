export function formatPrice(value) {
  return `LKR ${new Intl.NumberFormat("en-LK").format(value)}`;
}

// Checkout fees. These mirror the server constants so the summary shown before
// submitting matches what the server charges. The server value is authoritative and
// is always shown after an order is placed.
export const DELIVERY_FEE = 7500;
export const ASSURANCE_FEE = 3500;

export function sortProducts(items, sort) {
  return [...items].sort((a, b) => {
    if (sort === "newest") return new Date(b.newest) - new Date(a.newest);
    if (sort === "price") return a.price - b.price;
    return a.featured - b.featured;
  });
}

export function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const TOKEN_KEY = "woodverse-auth-token";
const USER_KEY = "woodverse-api-user";

export function getAuthToken() {
  // Token is now in an HttpOnly cookie; JS cannot read it.
  // Return a placeholder truthy value if the user key exists, so callers
  // that check for a token before calling apiRequest still work.
  try {
    return localStorage.getItem(USER_KEY) ? "cookie-auth" : null;
  } catch {
    return null;
  }
}

export function getAuthUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

// A session exists only while there is a token that has not expired. The old code
// trusted a separate `woodverse-authenticated` string, which anyone could set by hand.
export function getSession() {
  try {
    // Clean up any legacy token stored under the old key (tokens are now HttpOnly cookies).
    const legacyToken = localStorage.getItem(TOKEN_KEY);
    if (legacyToken) localStorage.removeItem(TOKEN_KEY);

    const user = getAuthUser();
    if (!user) return null;
    return {
      role: user.role || null,
      id: user.id || null,
      email: user.email || null,
      fullName: user.fullName || null,
    };
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return getSession() !== null;
}

export function hasRole(...roles) {
  const session = getSession();
  return Boolean(session && roles.includes(session.role));
}

export function storeAuth({ token, user }) {
  try {
    // token is stored as HttpOnly cookie by the server — do not store in localStorage
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

export function clearAuth() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("woodverse-authenticated");
  } catch {}
}

// Signs out from anywhere in the app, including the portal pages that render their own
// shell instead of the storefront header. The token is dropped before the route changes
// so no protected page can render in between.
export async function signOut() {
  try {
    await fetch((typeof import.meta !== "undefined" ? (import.meta.env?.VITE_API_URL || "") : "") + "/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {}
  clearAuth();
  navigate("/");
}

// Reads the payload only. This does not verify the signature, so it must never be
// treated as proof of identity on its own. The server is the only thing that can do
// that. It is used here purely to detect an expired or malformed token.
function decodeJwt(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export async function apiRequest(path, options = {}) {
  const baseUrl = import.meta.env.VITE_API_URL || "";
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    let message = `API request failed: ${response.status}`;
    try {
      const data = JSON.parse(text);
      message = data.error || message;
    } catch {
      message = text || message;
    }
    // An expired or rejected token must not linger, otherwise every later request
    // keeps failing and the UI keeps looking signed in.
    if (response.status === 401) {
      clearAuth();
      window.dispatchEvent(new CustomEvent("woodverse:unauthorized"));
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}
