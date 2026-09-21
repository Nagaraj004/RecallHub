import React from "react";
import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";
import BackgroundBlobs from "../common/BackgroundBlobs";

export default function AppLayout() {
  return (
    <div className="min-h-screen relative flex flex-col antialiased">
      {/* Background Animated Drift Mesh & Floating Blobs */}
      <BackgroundBlobs />

      {/* Top Fixed Glass Navigation */}
      <NavBar />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-1.5 sm:px-8 py-3 sm:py-8 pb-16">
        <Outlet />
      </main>
    </div>
  );
}
