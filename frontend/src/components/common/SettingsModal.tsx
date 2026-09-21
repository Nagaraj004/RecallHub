import React, { useEffect, useState } from "react";
import {
  Bell,
  BellRing,
  BellOff,
  Download,
  Smartphone,
  Laptop,
  Share2,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ExternalLink,
} from "../icons";
import {
  isPushSupported,
  isStandalone,
  isIosDevice,
  getExistingPushSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  triggerTestPushNotification,
  triggerDueReminders,
} from "../../utils/pwaPush";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  setDeferredPrompt: (prompt: any) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  deferredPrompt,
  setDeferredPrompt,
}: SettingsModalProps) {
  const [pushEnabled, setPushEnabled] = useState<boolean>(false);
  const [loadingPush, setLoadingPush] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [isTestSending, setIsTestSending] = useState<boolean>(false);
  const [isDueSending, setIsDueSending] = useState<boolean>(false);

  const standalone = isStandalone();
  const isIos = isIosDevice();
  const pushSupported = isPushSupported();

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    async function checkState() {
      setLoadingPush(true);
      try {
        if (!pushSupported) {
          if (mounted) setPushEnabled(false);
          return;
        }

        const sub = await getExistingPushSubscription();
        const permission = Notification.permission;
        if (mounted) {
          setPushEnabled(!!sub && permission === "granted");
        }
      } catch (err) {
        console.warn("Failed to check subscription:", err);
      } finally {
        if (mounted) setLoadingPush(false);
      }
    }

    checkState();

    return () => {
      mounted = false;
    };
  }, [isOpen, pushSupported]);

  if (!isOpen) return null;

  const handleTogglePush = async () => {
    setStatusMessage(null);
    setLoadingPush(true);

    if (!pushEnabled) {
      // Opt-in
      const res = await subscribeToPushNotifications();
      if (res.success) {
        setPushEnabled(true);
        setStatusMessage({
          type: "success",
          text: res.message,
        });
      } else {
        setStatusMessage({
          type: "error",
          text: res.message,
        });
      }
    } else {
      // Opt-out
      const res = await unsubscribeFromPushNotifications();
      if (res.success) {
        setPushEnabled(false);
        setStatusMessage({
          type: "info",
          text: res.message,
        });
      } else {
        setStatusMessage({
          type: "error",
          text: res.message,
        });
      }
    }
    setLoadingPush(false);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setStatusMessage({
          type: "success",
          text: "Thank you for installing RecallHub!",
        });
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.error("Install prompt error:", err);
    }
  };

  const handleSendTestNotification = async () => {
    setIsTestSending(true);
    setStatusMessage(null);
    const res = await triggerTestPushNotification();
    setStatusMessage({
      type: res.success ? "success" : "error",
      text: res.message,
    });
    setIsTestSending(false);
  };

  const handleTriggerDueReminders = async () => {
    setIsDueSending(true);
    setStatusMessage(null);
    const res = await triggerDueReminders();
    setStatusMessage({
      type: res.success ? "success" : "error",
      text: res.message,
    });
    setIsDueSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-[fadeIn_150ms_ease-out]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-xl glass-panel bg-slate-900/95 dark:bg-slate-950/95 border border-white/10 shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-glow-brand">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-white">
                App & Notification Settings
              </h2>
              <p className="text-xs text-white/60">
                Configure PWA installation and spaced recall reminders
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="glass-btn p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar">
          {/* Status Message Banner */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs sm:text-sm font-medium flex items-start gap-2.5 transition-all ${
                statusMessage.type === "success"
                  ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                  : statusMessage.type === "error"
                  ? "bg-rose-500/15 border border-rose-500/30 text-rose-300"
                  : "bg-indigo-500/15 border border-indigo-500/30 text-indigo-300"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 size={18} className="shrink-0 text-emerald-400 mt-0.5" />
              ) : statusMessage.type === "error" ? (
                <AlertTriangle size={18} className="shrink-0 text-rose-400 mt-0.5" />
              ) : (
                <Bell size={18} className="shrink-0 text-indigo-400 mt-0.5" />
              )}
              <div className="flex-1">{statusMessage.text}</div>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-white/40 hover:text-white/80"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* SECTION 1: PUSH NOTIFICATION REMINDERS */}
          <div className="glass-panel p-4.5 rounded-xl border border-white/10 space-y-4 bg-white/[0.03]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    pushEnabled
                      ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                      : "bg-white/5 text-white/50 border border-white/10"
                  }`}
                >
                  {pushEnabled ? <BellRing size={20} /> : <BellOff size={20} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm sm:text-base text-white">
                      Spaced Recall Reminders
                    </h3>
                    {pushEnabled && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/60 mt-0.5 leading-relaxed">
                    Get notified when topics and concepts are due for review — even when RecallHub is closed.
                  </p>
                </div>
              </div>

              {/* Master Toggle Switch */}
              <button
                role="switch"
                aria-checked={pushEnabled}
                disabled={loadingPush}
                onClick={handleTogglePush}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                  pushEnabled ? "bg-brand-600" : "bg-slate-700"
                } ${loadingPush ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    pushEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* iOS Non-Standalone Notification Warning */}
            {isIos && !standalone && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <p className="font-semibold">iOS Requirement:</p>
                  <p className="text-amber-300/80 mt-0.5">
                    Apple requires installing RecallHub to your Home Screen before push reminders can be enabled. Follow the installation steps below.
                  </p>
                </div>
              </div>
            )}

            {/* Browser Permission Denied Warning */}
            {typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "denied" && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-rose-300">
                    <AlertTriangle size={15} />
                    <span>Notifications are blocked in your browser</span>
                  </div>
                  <p className="text-rose-300/80 text-[11px]">
                    To enable reminders: Click the lock / settings icon on the left of the URL bar → Permissions → Set Notifications to <strong>Allow</strong>, then refresh.
                  </p>
                </div>
              )}

            {/* Push Action Controls */}
            {pushEnabled && (
              <div className="pt-2 border-t border-white/5 flex flex-wrap gap-2">
                <button
                  onClick={handleSendTestNotification}
                  disabled={isTestSending}
                  className="glass-btn px-3 py-1.5 rounded-lg text-xs font-medium text-white/90 hover:text-white flex items-center gap-1.5 hover:bg-white/10 active:scale-95 transition-all"
                >
                  <RefreshCw
                    size={13}
                    className={isTestSending ? "animate-spin text-brand-400" : "text-brand-400"}
                  />
                  <span>{isTestSending ? "Sending Test..." : "Send Test Notification"}</span>
                </button>

                <button
                  onClick={handleTriggerDueReminders}
                  disabled={isDueSending}
                  className="glass-btn px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-300 hover:text-white flex items-center gap-1.5 hover:bg-brand-500/20 active:scale-95 transition-all border-brand-500/30"
                >
                  <Sparkles
                    size={13}
                    className={isDueSending ? "animate-spin text-indigo-400" : "text-indigo-400"}
                  />
                  <span>{isDueSending ? "Checking..." : "Trigger Due Reminders"}</span>
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: PWA APP INSTALLATION */}
          <div className="glass-panel p-4.5 rounded-xl border border-white/10 space-y-3.5 bg-white/[0.03]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                {isIos ? <Smartphone size={20} /> : <Laptop size={20} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm sm:text-base text-white">
                    PWA App Installation
                  </h3>
                  {standalone && (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Installed
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/60 mt-0.5 leading-relaxed">
                  Install RecallHub on your device for a fast, full-screen native desktop or mobile experience.
                </p>
              </div>
            </div>

            {/* Case 1: Running in standalone mode */}
            {standalone ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                <span>
                  RecallHub is currently running in standalone app mode.
                </span>
              </div>
            ) : isIos ? (
              /* Case 2: iOS Safari Instructions */
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2.5 text-xs text-white/80">
                <div className="font-semibold text-white flex items-center gap-1.5">
                  <Smartphone size={15} className="text-brand-400" />
                  <span>How to install on iPhone & iPad (Safari):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-white/70 text-[12px] leading-relaxed">
                  <li>
                    Tap the <strong>Share</strong> button{" "}
                    <span className="inline-flex items-center px-1.5 py-0.5 bg-white/10 rounded text-white text-[10px]">
                      <Share2 size={11} className="inline mr-1" /> Share
                    </span>{" "}
                    in Safari's bottom toolbar.
                  </li>
                  <li>
                    Scroll down and tap{" "}
                    <strong className="text-white">Add to Home Screen</strong>.
                  </li>
                  <li>
                    Tap <strong className="text-white">Add</strong> in the top right to complete installation.
                  </li>
                </ol>
              </div>
            ) : deferredPrompt ? (
              /* Case 3: Chromium / Edge Native Prompt Available */
              <div className="pt-1">
                <button
                  onClick={handleInstallClick}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-medium text-xs sm:text-sm shadow-glow-brand flex items-center justify-center gap-2 transition-transform active:scale-98"
                >
                  <Download size={16} />
                  <span>Install RecallHub on this Device</span>
                </button>
              </div>
            ) : (
              /* Case 4: General installation guidance */
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 flex items-center justify-between">
                <span>
                  To install, click the Install icon in your browser's address bar (Chrome/Edge) or browser menu.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-white/10 bg-slate-900/60 flex items-center justify-between text-xs text-white/50">
          <span>RecallHub Spaced Recall Engine</span>
          <button
            onClick={onClose}
            className="glass-btn px-4 py-1.5 rounded-lg text-white/80 hover:text-white font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
