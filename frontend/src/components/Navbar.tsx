import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  BrainCircuit,
  Footprints,
  BarChart3,
  Database,
  History,
  X,
  Activity,
  ShieldCheck
} from 'lucide-react';

interface Props {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Navbar: React.FC<Props> = ({ mobileOpen, onCloseMobile }) => {
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Overview', icon: Home },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/predict', label: 'Predictor', icon: BrainCircuit },
    { to: '/movement', label: 'Live Movement Test', icon: Footprints },
    { to: '/models', label: 'Model Metrics', icon: BarChart3 },
    { to: '/dataset', label: 'Dataset', icon: Database },
    { to: '/history', label: 'History', icon: History }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Header */}
          <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
            <Link to="/" onClick={onCloseMobile} className="flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-xl bg-navy-800 text-white flex items-center justify-center shadow-sm">
                <Activity className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <span className="font-bold text-base text-navy-800 tracking-tight flex items-center gap-1.5">
                  NeuroVoice
                </span>
                <span className="text-[10px] text-teal-700 font-medium tracking-wide uppercase block -mt-0.5">
                  Clinical ML Platform
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3.5 space-y-1">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Clinical Navigation
            </div>
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-navy-800 font-semibold border-l-4 border-teal-500 shadow-xs'
                      : 'text-slate-600 hover:text-navy-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-teal-700' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Metadata */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/60">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <div>
              <span className="font-semibold text-slate-800 block text-[11px]">UCI Research Engine</span>
              <span className="text-[10px] text-slate-500">v1.0.0 • Scikit-Learn</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
