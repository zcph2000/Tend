"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("Tjek din email for bekræftelseslink.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError("Forkert email eller kodeord");
      else router.push("/dashboard");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-grass-900 via-grass-800 to-earth-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-grass-500 rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">🌿</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Tend</h1>
          <p className="text-grass-300 mt-1 text-sm">Regenerativ gårdsstyring</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-semibold text-earth-50 mb-5">
            {isSignUp ? "Opret konto" : "Log ind"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="din@email.dk"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Kodeord</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                autoComplete={isSignUp ? "new-password" : "current-password"}
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-grass-50 text-grass-700 rounded-xl px-4 py-3 text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? "Vent..." : isSignUp ? "Opret konto" : "Log ind"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
              className="text-sm text-grass-600 hover:text-grass-700 font-medium"
            >
              {isSignUp
                ? "Har du allerede en konto? Log ind"
                : "Ingen konto? Opret en"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
