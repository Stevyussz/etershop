/**
 * @file src/app/admin/login/page.tsx
 * @description Admin Login Page.
 *
 * Authenticates the admin using the /api/admin/auth endpoint.
 * After successful login, redirects to the intended page (from ?from= param)
 * or to /admin as a fallback.
 *
 * Displays server error messages directly from the API response
 * to give more informative feedback (e.g., "Password salah. Coba lagi.")
 */

"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, LogIn, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok) {
        // Redirect to the originally intended page, or /admin as fallback
        const from = searchParams.get("from") || "/admin";
        router.push(from);
        router.refresh();
      } else {
        // Show the specific error message returned from the API
        setError(data.error || "Login gagal. Periksa kembali password Anda.");
      }
    } catch {
      setError("Gagal terhubung ke server. Periksa koneksi internet Anda.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f16] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-[#0a0f16] to-[#0a0f16] pointer-events-none" />

      {/* Decorative grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full bg-[#111823]/80 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] relative z-10"
      >
        {/* Icon */}
        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 mx-auto shadow-[0_0_20px_rgba(59,130,246,0.2)]">
          <Lock className="w-8 h-8 text-blue-400" />
        </div>

        <h1 className="text-3xl font-black text-white text-center mb-1 tracking-tight">Admin Portal</h1>
        <p className="text-slate-400 text-center text-sm mb-8">
          Masuk ke Ruang Kontrol <span className="text-blue-400 font-bold">EterShop</span>
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Password Input */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan Password Admin..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full bg-[#0a0f16] border border-white/10 text-white px-5 py-4 pr-14 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono placeholder:font-sans placeholder:text-slate-600"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <p className="text-red-400 text-xs font-semibold flex items-center gap-1.5 bg-red-500/10 px-3 py-2.5 rounded-lg border border-red-500/20">
                  <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg text-base ${
              isLoading || !password.trim()
                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                : "bg-blue-600 hover:bg-blue-500 text-white hover:shadow-[0_10px_30px_rgba(37,99,235,0.4)] hover:-translate-y-0.5"
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
                Memverifikasi...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" /> Masuk Workspace
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-6">
          Lupa password? Lu siapa jingg?{" "}
          <code className="font-mono text-slate-500">Data Session lu udah gw pegang</code> di file{" "}
          <code className="font-mono text-slate-500">aowkoakwoakwo</code>
        </p>
      </motion.div>
    </div>
  );
}

/** Wrap with Suspense — required because useSearchParams() is used inside LoginForm */
export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
