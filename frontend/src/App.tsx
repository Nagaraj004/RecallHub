import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";

const LoginPage = lazy(() => import("./pages/Login/LoginPage"));
const DashboardPage = lazy(() => import("./pages/Dashboard/DashboardPage"));
const CategoriesPage = lazy(() => import("./pages/Categories/CategoriesPage"));
const KnowledgeDetailPage = lazy(() => import("./pages/KnowledgeDetail/KnowledgeDetailPage"));
const RecallSessionPage = lazy(() => import("./pages/RecallSession/RecallSessionPage"));
const ReviewQueuePage = lazy(() => import("./pages/ReviewQueue/ReviewQueuePage"));
const PracticePage = lazy(() => import("./pages/Practice/PracticePage"));

function PageLoadingFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <span className="text-xs text-slate-400 font-medium">Loading page...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/knowledge/:id" element={<KnowledgeDetailPage />} />
            <Route path="/recall/:id" element={<RecallSessionPage />} />
            <Route path="/reviews" element={<ReviewQueuePage />} />
            <Route path="/practice" element={<PracticePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
