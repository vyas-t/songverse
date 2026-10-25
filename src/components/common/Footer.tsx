import React from 'react';
import { Music, ShieldCheck, Cookie, Cpu, Lock } from 'lucide-react';

interface FooterProps {
  onOpenLegal: (tab?: string) => void;
  onOpenCookies: () => void;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenLegal,
  onOpenCookies,
  onOpenAdmin
}) => {
  return (
    <footer className="bg-sv-midnight text-slate-400 text-xs border-t border-sv-burgundy mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* Col 1: Brand & Purpose */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-sv-red to-sv-orange flex items-center justify-center text-white shadow-xs">
                <Music className="w-3.5 h-3.5" />
              </div>
              <span>SongVerse</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              A global, accessible song guessing trivia platform. Test your ear against 1s, 3s, 5s, and 10s audio excerpts across international genres and decades.
            </p>
            <div className="text-[11px] text-slate-400">
              Zero unlicensed commercial streaming scraping. Powered exclusively by authorized open music archives.
            </div>
          </div>

          {/* Col 2: Game Modes */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wide uppercase mb-3">
              Gameplay
            </h4>
            <ul className="space-y-2">
              <li>
                <span className="text-slate-400 hover:text-white transition-colors cursor-default">
                  Classic 4-Level Mode
                </span>
              </li>
              <li>
                <span className="text-slate-400 hover:text-white transition-colors cursor-default">
                  Daily Seeded Challenge
                </span>
              </li>
              <li>
                <span className="text-slate-400 hover:text-white transition-colors cursor-default">
                  Private Multiplayer Rooms
                </span>
              </li>
              <li>
                <span className="text-slate-400 hover:text-white transition-colors cursor-default">
                  Decade & Genre Discovery
                </span>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Privacy Centre */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wide uppercase mb-3">
              Legal & Privacy
            </h4>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onOpenLegal('privacy')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Privacy Policy (DPDP & GDPR)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal('terms')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Terms of Service
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal('copyright')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Music Copyright & Attribution
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal('community')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Community Guidelines
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenLegal('deletion')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Account & Data Deletion
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Transparency */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wide uppercase mb-3">
              Preferences & System
            </h4>
            <div className="space-y-2">
              <button
                onClick={onOpenCookies}
                className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer text-slate-300"
              >
                <Cookie className="w-3.5 h-3.5 text-sv-warm-orange" />
                Cookie Preferences
              </button>
              <button
                onClick={() => onOpenLegal('disclaimer')}
                className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer text-slate-300"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Service Disclaimer
              </button>
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer text-slate-300"
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Admin & 18-Test Runner (Private)
              </button>
            </div>
            <p className="mt-4 text-[11px] text-slate-400 leading-normal">
              Audio synthesized & streamed according to W3C Web Audio API standards.
            </p>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div>
            © {new Date().getFullYear()} SongVerse Platform. All rights reserved. Non-commercial trivia implementation.
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => onOpenLegal('privacy')} className="hover:text-slate-300">
              Privacy
            </button>
            <span>·</span>
            <button onClick={() => onOpenLegal('terms')} className="hover:text-slate-300">
              Terms
            </button>
            <span>·</span>
            <button onClick={onOpenCookies} className="hover:text-slate-300">
              Cookies
            </button>
            <span>·</span>
            <button onClick={onOpenAdmin} className="text-sv-gold hover:text-sv-warm-orange">
              Diagnostics
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
