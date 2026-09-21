// Fabric.js dynamic loader and type definitions helper

export async function getFabric(): Promise<any> {
  if (typeof window !== "undefined" && (window as any).fabric) {
    return (window as any).fabric;
  }

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window is not defined"));
      return;
    }

    // Check if already in script tag
    const existing = document.querySelector('script[src*="fabric"]');
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).fabric));
      existing.addEventListener("error", (e) => reject(e));
      if ((window as any).fabric) {
        resolve((window as any).fabric);
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js";
    script.async = true;
    script.onload = () => {
      resolve((window as any).fabric);
    };
    script.onerror = (e) => {
      reject(new Error("Failed to load Fabric.js from CDN"));
    };
    document.head.appendChild(script);
  });
}
