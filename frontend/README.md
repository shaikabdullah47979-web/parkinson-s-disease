# NeuroVoice Frontend Application

A medical research web application built with:
- **React 18** & **TypeScript**
- **Vite** for rapid bundling and development
- **Tailwind CSS** with a medical/clinical dark color palette
- **Lucide React** icons
- **Recharts** for metric visualization
- **React Router v6** for multi-page navigation

## Pages
1. **Overview / Landing Page** (`/`): Research overview, pipeline architecture, medical safety disclaimer.
2. **Dashboard** (`/dashboard`): Live backend telemetry, active model stats, confusion matrix counts.
3. **Acoustic Predictor** (`/predict`): 22-feature acoustic input form with presets for actual UCI dataset recordings (PD vs. Healthy).
4. **Model Performance** (`/models`): Candidate model benchmark comparison, held-out test confusion matrix, top predictive features bar chart, and data leakage discussion.
5. **Dataset Documentation** (`/dataset`): Searchable acoustic feature dictionary with means, stds, units, and citation.
6. **Prediction History & Auth** (`/history`): JWT registration and sign-in to view and manage personal prediction audit logs.

## Development Commands
```powershell
# Install dependencies
npm.cmd install

# Start Vite development server
npm.cmd run dev

# Build production bundle
npm.cmd run build
```

