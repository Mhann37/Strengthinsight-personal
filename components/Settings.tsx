
import React from 'react';
import { ShieldCheckIcon, CloudIcon } from '@heroicons/react/24/outline';

const Settings: React.FC = () => {
  return (
    <div className="space-y-8 animate-fadeIn max-w-3xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-slate-400">Configure your application preferences.</p>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 lg:p-12 space-y-8">
        <div className="flex items-start space-x-6">
          <div className="bg-emerald-500/10 p-4 rounded-2xl text-emerald-500 shrink-0">
            <ShieldCheckIcon className="w-8 h-8" />
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Security Configuration</h2>
            <div className="space-y-2 text-slate-400 text-sm leading-relaxed max-w-lg">
              <p>
                This application uses a secure <strong>Server-Side Architecture</strong>.
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2 text-slate-500">
                <li>API Keys are stored in <strong>Google Cloud Secret Manager</strong>.</li>
                <li>Processing logic is handled by <strong>Firebase Cloud Functions</strong>.</li>
                <li>No sensitive keys are exposed to the client browser.</li>
              </ul>
            </div>
            
            <div className="pt-4 flex items-center space-x-2 text-xs font-mono text-slate-600">
              <CloudIcon className="w-4 h-4" />
              <span>Region: us-central1 (Cloud Functions Gen 2)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
