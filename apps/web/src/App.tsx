import { useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { getToken } from "./auth";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";

type ProtectedRouteProps = {
  token: string | null;
  children: JSX.Element;
};

function ProtectedRoute({ token, children }: ProtectedRouteProps) {
  const location = useLocation();

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
}

function App() {
  const [token, setTokenState] = useState<string | null>(() => getToken());

  function handleAuthSuccess(newToken: string) {
    setTokenState(newToken);
  }

  function handleLogout() {
    setTokenState(null);
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          token ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/login"
        element={<LoginPage onAuthSuccess={handleAuthSuccess} />}
      />
      <Route
        path="/register"
        element={<RegisterPage onAuthSuccess={handleAuthSuccess} />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute token={token}>
            <DashboardPage onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={
          <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
            <div className="max-w-md w-full px-6 py-8 rounded-2xl bg-slate-900 shadow-xl border border-slate-800 text-center">
              <h1 className="text-2xl font-semibold tracking-tight mb-2 text-slate-50">
                Page not found
              </h1>
              <p className="text-sm text-slate-400 mb-4">
                The page you are looking for does not exist.
              </p>
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 transition-colors"
              >
                Go home
              </a>
            </div>
          </main>
        }
      />
    </Routes>
  );
}

export default App;

