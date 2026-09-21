import { apiClient } from "../api/client";

/**
 * Converts a base64url string to a Uint8Array for VAPID applicationServerKey
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Detects if the app is currently running in standalone (PWA installed) mode
 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

/**
 * Detects if current device is iOS (iPhone/iPad/iPod)
 */
export function isIosDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const userAgent = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || "";
  return /iPad|iPhone|iPod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
}

/**
 * Checks if Web Push and Service Worker are supported on this browser
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Registers the Service Worker at root scope
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return registration;
  } catch (err) {
    console.error("Service worker registration failed:", err);
    return null;
  }
}

/**
 * Gets the active PushSubscription object if one exists
 */
export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.warn("Could not check push subscription:", err);
    return null;
  }
}

/**
 * Full opt-in flow for Spaced Repetition Reminders:
 * 1. Verifies iOS standalone requirement
 * 2. Requests browser Notification permission
 * 3. Fetches VAPID public key from GET /push/vapid-public-key
 * 4. Subscribes via pushManager.subscribe()
 * 5. Saves subscription via POST /push/subscribe
 */
export async function subscribeToPushNotifications(): Promise<{
  success: boolean;
  message: string;
  subscription?: PushSubscription;
  permissionDenied?: boolean;
  requiresIosInstall?: boolean;
}> {
  if (!isPushSupported()) {
    return {
      success: false,
      message: "Push notifications are not supported on this browser.",
    };
  }

  // iOS Safari requirement check
  if (isIosDevice() && !isStandalone()) {
    return {
      success: false,
      message:
        "On iPhone / iPad, push notifications require adding RecallHub to your Home Screen first (Tap Share → Add to Home Screen).",
      requiresIosInstall: true,
    };
  }

  // 1. Request notification permission
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission === "denied") {
    return {
      success: false,
      message:
        "Notification permission was denied. Please allow notifications for RecallHub in your browser's site settings to receive review reminders.",
      permissionDenied: true,
    };
  }

  if (permission !== "granted") {
    return {
      success: false,
      message: "Notification permission was not granted.",
    };
  }

  try {
    // 2. Register / get ready service worker
    const reg = await navigator.serviceWorker.ready;

    // 3. Fetch VAPID public key from backend
    const vapidRes = await apiClient.get<{ public_key: string }>("/push/vapid-public-key");
    const vapidPublicKey = vapidRes.data.public_key;

    if (!vapidPublicKey) {
      throw new Error("No VAPID public key received from server");
    }

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    // 4. Subscribe with pushManager
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    // 5. Send subscription to backend
    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      throw new Error("Invalid push subscription object structure");
    }

    await apiClient.post("/push/subscribe", {
      endpoint: subJson.endpoint,
      keys: {
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      },
      user_agent: navigator.userAgent,
    });

    return {
      success: true,
      message: "Reminders enabled on this device!",
      subscription,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to activate push notifications";
    console.error("Failed to subscribe to push notifications:", err);
    return {
      success: false,
      message: errorMsg,
    };
  }
}

/**
 * Opt-out flow:
 * 1. Unsubscribes locally from pushManager
 * 2. Unregisters endpoint from backend DELETE /push/subscribe
 */
export async function unsubscribeFromPushNotifications(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    let endpoint: string | undefined;

    if (isPushSupported()) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        endpoint = sub.endpoint;
        await sub.unsubscribe();
      }
    }

    await apiClient.delete("/push/subscribe", {
      data: endpoint ? { endpoint } : {},
    });

    return {
      success: true,
      message: "Reminders disabled on this device.",
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Failed to disable push notifications";
    console.error("Failed to unsubscribe from push notifications:", err);
    return {
      success: false,
      message: errorMsg,
    };
  }
}

/**
 * Sends a live test push notification to verify OS-level notification delivery
 */
export async function triggerTestPushNotification(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const res = await apiClient.post<{ message: string }>("/push/test-notification");
    return {
      success: true,
      message: res.data.message || "Test notification dispatched!",
    };
  } catch (err: unknown) {
    const errorMsg =
      err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Failed to send test notification"
        : "Failed to send test notification";
    return {
      success: false,
      message: errorMsg,
    };
  }
}

/**
 * Triggers backend check for due reviews and dispatches reminders
 */
export async function triggerDueReminders(): Promise<{
  success: boolean;
  message: string;
  dueCount?: number;
}> {
  try {
    const res = await apiClient.post<{
      status: string;
      message?: string;
      due_items_count?: number;
      primary_item_title?: string;
    }>("/push/send-due-reminders");

    const dueCount = res.data.due_items_count ?? 0;
    const msg =
      dueCount > 0
        ? `Dispatched reminder for ${dueCount} due item(s) (${res.data.primary_item_title})!`
        : res.data.message || "No items currently due for review.";

    return {
      success: true,
      message: msg,
      dueCount,
    };
  } catch (err: unknown) {
    const errorMsg =
      err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail || "Failed to trigger reminders"
        : "Failed to trigger reminders";
    return {
      success: false,
      message: errorMsg,
    };
  }
}
