import React, { useState } from 'react';
import {
  Shield,
  FileText,
  Cookie,
  Users,
  Music,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Mail,
  CheckCircle2,
  X
} from 'lucide-react';
import { gameEngine } from '../../services/gameEngine';

interface LegalCentreProps {
  initialTab?: string;
  onClose: () => void;
  onOpenCookies: () => void;
  onDataReset: () => void;
}

export const LegalCentre: React.FC<LegalCentreProps> = ({
  initialTab = 'privacy',
  onClose,
  onOpenCookies,
  onDataReset
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactMessage.trim()) return;
    setContactSubmitted(true);
    setContactMessage('');
  };

  const navItems = [
    { id: 'privacy', label: 'Privacy Policy', icon: Shield },
    { id: 'cookies', label: 'Cookie Policy', icon: Cookie },
    { id: 'terms', label: 'Terms of Service', icon: FileText },
    { id: 'copyright', label: 'Music Copyright & Attribution', icon: Music },
    { id: 'community', label: 'Community Guidelines', icon: Users },
    { id: 'deletion', label: 'Account & Data Deletion', icon: Trash2 },
    { id: 'thirdparty', label: 'Third-Party Disclosures', icon: ExternalLink },
    { id: 'disclaimer', label: 'Service Disclaimer', icon: AlertTriangle },
    { id: 'contact', label: 'Privacy & Rights Requests', icon: Mail }
  ];

  return (
    <div className="sv-modal-viewport fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      
      <div className="sv-modal-surface bg-white dark:bg-sv-midnight rounded-3xl max-w-5xl w-full h-[calc(100dvh-1.5rem)] sm:h-[90dvh] shadow-2xl border border-slate-200 dark:border-sv-burgundy flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 text-slate-900 dark:text-slate-100">
        
        {/* Left Sidebar / Table of Contents */}
        <aside className="w-full md:w-72 bg-slate-50 dark:bg-sv-burgundy-deep/70 border-b md:border-b-0 md:border-r border-slate-200 dark:border-sv-burgundy p-4 sm:p-6 flex flex-col justify-between shrink-0 overflow-y-auto">
          
          <div className="space-y-4">
            <div>
              <div className="text-[11px] font-bold text-sv-red dark:text-sv-warm-orange uppercase tracking-wider font-mono">
                Legal & Policy Centre
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                SongVerse Governance
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Version 2026.1 · Updated Oct 2026
              </p>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setContactSubmitted(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-sv-red to-sv-orange text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-sv-burgundy/50'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-sv-burgundy/60 text-[11px] text-slate-400 dark:text-slate-400">
            Compliant with DPDP Act 2023, GDPR, and W3C Web Audio standards.
          </div>

        </aside>

        {/* Right Content Area */}
        <main className="flex-1 p-6 sm:p-10 overflow-y-auto relative text-left bg-white dark:bg-sv-midnight text-slate-700 dark:text-slate-200">
          
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-sv-burgundy/50 transition-colors"
            aria-label="Close Legal Center"
          >
            <X className="w-5 h-5" />
          </button>

          {/* TAB 1: Privacy Policy */}
          {activeTab === 'privacy' && (
            <div className="prose prose-slate dark:prose-invert max-w-none space-y-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                SongVerse Privacy Policy
              </h2>
              <div className="text-slate-400 dark:text-slate-400 text-[11px]">
                Effective Date: October 19, 2026 · Policy Reference: SV-POL-PRIV-01
              </div>

              <p>
                SongVerse (&quot;we&quot;, &quot;our&quot;, or &quot;the platform&quot;) operates an interactive international song-guessing trivia game. We are firmly dedicated to transparency, privacy by design, and data minimization. We do not sell user data, track you across the internet, or require personal credentials for casual gameplay.
              </p>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                1. Data Minimization & Information We Process
              </h3>
              <p>
                <strong>Guest Gameplay Data:</strong> When playing as a guest, no name, email, phone number, location, or biometric data is ever collected or transmitted. A random client identifier is generated and saved exclusively in your browser’s local storage to track round progress and streaks.
              </p>
              <p>
                <strong>Device & Network Data:</strong> To deliver authorized audio clips and protect against denial-of-service attempts, our hosting infrastructure may temporarily process standard HTTP request logs (IP address, user agent). These logs are retained for no longer than 14 days and are not tied to gameplay identities.
              </p>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                2. Legal Basis & International Regulatory Compliance
              </h3>
              <p>
                <strong>India Digital Personal Data Protection Act (DPDP Act, 2023):</strong> Processing is based on user consent and legitimate operational requirements for trivia state management. Data fiduciaries ensure zero unnecessary data collection.
              </p>
              <p>
                <strong>EU General Data Protection Regulation (GDPR) & UK GDPR:</strong> Processing of gameplay preferences relies on Article 6(1)(a) (Consent) and Article 6(1)(f) (Legitimate interests for game security and anti-cheat validation).
              </p>
              <p>
                <strong>California Consumer Privacy Act (CCPA):</strong> We do not sell or share personal information as defined by California privacy statutes.
              </p>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                3. Your Rights & Instant Deletion
              </h3>
              <p>
                You possess full rights to inspect, correct, and completely erase your game history at any moment. Simply visit your Profile or the &quot;Account & Data Deletion&quot; tab in this centre to purge all local storage in one click.
              </p>
            </div>
          )}

          {/* TAB 2: Cookie Policy */}
          {activeTab === 'cookies' && (
            <div className="prose prose-slate dark:prose-invert max-w-none space-y-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Cookie & Local Storage Policy
              </h2>
              <div className="text-slate-400 dark:text-slate-400 text-[11px]">
                Version 2026.1 · Strict Consent Discipline
              </div>

              <p>
                SongVerse employs browser storage technologies (HTML5 LocalStorage and essential session tokens) exclusively to deliver the trivia experience. We do not use third-party advertising cookies or cross-domain tracking pixels.
              </p>

              <div className="border border-slate-200 dark:border-sv-burgundy rounded-xl overflow-hidden my-4">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-sv-navy/80 border-b border-slate-200 dark:border-sv-burgundy text-slate-700 dark:text-slate-200 font-bold">
                    <tr>
                      <th className="p-3">Category</th>
                      <th className="p-3">Purpose</th>
                      <th className="p-3">Default State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-sv-burgundy/50">
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">Strictly Necessary</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">Preserves active round state, scores, audio buffer references, and room memberships.</td>
                      <td className="p-3 text-sv-red dark:text-sv-warm-orange font-semibold">Active (Mandatory)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">Functional Preferences</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">Stores custom player handle, avatar seed, and audio playback volume.</td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">Requires User Consent</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">Anonymous Analytics</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300">Aggregated level difficulty statistics to balance trivia progression.</td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">Requires User Consent</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pt-2">
                <button
                  onClick={onOpenCookies}
                  className="px-4 py-2 bg-gradient-to-r from-sv-red to-sv-orange hover:from-sv-crimson hover:to-sv-red text-white rounded-xl font-semibold cursor-pointer shadow-xs"
                >
                  Open Cookie Preference Manager
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Terms of Service */}
          {activeTab === 'terms' && (
            <div className="prose prose-slate dark:prose-invert max-w-none space-y-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Terms of Service
              </h2>
              <div className="text-slate-400 dark:text-slate-400 text-[11px]">
                Last Revised: October 2026
              </div>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                1. Acceptance & Eligibility
              </h3>
              <p>
                By accessing or playing SongVerse, you agree to these Terms. If you do not agree, you must discontinue use of the platform. SongVerse is accessible for general audiences; players under the age of majority in their jurisdiction should play with parental guidance.
              </p>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                2. Trivia Gameplay & Scoring Integrity
              </h3>
              <p>
                All points (Level 1: 100, Level 2: 70, Level 3: 40, Level 4: 20) are calculated authoritatively by the game engine state machine. Any attempt to modify client scripts, inject artificial HTTP submissions, scrape target song keys, or exploit multiplayer lobbies is prohibited and will result in invalidation of leaderboard standings.
              </p>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                3. Service Availability & Catalogue Limitations
              </h3>
              <p>
                We do not warrant that SongVerse contains every song ever recorded. Catalogue selection is subject to open licensing, audio provenance, and regional availability. We reserve the right to modify, replace, or rotate catalogue tracks at our discretion.
              </p>
            </div>
          )}

          {/* TAB 4: Music Copyright & Attribution */}
          {activeTab === 'copyright' && (
            <div className="prose prose-slate dark:prose-invert max-w-none space-y-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Music Copyright & Attribution Policy
              </h2>
              <div className="text-slate-400 dark:text-slate-400 text-[11px]">
                Full Open Music Provenance & DMCA Notice
              </div>

              <p>
                SongVerse respects intellectual property and artistic rights. We strictly prohibit the unauthorized scraping, ripping, or circumventing of commercial streaming platforms (including Spotify, Apple Music, or YouTube Music).
              </p>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                1. Sourcing & Authorizations
              </h3>
              <p>
                All gameplay audio assets in the SongVerse MVP are sourced exclusively from:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Creative Commons Zero (CC0) Public Domain Dedications.</li>
                <li>Creative Commons Attribution 4.0 International (CC-BY 4.0) licensed archives.</li>
                <li>Historical Open Audio Preservation Archives.</li>
                <li>Procedurally synthesized harmonic motifs generated via the W3C Web Audio API.</li>
              </ul>

              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                2. Copyright Notice & Takedown Requests
              </h3>
              <p>
                If you are a copyright owner or legal representative and believe that any audio excerpt or metadata entry on SongVerse infringes your rights, please submit a notice via our &quot;Privacy & Rights Requests&quot; tab. We will review and disable any disputed track within 48 hours.
              </p>
            </div>
          )}

          {/* TAB 5: Community Guidelines */}
          {activeTab === 'community' && (
            <div className="prose prose-slate dark:prose-invert max-w-none space-y-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Community Guidelines
              </h2>
              <p>
                SongVerse is designed as a welcoming, playful, international community for music lovers of all ages.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Fair Play:</strong> Do not use automated bots, browser automation, or song recognition software (Shazam/SoundHound) during competitive daily or multiplayer matches.</li>
                <li><strong>Respectful Display Names:</strong> Offensive, hateful, or harassing handles are forbidden and will be removed.</li>
                <li><strong>Room Codes:</strong> Do not spam or broadcast private multiplayer room codes into unauthorized channels.</li>
              </ul>
            </div>
          )}

          {/* TAB 6: Account & Data Deletion */}
          {activeTab === 'deletion' && (
            <div className="prose prose-slate dark:prose-invert max-w-none space-y-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Account & Data Deletion Policy
              </h2>
              <p>
                Under DPDP Act 2023, GDPR Article 17, and CCPA guidelines, you have an unconditional right to the complete erasure of your personal data.
              </p>
              <p>
                Because SongVerse prioritizes guest privacy, all profile data, stats, achievements, and cookie preferences reside directly within your browser. You can permanently delete this data immediately below:
              </p>

              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-5 space-y-3">
                <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  Instant Self-Serve Data Purge
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300">
                  This will immediately erase your profile, best score, streak, history, and cookie choices from this device. This operation cannot be undone.
                </p>
                <button
                  onClick={() => {
                    gameEngine.clearAllUserData();
                    onDataReset();
                    onClose();
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold cursor-pointer text-xs transition-colors shadow-xs"
                >
                  Permanently Delete All My Data Now
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: Third-Party Disclosures */}
          {activeTab === 'thirdparty' && (
            <div className="prose prose-slate dark:prose-invert max-w-none space-y-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Third-Party Services Disclosure
              </h2>
              <p>
                SongVerse integrates only with verified, secure providers:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Google Cloud / Cloud Run:</strong> Provides secure HTTPS hosting infrastructure and execution sandboxing.</li>
                <li><strong>Google Fonts:</strong> Provides typography stylesheets (Plus Jakarta Sans). No IP tracking data is shared.</li>
                <li><strong>W3C Web Audio API:</strong> Processes client-side sound synthesis entirely inside your browser memory with zero network roundtrips.</li>
              </ul>
            </div>
          )}

          {/* TAB 8: Disclaimer & Availability */}
          {activeTab === 'disclaimer' && (
            <div className="prose prose-slate dark:prose-invert max-w-none space-y-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Service Disclaimer & Catalogue Scope
              </h2>
              <p>
                SongVerse is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis for trivia entertainment and music discovery.
              </p>
              <p>
                <strong>Catalogue Coverage:</strong> SongVerse does not claim to index all commercial tracks globally. Availability depends on verified licensing, public domain dedications, and streaming permissions.
              </p>
              <p>
                <strong>Pre-Launch Notice:</strong> Full commercial production rollout will be preceded by comprehensive legal review of music publishing catalogues.
              </p>
            </div>
          )}

          {/* TAB 9: Contact & Rights Requests */}
          {activeTab === 'contact' && (
            <div className="prose prose-slate dark:prose-invert max-w-none space-y-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Privacy, Copyright & Support Inquiries
              </h2>
              <p>
                Submit any data access requests, copyright inquiries, or bug reports directly through this form:
              </p>

              {contactSubmitted ? (
                <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="font-bold">Inquiry Dispatched Successfully</div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      Our privacy and compliance team will review your inquiry within 48 hours.
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4 max-w-md">
                  <div>
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      Your Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-sv-navy/70 border border-slate-200 dark:border-sv-burgundy rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-sv-midnight focus:outline-none focus:border-sv-red dark:focus:border-sv-warm-orange transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      Nature of Request / Inquiries
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Detail your privacy right request, copyright notice, or catalogue feedback..."
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-sv-navy/70 border border-slate-200 dark:border-sv-burgundy rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-sv-midnight focus:outline-none focus:border-sv-red dark:focus:border-sv-warm-orange transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-sv-red to-sv-orange hover:from-sv-crimson hover:to-sv-red text-white rounded-xl font-semibold cursor-pointer shadow-xs transition-colors"
                  >
                    Submit Official Request
                  </button>
                </form>
              )}
            </div>
          )}

        </main>

      </div>

    </div>
  );
};
