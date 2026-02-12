import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

type Props = {
  token: string;
};

export function NewInspectionPage({ token }: Props) {
  const navigate = useNavigate();
  const [propertyAddress, setPropertyAddress] = useState("");
  const [clientName, setClientName] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [inspectionType, setInspectionType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!propertyAddress.trim()) {
      setError("Property address is required.");
      return;
    }
    if (!clientName.trim()) {
      setError("Client name is required.");
      return;
    }
    if (!inspectionDate) {
      setError("Inspection date is required.");
      return;
    }
    if (!inspectionType.trim()) {
      setError("Inspection type is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:3000/inspections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          property_address: propertyAddress.trim(),
          client_name: clientName.trim(),
          inspection_date: inspectionDate,
          inspection_type: inspectionType.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? "Failed to create inspection.");
        return;
      }

      const id = data?.inspection?.id;
      if (!id) {
        setError("Inspection created but no id was returned.");
        return;
      }

      navigate(`/inspections/${id}`, { replace: true });
    } catch (_err) {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-slate-950">
      <header className="w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur px-4 py-3 flex items-center">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mr-3 text-xs text-slate-400 hover:text-slate-100"
        >
          ← Back
        </button>
        <h1 className="text-base font-semibold text-slate-50">
          New inspection
        </h1>
      </header>

      <section className="flex-1 px-4 py-6 flex justify-center">
        <div className="w-full max-w-lg space-y-4">
          {error && (
            <p className="mb-2 text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label
                htmlFor="propertyAddress"
                className="block text-sm font-medium text-slate-200"
              >
                Property address
              </label>
              <input
                id="propertyAddress"
                type="text"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                placeholder="123 Main St, City"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="clientName"
                className="block text-sm font-medium text-slate-200"
              >
                Client name
              </label>
              <input
                id="clientName"
                type="text"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client name"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="inspectionDate"
                className="block text-sm font-medium text-slate-200"
              >
                Inspection date
              </label>
              <input
                id="inspectionDate"
                type="date"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="inspectionType"
                className="block text-sm font-medium text-slate-200"
              >
                Inspection type
              </label>
              <input
                id="inspectionType"
                type="text"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                value={inspectionType}
                onChange={(e) => setInspectionType(e.target.value)}
                placeholder="e.g. Initial, Clearance"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Creating..." : "Create inspection"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

