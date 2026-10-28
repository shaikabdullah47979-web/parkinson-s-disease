import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface Props {
  compact?: boolean;
}

export const MedicalDisclaimer: React.FC<Props> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-center space-x-2.5 shadow-xs">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
        <p>
          <strong className="font-semibold text-amber-950">Research Screening Prototype:</strong> Outputs are computational classifications based on experimental biomedical telemetry and do not constitute a clinical medical diagnosis.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-5 text-amber-950 shadow-xs relative overflow-hidden">
      <div className="flex items-start space-x-3.5">
        <div className="p-2 bg-amber-100/80 rounded-xl text-amber-700 shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="space-y-1 text-sm">
          <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2">
            Clinical Research & Screening Disclaimer
          </h4>
          <p className="text-amber-800/90 text-xs leading-relaxed">
            This platform is an academic research and machine learning engineering system trained on the 
            <strong> UCI Parkinson's Disease Voice Dataset</strong> (Max Little et al.) and real-time computer vision kinematics. 
            All classifications, risk probability indices, and kinematic measurements are investigational computational aids 
            and <strong>must not be used as a substitute for formal diagnosis by a licensed neurologist or physician</strong>.
          </p>
          <p className="text-amber-900/80 text-[11px] font-medium pt-0.5">
            Always consult a qualified healthcare professional regarding personal medical conditions or symptoms.
          </p>
        </div>
      </div>
    </div>
  );
};
