import { useNavigate } from "react-router-dom";
import { clearToken } from "../auth";

type Props = {
  onLogout?: () => void;
};

export function DashboardPage({ onLogout }: Props) {
  const navigate = useNavigate();

  function handleLogout() {
    clearToken();
    if (onLogout) {
      onLogout();
    }
    navigate("/login", { replace: true });
  }

  return (
    <main className="min-h-screen flex flex-col bg-slate-950">
      <header className="w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-slate-50">
          Lead App Dashboard
        </h1>
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs font-medium text-slate-300 hover:text-slate-50 rounded-lg border border-slate-700 px-3 py-1.5"
        >
          Log out
        </button>
      </header>

      <section className="flex-1 px-4 py-6 flex justify-center">
        <div className="w-full max-w-lg space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="text-sm font-semibold text-slate-100 mb-1">
              Getting started
            </h2>
            <p className="text-xs text-slate-400">
              This is a placeholder dashboard. You are authenticated and ready
              to start building inspection flows.
            </p>
          </div>
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-500">
            Add your inspection list or quick actions here later.
          </div>
        </div>
      </section>
    </main>
  );
}

