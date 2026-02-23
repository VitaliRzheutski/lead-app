const isLocalhost =
  typeof window !== "undefined" && window.location.hostname === "localhost";
export const API_URL =
  import.meta.env.VITE_API_URL ||
  (isLocalhost ? "http://localhost:3000" : "https://lead-app-api.onrender.com");
