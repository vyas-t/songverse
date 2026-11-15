import React, { useState } from 'react';
import { Cookie, X, Check, Shield } from 'lucide-react';
import { CookiePreferences } from '../../types';

interface CookieBannerProps {
  preferences: CookiePreferences;
  onAcceptAll: () => void;
  onRejectOptional: () => void;
  onSaveCustom: (functional: boolean, analytics: boolean) => void;
  isModalOpen: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
}

export const CookieBanner: React.FC<CookieBannerProps> = ({
  preferences,
  onAcceptAll,
  onRejectOptional,
  onSaveCustom,
  isModalOpen,
  onCloseModal,
  onOpenModal
}) => {
  const [functionalChecked, setFunctionalChecked] = useState(preferences.functional);
  const [analyticsChecked, setAnalyticsChecked] = useState(preferences.analytics);

  const handleSavePreferences = () => {
    onSaveCustom(functionalChecked, analyticsChecked);
    onCloseModal();
  };

  // If already chosen and modal is not explicitly triggered, show nothing
  const showBanner = !preferences.hasChosen && !isModalOpen;

  return (
    <>
      {/* Floating Bottom Notice */}
      {showBanner && (
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] md:left-auto md:right-6 md:max-w-md z-50 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xl shadow-slate-900/10 transition-all animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
              <Cookie className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">
                Privacy & Storage Preferences
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We use strictly necessary local storage for gameplay scores and session progress. You can optionally allow functional settings (sound, volume) and anonymous play analytics.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={onOpenModal}
              className="text-xs font-medium text-slate-600 hover:text-indigo-600 underline cursor-pointer"
            >
              Customize
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={onRejectOptional}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Reject Optional
              </button>
              <button
                onClick={onAcceptAll}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Detailed Modal */}
      {isModalOpen && (
        <div className="sv-modal-viewport fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="sv-modal-surface bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95">
            <button
              onClick={onCloseModal}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Privacy & Cookie Settings
                </h3>
                <p className="text-xs text-slate-500">
                  Manage how SongVerse stores preferences on your device.
                </p>
              </div>
            </div>

            <div className="space-y-4 my-6 divide-y divide-slate-100 text-xs">
              
              {/* Category 1: Essential */}
              <div className="pt-2 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <span>Strictly Necessary Storage</span>
                    <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-mono">
                      Always Required
                    </span>
                  </div>
                  <p className="text-slate-500 leading-relaxed">
                    Essential for local game state, audio buffer initialization, guest score recovery, and room matchmaking. Cannot be disabled.
                  </p>
                </div>
                <div className="shrink-0 pt-1">
                  <div className="w-8 h-5 bg-indigo-600 rounded-full flex items-center justify-end px-1 opacity-70 cursor-not-allowed">
                    <div className="w-3.5 h-3.5 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Category 2: Functional */}
              <div className="pt-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">
                    Functional Preferences
                  </div>
                  <p className="text-slate-500 leading-relaxed">
                    Remembers your audio synthesizer volume preference, preferred genres, and custom display name across visits.
                  </p>
                </div>
                <div className="shrink-0 pt-1">
                  <button
                    onClick={() => setFunctionalChecked(!functionalChecked)}
                    type="button"
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                      functionalChecked ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`block w-3.5 h-3.5 bg-white rounded-full transition-transform absolute top-0.75 ${
                        functionalChecked ? 'translate-x-4.5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Category 3: Analytics */}
              <div className="pt-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900">
                    Aggregated Gameplay Analytics
                  </div>
                  <p className="text-slate-500 leading-relaxed">
                    Anonymous round completion time and song difficulty metrics to balance the 4-level progression. No personal tracking or cross-site profiling.
                  </p>
                </div>
                <div className="shrink-0 pt-1">
                  <button
                    onClick={() => setAnalyticsChecked(!analyticsChecked)}
                    type="button"
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                      analyticsChecked ? 'bg-indigo-600' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`block w-3.5 h-3.5 bg-white rounded-full transition-transform absolute top-0.75 ${
                        analyticsChecked ? 'translate-x-4.5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={onRejectOptional}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Reject All Optional
              </button>
              <button
                onClick={handleSavePreferences}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
