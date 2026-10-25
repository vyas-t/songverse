/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameMode, CookiePreferences } from './types';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { CookieBanner } from './components/common/CookieBanner';
import { LandingPage } from './components/landing/LandingPage';
import { LanguageSelectionView } from './components/game/LanguageSelectionView';
import { GameView } from './components/game/GameView';
import { DailyChallengeView } from './components/daily/DailyChallengeView';
import { MultiplayerView } from './components/multiplayer/MultiplayerView';
import { DiscoveryView } from './components/discovery/DiscoveryView';
import { LeaderboardView } from './components/leaderboard/LeaderboardView';
import { ProfileView } from './components/profile/ProfileView';
import { LegalCentre } from './components/legal/LegalCentre';
import { AdminPanel } from './components/admin/AdminPanel';
import { AuthModal } from './components/auth/AuthModal';
import { gameEngine } from './services/gameEngine';
import { privacyConsent } from './services/privacyConsent';
import { audioEngine } from './services/audioEngine';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('landing');
  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [userProfile, setUserProfile] = useState(gameEngine.getUserProfile());
  const [cookiePrefs, setCookiePrefs] = useState<CookiePreferences>(privacyConsent.getPreferences());

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalInitialTab, setLegalInitialTab] = useState('privacy');
  const [cookieModalOpen, setCookieModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);


  useEffect(() => {
    const unsubCookies = privacyConsent.subscribe((prefs) => {
      setCookiePrefs(prefs);
    });
    return () => unsubCookies();
  }, []);

  const refreshProfile = () => {
    setUserProfile(gameEngine.getUserProfile());
  };

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('songverse_preferred_languages_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback
    }
    return ['English'];
  });

  const handleNavigate = (view: string, mode?: GameMode) => {
    audioEngine.stop();
    if (mode) setGameMode(mode);
    setCurrentView(view);
    refreshProfile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartPlay = (mode: GameMode = 'classic') => {
    audioEngine.stop();
    setGameMode(mode);
    setCurrentView('language_select');
    refreshProfile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartGameWithLanguages = (languages: string[]) => {
    audioEngine.stop();
    setSelectedLanguages(languages);
    setCurrentView('game');
    refreshProfile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLegal = (tab: string = 'privacy') => {
    setLegalInitialTab(tab);
    setLegalModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] dark:bg-sv-navy text-slate-900 dark:text-slate-100 font-sans selection:bg-sv-red/20 selection:text-sv-red transition-colors">
      
      {/* Top 3-Zone Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        userScore={userProfile.totalScore}
        streak={userProfile.currentStreak}
        isGuest={userProfile.isGuest}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'landing' && (
          <LandingPage
            onStartPlay={handleStartPlay}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'language_select' && (
          <LanguageSelectionView
            onStartGame={handleStartGameWithLanguages}
            onBackToHome={() => handleNavigate('landing')}
          />
        )}

        {currentView === 'game' && (
          <GameView
            mode={gameMode}
            selectedLanguages={selectedLanguages}
            onChangeLanguages={() => {
              setCurrentView('language_select');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigateHome={() => handleNavigate('landing')}
            onNavigateLeaderboard={() => handleNavigate('leaderboard')}
          />
        )}

        {currentView === 'daily' && (
          <DailyChallengeView
            onStartDaily={() => handleStartPlay('daily')}
            onNavigateLeaderboard={() => handleNavigate('leaderboard')}
          />
        )}

        {currentView === 'multiplayer' && (
          <MultiplayerView
            onOpenAuth={() => setAuthModalOpen(true)}
            onNavigateHome={() => handleNavigate('landing')}
          />
        )}

        {currentView === 'discovery' && (
          <DiscoveryView />
        )}

        {currentView === 'leaderboard' && (
          <LeaderboardView />
        )}

        {currentView === 'profile' && (
          <ProfileView
            onDataReset={refreshProfile}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Global Accessible Footer */}
      <Footer
        onOpenLegal={handleOpenLegal}
        onOpenCookies={() => setCookieModalOpen(true)}
        onOpenAdmin={() => setAdminModalOpen(true)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => refreshProfile()}
      />


      {/* Cookie Consent Banner & Modal */}
      <CookieBanner
        preferences={cookiePrefs}
        onAcceptAll={() => privacyConsent.acceptAll()}
        onRejectOptional={() => privacyConsent.rejectOptional()}
        onSaveCustom={(f, a) => privacyConsent.saveCustom(f, a)}
        isModalOpen={cookieModalOpen}
        onCloseModal={() => setCookieModalOpen(false)}
        onOpenModal={() => setCookieModalOpen(true)}
      />

      {/* Legal & Privacy Centre Modal */}
      {legalModalOpen && (
        <LegalCentre
          initialTab={legalInitialTab}
          onClose={() => setLegalModalOpen(false)}
          onOpenCookies={() => {
            setLegalModalOpen(false);
            setCookieModalOpen(true);
          }}
          onDataReset={refreshProfile}
        />
      )}

      {/* Administration & 18-Test Runner Modal */}
      {adminModalOpen && (
        <AdminPanel
          onClose={() => {
            setAdminModalOpen(false);
            refreshProfile();
          }}
        />
      )}

    </div>
  );
}
