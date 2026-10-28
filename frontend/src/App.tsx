import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { TopHeader } from './components/TopHeader';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { PredictionPage } from './pages/PredictionPage';
import { LiveMovementPage } from './pages/LiveMovementPage';
import { ModelMetricsPage } from './pages/ModelMetricsPage';
import { DatasetPage } from './pages/DatasetPage';
import { PredictionHistoryPage } from './pages/PredictionHistoryPage';

export const App: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex">
        {/* Left Sticky Sidebar (Desktop & Mobile Drawer) */}
        <Navbar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Area (Offset by 256px on lg screens) */}
        <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
          <TopHeader onToggleMobileSidebar={() => setMobileSidebarOpen(true)} />

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/predict" element={<PredictionPage />} />
              <Route path="/movement" element={<LiveMovementPage />} />
              <Route path="/models" element={<ModelMetricsPage />} />
              <Route path="/dataset" element={<DatasetPage />} />
              <Route path="/history" element={<PredictionHistoryPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          <Footer />
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
