
import React, { useState, useEffect } from 'react';
import { KeyIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('API_KEY');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleSave = () => {
    if (!apiKey.trim()) return;
    localStorage.setItem('API_KEY', apiKey.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleClear = () => {
    localStorage.removeItem('API_KEY');
    setApiKey('');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-3xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-slate-400">Configure your application preferences.</p>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 lg:p-12 space-y-8">
        <div className="flex items-start space-x-6">
          <div className="bg-blue-600/10 p-4 rounded-2xl text-blue-500 shrink-0">
            <KeyIcon className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Google Gemini API Key</h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-lg">
              To analyze your workout screenshots, this app uses Google's Gemini Vision models. 
              Since this is a client-side application, you need to provide your own API Key.
            </p>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center space-x-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors mt-2"
            >
              <span>Get a free API Key</span>
              <ArrowTopRightOnSquareIcon className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="bg-slate-950 rounded-2xl p-2 flex items-center border border-slate-800 focus-within:border-blue-500 transition-colors">
          <input 
            type={isVisible ? "text" : "password"} 
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your key here (starts with AIza...)"
            className="bg-transparent w-full px-4 py-3 text-white placeholder-slate-600 outline-none font-mono text-sm"
          />
          <button 
            onClick={() => setIsVisible(!isVisible)}
            className="p-3 text-slate-500 hover:text-white transition-colors"
          >
            {isVisible ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex items-center justify-between pt-4">
          <button 
            onClick={handleClear}
            className="text-slate-500 text-sm font-medium hover:text-red-400 transition-colors px-4"
          >
            Clear Key
          </button>
          <button 
            onClick={handleSave}
            className={`
              flex items-center space-x-2 px-8 py-3 rounded-xl font-bold transition-all
              ${isSaved 
                ? 'bg-emerald-500 text-white' 
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-900/20'}
            `}
          >
            {isSaved ? (
              <>
                <CheckCircleIcon className="w-5 h-5" />
                <span>Saved</span>
              </>
            ) : (
              <span>Save Configuration</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
