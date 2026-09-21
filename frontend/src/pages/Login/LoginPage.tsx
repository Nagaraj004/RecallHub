import React, { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import BackgroundBlobs from "../../components/common/BackgroundBlobs";
import PageTransition from "../../components/common/PageTransition";
import { Brain, Sparkles, Mail, Lock, User, ArrowRight, Sun, Moon } from "../../components/icons";

export default function LoginPage() {
  const { login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isDark = theme === "dark";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isRegisterMode) {
        await register(email, password, displayName || undefined);
      } else {
        await login(email, password);
      }
      navigate("/");
    } catch (err: any) {
      setError(
        err?.response?.data?.detail || "Authentication failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleQuickDemoFill() {
    setEmail("naga@recall.com");
    setPassword("naga123");
    setError(null);
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-10 sm:py-12">
      <BackgroundBlobs />

      {/* Floating Theme Toggle on Login screen */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          className="glass-btn p-2 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
          title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun size={17} className="text-amber-300" />
          ) : (
            <Moon size={17} className="text-indigo-600" />
          )}
        </button>
      </div>

      <PageTransition className="w-full max-w-[420px]">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-glow-brand border border-indigo-300/30 mb-3 sm:mb-4 animate-breathe">
            <Brain size={28} className="text-white drop-shadow-md" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight">
            Recall<span className="text-brand-500">Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-white/60 mt-1 max-w-xs">
            Capture what you learn. Remember it forever with spaced recall.
          </p>
        </div>

        {/* Centered Glass Auth Card */}
        <div className="glass-panel p-6 sm:p-8 border shadow-2xl relative overflow-hidden">
          {/* Ambient light glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Mode Switcher Tabs */}
          <div className="flex bg-black/5 dark:bg-white/[0.05] p-1 rounded-xl border border-slate-200 dark:border-white/10 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                !isRegisterMode
                  ? "bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-white/15 font-bold"
                  : "text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                isRegisterMode
                  ? "bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-white/15 font-bold"
                  : "text-slate-500 dark:text-white/60 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-200 text-xs flex items-start gap-2.5 animate-[fadeIn_200ms_ease-out]">
              <div className="w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                !
              </div>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div className="space-y-1.5 animate-[fadeIn_200ms_ease-out]">
                <label className="text-xs font-medium text-slate-700 dark:text-white/70 block">
                  Display Name <span className="text-slate-400 dark:text-white/40">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-white/40">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    className="glass-input w-full pl-9 pr-3.5 py-2.5 text-sm"
                    placeholder="e.g. Naga"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-white/70 block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-white/40">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  className="glass-input w-full pl-9 pr-3.5 py-2.5 text-sm"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700 dark:text-white/70">Password</label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-white/40">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  required
                  className="glass-input w-full pl-9 pr-3.5 py-2.5 text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full glass-btn-primary min-h-[44px] py-3 text-sm font-semibold flex items-center justify-center gap-2 mt-6 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : isRegisterMode ? (
                <>
                  <span>Create Free Account</span>
                  <ArrowRight size={16} />
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Fill Button */}
          <div className="mt-6 pt-5 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 dark:text-white/50">Demo account:</span>
            <button
              type="button"
              onClick={handleQuickDemoFill}
              className="text-xs text-brand-600 dark:text-brand-300 hover:text-brand-700 dark:hover:text-brand-200 flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 transition-colors cursor-pointer"
            >
              <Sparkles size={12} className="text-brand-500 dark:text-brand-300" />
              <span>Fill `naga@recall.com`</span>
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-white/40 mt-6">
          RecallHub • Spaced Repetition & Knowledge Calibration
        </p>
      </PageTransition>
    </div>
  );
}
