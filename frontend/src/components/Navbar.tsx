import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, BarChart2, Database, Brain, History, CheckCircle2, AlertCircle, Video } from 'lucide-react';
import { api } from '../services/api';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [modelOnline, setModelOnline] = useState<boolean | null>(null);

  const checkStatus = async () => {
    try {
      const res = await api.getHealth();
      setModelOnline(res.ml_model_ready);
    } catch {
      setModelOnline(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const navLinks = [
    { to: '/', label: 'Overview', icon: Activity },
    { to: '/dashboard', label: 'Dashboard', icon: BarChart2 },
    { to: '/predict', label: 'Predictor', icon: Brain },
    { to: '/movement', label: 'Live Movement Test', icon: Video },
    { to: '/models', label: 'Model Metrics', icon: BarChart2 },
    { to: '/dataset', label: 'Dataset', icon: Database },
    { to: '/history', label: 'History', icon: History }
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 p-0.5 shadow-md group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <Brain className="w-5 h-5 text-sky-400" />
            </div>
          </div>
          <div>
            <span className="font-bold text-base text-white tracking-tight flex items-center gap-1.5">
              NeuroVoice <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full font-mono border border-sky-500/30">ML Research</span>
            </span>
            <p className="text-xs text-slate-400 hidden sm:block">Parkinson's Dysphonia Analysis Platform</p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side: Status */}
        <div className="flex items-center space-x-3">
          {/* Model Health Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 border border-slate-700">
            {modelOnline === true ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Model Ready</span>
              </>
            ) : modelOnline === false ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-300">Model Offline</span>
              </>
            ) : (
              <span className="text-slate-400">Connecting...</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

