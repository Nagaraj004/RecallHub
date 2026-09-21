import React from "react";

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`glass-card p-5 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="skeleton-glass h-4 w-28 rounded-md" />
        <div className="skeleton-glass h-8 w-8 rounded-full" />
      </div>
      <div className="skeleton-glass h-8 w-20 rounded-md" />
      <div className="skeleton-glass h-3 w-3/4 rounded-md opacity-60" />
    </div>
  );
}

export function SkeletonRow({ className = "" }: { className?: string }) {
  return (
    <div className={`glass-card p-4 flex items-center justify-between space-x-4 ${className}`}>
      <div className="space-y-2 flex-1">
        <div className="skeleton-glass h-4 w-1/3 rounded-md" />
        <div className="skeleton-glass h-3 w-1/2 rounded-md opacity-60" />
      </div>
      <div className="skeleton-glass h-8 w-20 rounded-lg" />
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 space-y-4">
        <div className="skeleton-glass h-7 w-1/2 rounded-md" />
        <div className="skeleton-glass h-4 w-1/4 rounded-md opacity-60" />
        <div className="space-y-3 pt-4 border-t border-white/10">
          <div className="skeleton-glass h-4 w-full rounded-md" />
          <div className="skeleton-glass h-4 w-5/6 rounded-md" />
          <div className="skeleton-glass h-4 w-4/6 rounded-md" />
        </div>
      </div>
    </div>
  );
}
