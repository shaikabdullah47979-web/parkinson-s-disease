import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { PredictionPage } from './pages/PredictionPage';
import { LiveMovementPage } from './pages/LiveMovementPage';
import { ModelMetricsPage } from './pages/ModelMetricsPage';
import { DatasetPage } from './pages/DatasetPage';
import { PredictionHistoryPage } from './pages/PredictionHistoryPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100 selection:bg-sky-500 selection:text-white">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
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
    </BrowserRouter>
  );
};

export default App;

