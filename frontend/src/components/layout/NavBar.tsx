import React, { useState, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  Brain,
  BarChart3,
  BookOpen,
  RefreshCw,
  Target,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Bell,
  Download,
  SettingsIcon,
} from "../icons";
import SettingsModal from "../common/SettingsModal";
import { isStandalone } from "../../utils/pwaPush";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: BarChart3 },
  { to: "/categories", label: "Knowledge", icon: BookOpen },
  { to: "/reviews", label: "Reviews", icon: RefreshCw },
  { to: "/practice", label: "Practice", icon: Target },
];

export default function NavBar() {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandalone());

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const isDark = theme === "dark";

  return (
    <>
      <header className="sticky top-0 z-40 w-full px-3 sm:px-8 py-3 transition-all">
        <div className="max-w-[1600px] mx-auto">
          <nav className="glass-panel px-3.5 sm:px-6 py-2.5 flex items-center justify-between shadow-glass relative">
            {/* Logo Left */}
            <NavLink
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 group transition-transform active:scale-95 shrink-0"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-glow-brand border border-indigo-300/30 group-hover:scale-105 transition-transform duration-200 shrink-0">
                <Brain size={20} className="text-white drop-shadow-sm" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-base sm:text-lg tracking-tight group-hover:text-brand-500 transition-colors">
                  Recall<span className="text-brand-500">Hub</span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-white/50 -mt-1 font-medium tracking-wider uppercase hidden sm:block">
                  Spaced Recall
                </span>
              </div>
            </NavLink>

            {/* Desktop Center Nav Links */}
            <div className="hidden md:flex items-center gap-1 sm:gap-2 relative">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.to === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.to);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`relative px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                      isActive
                        ? "text-brand-600 dark:text-white font-semibold bg-brand-500/10 dark:bg-white/10 shadow-xs"
                        : "text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <Icon
                      size={16}
                      className={`transition-colors ${
                        isActive
                          ? "text-brand-600 dark:text-brand-400"
                          : "text-slate-400 dark:text-white/50"
                      }`}
                    />
                    <span>{item.label}</span>

                    {/* Active Indicator Underline */}
                    {isActive && (
                      <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-gradient-to-r from-brand-500 to-indigo-400 rounded-full shadow-glow-brand" />
                    )}
                  </NavLink>
                );
              })}
            </div>

            {/* Right Action Controls: Install Prompt, Settings/Reminders, Theme, Logout, Mobile Menu */}
            <div className="flex items-center gap-2">
              {/* Optional Install Pill Button when beforeinstallprompt is active */}
              {deferredPrompt && !isInstalled && (
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-glow-brand transition-all hover:scale-105 active:scale-95"
                  title="Install RecallHub App"
                >
                  <Download size={14} />
                  <span>Install App</span>
                </button>
              )}

              {/* Settings / Reminders Button */}
              <button
                onClick={() => setSettingsOpen(true)}
                className="glass-btn p-2 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 relative"
                title="Settings & Reminders"
                aria-label="Settings and push reminders"
              >
                <Bell size={17} className="text-slate-700 dark:text-white/80" />
                {/* Subtle indicator dot */}
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500 shadow-glow-brand ring-2 ring-slate-900" />
              </button>

              {/* Theme Toggle Button (Animated Sun/Moon) */}
              <button
                onClick={toggleTheme}
                className="glass-btn p-2 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
                aria-label="Toggle theme"
              >
                <div className="relative w-4.5 h-4.5 flex items-center justify-center">
                  {isDark ? (
                    <Sun
                      size={17}
                      className="text-amber-300 transform transition-transform duration-300 hover:rotate-45"
                    />
                  ) : (
                    <Moon
                      size={17}
                      className="text-indigo-600 transform transition-transform duration-300 hover:-rotate-12"
                    />
                  )}
                </div>
              </button>

              {/* Desktop Logout Button */}
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                title="Sign Out"
                className="hidden md:flex glass-btn px-3 py-1.5 text-xs text-slate-700 dark:text-white/80 hover:text-red-600 dark:hover:text-white items-center gap-1.5 hover:border-red-400/40 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={14} className="text-red-500 dark:text-red-400" />
                <span>Logout</span>
              </button>

              {/* Mobile Hamburger Toggle Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden glass-btn p-2 rounded-xl flex items-center justify-center transition-all active:scale-95"
                aria-label="Open navigation menu"
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </nav>

          {/* Mobile / Tablet Slide-in Dropdown Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-2 glass-panel p-4 border shadow-2xl animate-[fadeIn_150ms_ease-out] space-y-3 z-50">
              <div className="flex flex-col space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.to === "/"
                      ? location.pathname === "/"
                      : location.pathname.startsWith(item.to);

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
                        isActive
                          ? "bg-brand-500/15 dark:bg-white/15 text-brand-600 dark:text-white font-bold border border-brand-500/20 dark:border-white/20"
                          : "text-slate-700 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          size={17}
                          className={
                            isActive
                              ? "text-brand-600 dark:text-brand-400"
                              : "text-slate-400 dark:text-white/50"
                          }
                        />
                        <span>{item.label}</span>
                      </div>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 dark:bg-brand-400 shadow-glow-brand" />
                      )}
                    </NavLink>
                  );
                })}
              </div>

              {/* Mobile Install & Reminders Action */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setSettingsOpen(true);
                  }}
                  className="w-full glass-btn px-4 py-2.5 text-xs text-brand-600 dark:text-brand-300 hover:bg-brand-500/15 border-brand-500/30 flex items-center justify-between font-semibold rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <Bell size={15} />
                    <span>App Settings & Reminders</span>
                  </div>
                  {deferredPrompt && (
                    <span className="px-2 py-0.5 text-[10px] bg-brand-600 text-white rounded-md">
                      Install
                    </span>
                  )}
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-white/50">Theme & Account</span>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                    navigate("/login");
                  }}
                  className="glass-btn px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-500/15 border-red-400/30 flex items-center gap-1.5 font-medium"
                >
                  <LogOut size={13} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Global Settings & PWA Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        deferredPrompt={deferredPrompt}
        setDeferredPrompt={setDeferredPrompt}
      />
    </>
  );
}
