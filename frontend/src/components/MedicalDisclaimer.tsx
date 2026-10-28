import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface Props {
  compact?: boolean;
}

export const MedicalDisclaimer: React.FC<Props> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200/90 flex items-center space-x-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
        <p>
          <strong className="text-amber-300">Research Prototype Only:</strong> Not a medical diagnostic tool. Outputs are experimental statistical classifications.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-5 text-amber-100 shadow-lg relative overflow-hidden">
      <div className="flex items-start space-x-3.5">
        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 shrink-0 mt-0.5">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1.5 text-sm">
          <h4 className="font-semibold text-amber-300 text-base flex items-center gap-2">
            Educational & Research Safety Disclaimer
          </h4>
          <p className="text-amber-200/80 leading-relaxed">
            This platform is an academic research and machine learning engineering demonstration trained on the 
            <strong> UCI Parkinson's Disease Voice Dataset</strong> (Max Little et al.). The classification results generated 
            here reflect experimental voice perturbation models and <strong>must not be used to diagnose, rule out, or manage 
            Parkinson's disease</strong>. 
          </p>
          <p className="text-amber-300/90 text-xs font-medium">
            Always seek the advice of a qualified neurologist or physician with any questions regarding medical conditions or clinical symptoms.
          </p>
        </div>
      </div>
    </div>
  );
};

