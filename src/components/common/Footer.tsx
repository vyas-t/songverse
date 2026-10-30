import React from 'react';
import { Music, ShieldCheck, Cookie, Cpu, Lock, Sparkles, Heart } from 'lucide-react';

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
    <footer className="bg-sv-midnight text-slate-400 text-xs border-t border-sv-burgundy/80 mt-24 relative overflow-hidden">
      {/* Subtle bottom ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-32 bg-gradient-to-t from-sv-burgundy/20 to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          {/* Col 1: Brand & Purpose */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2.5 text-white font-black text-lg">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sv-red to-sv-orange flex items-center justify-center text-white shadow-md shadow-sv-red/30">
                <Music className="w-4 h-4 fill-current" />
              </div>
              <span className="tracking-tight">SongVerse</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs font-medium">
              A global, accessible song guessing trivia platform. Test your ear against 1s, 3s, 5s, and 10s audio excerpts across international genres and decades.
            </p>
            <div className="text-[11px] text-slate-500 font-mono">
              Zero scraping. Exclusively cleared open music previews.
            </div>
          </div>

          {/* Col 2: Game Modes */}
          <div>
            <h4 className="text-white font-black text-xs tracking-wider uppercase mb-4 font-mono">
              Gameplay
            </h4>
            <ul className="space-y-2.5 font-medium">
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
            <h4 className="text-white font-black text-xs tracking-wider uppercase mb-4 font-mono">
              Legal & Privacy
            </h4>
            <ul className="space-y-2.5 font-medium">
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
            <h4 className="text-white font-black text-xs tracking-wider uppercase mb-4 font-mono">
              Preferences & System
            </h4>
            <div className="space-y-2.5 font-medium">
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
                Admin Diagnostics (Private)
              </button>
            </div>
            <p className="mt-4 text-[11px] text-slate-500 leading-normal">
              Audio synthesized & streamed according to W3C Web Audio API standards.
            </p>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div>
            © {new Date().getFullYear()} SongVerse Platform. All rights reserved. Non-commercial trivia implementation.
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => onOpenLegal('privacy')} className="hover:text-white cursor-pointer transition-colors">
              Privacy
            </button>
            <span>·</span>
            <button onClick={() => onOpenLegal('terms')} className="hover:text-white cursor-pointer transition-colors">
              Terms
            </button>
            <span>·</span>
            <button onClick={onOpenCookies} className="hover:text-white cursor-pointer transition-colors">
              Cookies
            </button>
            <span>·</span>
            <button onClick={onOpenAdmin} className="text-sv-gold hover:text-sv-warm-orange cursor-pointer transition-colors">
              Diagnostics
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};
