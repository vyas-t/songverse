import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Disc3,
  Shield,
  RotateCcw,
  X,
  FileCheck2,
  Calendar,
  Download,
  Upload,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  FileSpreadsheet,
  Search,
  Database,
  Layers,
  Globe,
  RefreshCw,
  Pause,
  Square,
  Radio,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { AutomatedTestResult, Track, CSVImportValidationResult } from '../../types';
import { runAutomatedTestSuite } from '../../services/gameTests';
import { musicCatalogue } from '../../services/musicCatalogue';

interface AdminPanelProps {
  onClose: () => void;
}

interface CatalogueStats {
  totalUniqueRecords: number;
  playableRecords: number;
  metadataOnlyRecords: number;
  byLanguage: Record<string, { total: number; playable: number; metadataOnly: number }>;
  byGenre: Record<string, number>;
  bySource: Record<string, number>;
  lastUpdated: string;
  backupFileExists: boolean;
}

interface ImportJobStatus {
  jobId: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'cancelled' | 'error';
  presetId?: string;
  currentQuery: string;
  queryList: string[];
  queryIndex: number;
  offset: number;
  limitPerPage: number;
  totalFound: number;
  importedCount: number;
  updatedCount: number;
  duplicateCount: number;
  errorCount: number;
  logs: Array<{ timestamp: string; level: 'info' | 'warn' | 'error'; message: string }>;
  startedAt?: string;
  lastActivityAt?: string;
  completedAt?: string;
}

interface ImportPreset {
  id: string;
  name: string;
  language: string;
  country: string;
  queries: string[];
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  // Admin access gate
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('songverse_admin_auth') === 'ABHI0810';
  });
  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [activeTab, setActiveTab] = useState<'catalogue' | 'metrics' | 'imports' | 'migration' | 'tests' | 'csv' | 'daily'>('catalogue');
  const [testResults, setTestResults] = useState<AutomatedTestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Live Catalogue Browser State
  const [catalogueTracks, setCatalogueTracks] = useState<any[]>([]);
  const [catalogueTotal, setCatalogueTotal] = useState(0);
  const [cataloguePage, setCataloguePage] = useState(1);
  const [cataloguePageSize] = useState(12);
  const [catalogueTotalPages, setCatalogueTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('ALL');
  const [playbackFilter, setPlaybackFilter] = useState<'all' | 'verified_audio' | 'metadata_only'>('all');
  const [isLoadingCatalogue, setIsLoadingCatalogue] = useState(false);

  // Live Metrics State
  const [stats, setStats] = useState<CatalogueStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Import State
  const [importStatus, setImportStatus] = useState<ImportJobStatus | null>(null);
  const [importPresets, setImportPresets] = useState<ImportPreset[]>([]);
  const [customImportQuery, setCustomImportQuery] = useState('');
  const [customImportLang, setCustomImportLang] = useState('English');
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [isImportActionPending, setIsImportActionPending] = useState(false);

  // Migration & Plan State
  const [migrationPlan, setMigrationPlan] = useState<any | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // CSV State
  const [csvInputText, setCsvInputText] = useState('');
  const [csvResult, setCsvResult] = useState<CSVImportValidationResult | null>(null);
  const [isDryRun, setIsDryRun] = useState(false);

  // Daily seed inspector
  const [dailyDateInspect, setDailyDateInspect] = useState(new Date().toISOString().split('T')[0]);

  const adminHeaders = {
    'x-admin-key': 'ABHI0810',
    'Content-Type': 'application/json'
  };

  // Fetch Catalogue
  const fetchCatalogue = async () => {
    setIsLoadingCatalogue(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (languageFilter !== 'ALL') params.set('language', languageFilter);
      if (playbackFilter !== 'all') params.set('playbackStatus', playbackFilter);
      params.set('page', String(cataloguePage));
      params.set('pageSize', String(cataloguePageSize));

      const res = await fetch(`/api/catalogue/tracks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCatalogueTracks(data.items || []);
        setCatalogueTotal(data.total || 0);
        setCatalogueTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching catalogue:', err);
    } finally {
      setIsLoadingCatalogue(false);
    }
  };

  // Fetch Stats
  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch('/api/catalogue/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Fetch Import Status
  const fetchImportStatus = async () => {
    try {
      const res = await fetch('/api/admin/catalogue/import/status', {
        headers: adminHeaders
      });
      if (res.ok) {
        const data = await res.json();
        setImportStatus(data.status);
        if (data.presets) setImportPresets(data.presets);
      }
    } catch (err) {
      console.error('Error fetching import status:', err);
    }
  };

  // Fetch Migration Plan
  const fetchMigrationPlan = async () => {
    try {
      const res = await fetch('/api/admin/catalogue/plan', {
        headers: adminHeaders
      });
      if (res.ok) {
        const data = await res.json();
        setMigrationPlan(data);
      }
    } catch (err) {
      console.error('Error fetching migration plan:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'catalogue') {
      fetchCatalogue();
    } else if (activeTab === 'metrics') {
      fetchStats();
    } else if (activeTab === 'imports') {
      fetchImportStatus();
    } else if (activeTab === 'migration') {
      fetchMigrationPlan();
    }
  }, [activeTab, cataloguePage, languageFilter, playbackFilter]);

  // Polling for running import job
  useEffect(() => {
    let interval: any;
    if (activeTab === 'imports' && importStatus?.status === 'running') {
      interval = setInterval(() => {
        fetchImportStatus();
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [activeTab, importStatus?.status]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPinInput.trim() === 'ABHI0810') {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('songverse_admin_auth', 'ABHI0810');
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('songverse_admin_auth');
    setIsAdminAuthenticated(false);
    setAdminPinInput('');
  };

  const handleRunTests = async () => {
    setIsRunningTests(true);
    try {
      const results = await runAutomatedTestSuite();
      setTestResults(results);
    } catch (err) {
      console.error('Error running test suite:', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleStartPresetImport = async (presetId: string) => {
    setIsImportActionPending(true);
    setImportNotice(null);
    try {
      const res = await fetch('/api/admin/catalogue/import/start', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ presetId, limitPerPage: 10 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Import error');
      setImportStatus(data.status);
      setImportNotice(`Started background import for preset "${presetId}". MusicBrainz rate limiter active.`);
    } catch (err: any) {
      setImportNotice(`Error: ${err.message}`);
    } finally {
      setIsImportActionPending(false);
    }
  };

  const handleStartCustomImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customImportQuery.trim()) return;
    setIsImportActionPending(true);
    setImportNotice(null);
    try {
      const res = await fetch('/api/admin/catalogue/import/start', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ query: customImportQuery, language: customImportLang, limitPerPage: 10 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Import error');
      setImportStatus(data.status);
      setImportNotice(`Started import for "${customImportQuery}".`);
    } catch (err: any) {
      setImportNotice(`Error: ${err.message}`);
    } finally {
      setIsImportActionPending(false);
    }
  };

  const handlePauseImport = async () => {
    setIsImportActionPending(true);
    try {
      const res = await fetch('/api/admin/catalogue/import/pause', { method: 'POST', headers: adminHeaders });
      const data = await res.json();
      setImportStatus(data.status);
    } catch (err) {
      console.error(err);
    } finally {
      setIsImportActionPending(false);
    }
  };

  const handleResumeImport = async () => {
    setIsImportActionPending(true);
    try {
      const res = await fetch('/api/admin/catalogue/import/resume', { method: 'POST', headers: adminHeaders });
      const data = await res.json();
      setImportStatus(data.status);
    } catch (err) {
      console.error(err);
    } finally {
      setIsImportActionPending(false);
    }
  };

  const handleCancelImport = async () => {
    setIsImportActionPending(true);
    try {
      const res = await fetch('/api/admin/catalogue/import/cancel', { method: 'POST', headers: adminHeaders });
      const data = await res.json();
      setImportStatus(data.status);
    } catch (err) {
      console.error(err);
    } finally {
      setIsImportActionPending(false);
    }
  };

  const handleBackupCatalogue = async () => {
    setIsBackingUp(true);
    setBackupMessage(null);
    try {
      const res = await fetch('/api/admin/catalogue/backup', { method: 'POST', headers: adminHeaders });
      const data = await res.json();
      if (data.success) {
        setBackupMessage(`Catalogue backed up successfully (${data.count} records saved to ${data.filePath}).`);
        fetchMigrationPlan();
      }
    } catch (err: any) {
      setBackupMessage(`Backup failed: ${err.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCataloguePage(1);
    fetchCatalogue();
  };

  const handleExportCSV = () => {
    const csvContent = musicCatalogue.exportToCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `songverse_catalogue_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRunCSVImport = () => {
    if (!csvInputText.trim()) return;
    const result = musicCatalogue.importFromCSV(csvInputText, isDryRun);
    setCsvResult(result);
    fetchCatalogue();
  };

  const passedTestsCount = testResults.filter(t => t.passed).length;

  if (!isAdminAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white dark:bg-sv-burgundy-deep border border-slate-200 dark:border-sv-burgundy rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-sv-amber flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-sv-warm-orange uppercase tracking-wider bg-sv-warm-orange/10 px-2 py-0.5 rounded">
              Restricted System Area
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Admin & 18-Test Runner
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              This console is private and restricted. Please enter the authorized access code to unlock system controls and automated test runner.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Authorized Access Code
              </label>
              <input
                type="password"
                value={adminPinInput}
                onChange={(e) => {
                  setAdminPinInput(e.target.value);
                  if (pinError) setPinError(false);
                }}
                placeholder="Enter access code"
                className={`w-full px-4 py-3 rounded-xl border text-sm font-mono tracking-widest bg-slate-50 dark:bg-sv-navy text-slate-900 dark:text-white focus:outline-none transition-all ${
                  pinError
                    ? 'border-rose-500 ring-1 ring-rose-500'
                    : 'border-slate-300 dark:border-sv-burgundy focus:border-sv-red'
                }`}
                autoFocus
              />
              {pinError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium mt-1">
                  <span>Invalid access code. Please enter the authorized code.</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-sv-navy rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-sv-red hover:bg-sv-crimson text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-sv-red/20 flex items-center gap-2"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Authenticate & Enter</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Global Song Catalogue & Ingestion Console
                </h2>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-semibold flex items-center gap-1">
                  <Unlock className="w-3 h-3" /> Admin Mode (ABHI0810)
                </span>
              </div>
              <p className="text-xs text-slate-500">
                MusicBrainz Ingestion, Live Catalogue Browser, Decoupled Rights Audit & 24 Acceptance Tests
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAdminLogout}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Lock Admin Console"
            >
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>Lock</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-4 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('catalogue')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'catalogue' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Catalogue Browser ({catalogueTotal || '...'})</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'metrics' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Catalogue Metrics & Stats</span>
          </button>

          <button
            onClick={() => setActiveTab('imports')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'imports' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>MusicBrainz Ingestion {importStatus?.status === 'running' && '●'}</span>
          </button>

          <button
            onClick={() => setActiveTab('migration')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'migration' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Safety & Migration Plan</span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'tests' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Automated Tests ({testResults.length ? `${passedTestsCount}/${testResults.length}` : '24 Ready'})</span>
          </button>

          <button
            onClick={() => setActiveTab('csv')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'csv' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>CSV Batch Import</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 text-left">
          
          {/* TAB 1: Searchable Catalogue Browser */}
          {activeTab === 'catalogue' && (
            <div className="space-y-4">
              <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by title, artist, album, MBID UUID..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <select
                  value={languageFilter}
                  onChange={(e) => {
                    setLanguageFilter(e.target.value);
                    setCataloguePage(1);
                  }}
                  className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                >
                  <option value="ALL">All Languages</option>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Korean">Korean</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="Portuguese">Portuguese</option>
                  <option value="German">German</option>
                  <option value="Zulu">Zulu</option>
                </select>

                <select
                  value={playbackFilter}
                  onChange={(e) => {
                    setPlaybackFilter(e.target.value as any);
                    setCataloguePage(1);
                  }}
                  className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                >
                  <option value="all">All Rights Tiers</option>
                  <option value="verified_audio">Playable (Verified Audio)</option>
                  <option value="metadata_only">Metadata Only (Protected)</option>
                </select>

                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Search
                </button>
              </form>

              {/* Status Header */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>
                  Showing {catalogueTracks.length} of {catalogueTotal} unique songs
                </span>
                <button
                  onClick={handleExportCSV}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export View as CSV
                </button>
              </div>

              {/* Tracks List */}
              {isLoadingCatalogue ? (
                <div className="p-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  <p className="text-xs">Loading catalogue records...</p>
                </div>
              ) : catalogueTracks.length === 0 ? (
                <div className="p-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-xs">No tracks found matching query. Try clearing filters or importing from MusicBrainz.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                  {catalogueTracks.map((t) => (
                    <div key={t.id} className="p-3 bg-white hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${t.artworkGradient || 'from-indigo-600 to-purple-700'} flex items-center justify-center text-white shrink-0`}>
                          <Disc3 className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span>{t.title}</span>
                            {t.playbackStatus === 'verified_audio' ? (
                              <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-sans font-bold">
                                Playable Audio
                              </span>
                            ) : (
                              <span className="text-[9px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-sans font-medium">
                                Metadata Only
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 font-mono">
                              {t.providerTrackId?.slice(0, 8)}...
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px] truncate">
                            {t.artist} · {t.album || 'Single'} · {t.language} · {t.releaseYear || '—'} · {t.country || 'Global'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-semibold text-slate-700">
                          {t.licenceType || 'ODbL-1.0'}
                        </div>
                        <div className="text-[9px] text-slate-400 max-w-[200px] truncate">
                          {t.source || 'musicbrainz'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination Controls */}
              {catalogueTotalPages > 1 && (
                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    disabled={cataloguePage <= 1}
                    onClick={() => setCataloguePage(p => Math.max(1, p - 1))}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                  <span className="text-slate-500">
                    Page {cataloguePage} of {catalogueTotalPages}
                  </span>
                  <button
                    disabled={cataloguePage >= catalogueTotalPages}
                    onClick={() => setCataloguePage(p => Math.min(catalogueTotalPages, p + 1))}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Metrics Dashboard */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              {isLoadingStats || !stats ? (
                <div className="p-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  <p className="text-xs">Computing live catalogue metrics...</p>
                </div>
              ) : (
                <>
                  {/* Top 3 KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Unique Records</div>
                      <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{stats.totalUniqueRecords}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Enforced by MBID & Title/Artist constraints</div>
                    </div>

                    <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Playable Records (Verified)</div>
                      <div className="text-2xl font-bold text-emerald-800 mt-1 tabular-nums">{stats.playableRecords}</div>
                      <div className="text-[11px] text-emerald-600 mt-0.5">Authorized for 4-level gameplay synthesis</div>
                    </div>

                    <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">Metadata-Only (Protected)</div>
                      <div className="text-2xl font-bold text-amber-800 mt-1 tabular-nums">{stats.metadataOnlyRecords}</div>
                      <div className="text-[11px] text-amber-600 mt-0.5">Commercial audio protected; excluded from rounds</div>
                    </div>
                  </div>

                  {/* Language Distribution Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                      <span>Global Language Coverage</span>
                      <span className="text-[11px] text-slate-500 font-normal">{Object.keys(stats.byLanguage).length} Languages Represented</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                      {Object.entries(stats.byLanguage).map(([lang, counts]) => (
                        <div key={lang} className="px-4 py-2.5 flex items-center justify-between text-xs bg-white hover:bg-slate-50/50">
                          <span className="font-semibold text-slate-900">{lang}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-emerald-700 font-medium">{counts.playable} Playable</span>
                            <span className="text-amber-700 font-medium">{counts.metadataOnly} Metadata</span>
                            <span className="text-slate-400 font-bold w-12 text-right">{counts.total} total</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sources Breakdown */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
                    <div className="font-bold text-slate-800">Source Provider Distribution</div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {Object.entries(stats.bySource).map(([src, count]) => (
                        <span key={src} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono text-[11px]">
                          {src}: <strong className="text-indigo-600">{count}</strong>
                        </span>
                      ))}
                    </div>
                    <div className="text-[11px] text-slate-400 pt-1">
                      Backup File: {stats.backupFileExists ? '✓ Confirmed active on disk (/data/catalogue_backup_pre_migration.json)' : 'None'}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: MusicBrainz Background Ingestion */}
          {activeTab === 'imports' && (
            <div className="space-y-6">
              
              {/* Compliance banner */}
              <div className="p-4 bg-indigo-50/80 border border-indigo-200/80 rounded-2xl text-xs text-indigo-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <span>MusicBrainz Official Ingestion Guidelines & Rate Limits</span>
                </div>
                <p className="text-indigo-700 text-[11px] leading-relaxed">
                  MusicBrainz enforces a strict 1 request per second rate limit and User-Agent identification. All imported tracks are licensed under the Open Database License (ODbL) 1.0 as encyclopedic metadata. In strict compliance with SongVerse copyright rules, commercial audio recordings are not scraped or fabricated.
                </p>
              </div>

              {/* Status Display */}
              {importStatus && (
                <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        importStatus.status === 'running' ? 'bg-emerald-500 animate-pulse' :
                        importStatus.status === 'paused' ? 'bg-amber-500' :
                        importStatus.status === 'completed' ? 'bg-blue-500' : 'bg-slate-400'
                      }`} />
                      <span className="font-bold text-xs text-slate-900 uppercase">
                        Job Status: {importStatus.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {importStatus.status === 'running' && (
                        <button
                          onClick={handlePauseImport}
                          disabled={isImportActionPending}
                          className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Pause className="w-3 h-3" /> Pause
                        </button>
                      )}
                      {importStatus.status === 'paused' && (
                        <button
                          onClick={handleResumeImport}
                          disabled={isImportActionPending}
                          className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3" /> Resume
                        </button>
                      )}
                      {(importStatus.status === 'running' || importStatus.status === 'paused') && (
                        <button
                          onClick={handleCancelImport}
                          disabled={isImportActionPending}
                          className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Square className="w-3 h-3" /> Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Counters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Imported</div>
                      <div className="text-base font-bold text-emerald-700 tabular-nums">{importStatus.importedCount}</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Duplicates Skipped</div>
                      <div className="text-base font-bold text-amber-700 tabular-nums">{importStatus.duplicateCount}</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Updated</div>
                      <div className="text-base font-bold text-indigo-700 tabular-nums">{importStatus.updatedCount}</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-xl">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Errors</div>
                      <div className="text-base font-bold text-rose-700 tabular-nums">{importStatus.errorCount}</div>
                    </div>
                  </div>

                  {/* Logs window */}
                  {importStatus.logs && importStatus.logs.length > 0 && (
                    <div className="bg-slate-900 rounded-xl p-3 text-[10px] font-mono text-slate-300 max-h-36 overflow-y-auto space-y-1">
                      {importStatus.logs.slice(-10).map((l, i) => (
                        <div key={i} className="truncate">
                          <span className="text-slate-500">[{l.timestamp.split('T')[1].slice(0, 8)}]</span>{' '}
                          <span className={l.level === 'error' ? 'text-rose-400' : l.level === 'warn' ? 'text-amber-400' : 'text-emerald-400'}>
                            {l.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {importNotice && (
                <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-700 font-medium">
                  {importNotice}
                </div>
              )}

              {/* Ingestion Presets */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Verified Global Target Presets
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {importPresets.map((preset) => (
                    <div key={preset.id} className="p-3 border border-slate-200 rounded-xl flex items-center justify-between gap-3 bg-white">
                      <div>
                        <div className="font-bold text-xs text-slate-900">{preset.name}</div>
                        <div className="text-[11px] text-slate-500">{preset.queries.length} artist targets · {preset.country}</div>
                      </div>
                      <button
                        onClick={() => handleStartPresetImport(preset.id)}
                        disabled={isImportActionPending || importStatus?.status === 'running'}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        Import
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Ingestion Query */}
              <form onSubmit={handleStartCustomImport} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="font-bold text-xs text-slate-900">Custom Lucene Ingestion Query</div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={customImportQuery}
                    onChange={(e) => setCustomImportQuery(e.target.value)}
                    placeholder='e.g. artist:"The Weeknd" or recording:"Blinding Lights"'
                    className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                  />
                  <select
                    value={customImportLang}
                    onChange={(e) => setCustomImportLang(e.target.value)}
                    className="text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Telugu">Telugu</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Korean">Korean</option>
                    <option value="Spanish">Spanish</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isImportActionPending || importStatus?.status === 'running'}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Run Import
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: Safety & Migration Plan */}
          {activeTab === 'migration' && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Catalogue Migration & Safety Policy</h3>
                    <p className="text-xs text-slate-500">Explicit confirmation barrier before destructive operations.</p>
                  </div>
                  <button
                    onClick={handleBackupCatalogue}
                    disabled={isBackingUp}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isBackingUp ? 'Backing up...' : 'Create Instant Backup'}</span>
                  </button>
                </div>

                {backupMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium">
                    {backupMessage}
                  </div>
                )}

                {migrationPlan && (
                  <div className="space-y-3 pt-2 text-xs">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Safety Guarantee</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {migrationPlan.safetyGuarantee}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 bg-white border border-slate-200 rounded-xl">
                        <span className="font-bold text-slate-800">Backup Status</span>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          {migrationPlan.backupConfirmed ? `✓ Backup confirmed at ${migrationPlan.backupLocation}` : 'No backup found.'}
                        </p>
                      </div>

                      <div className="p-3 bg-white border border-slate-200 rounded-xl">
                        <span className="font-bold text-slate-800">Playable Tracks Preserved</span>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          {migrationPlan.playableTracksPreserved} verified authorized tracks preserved for gameplay.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900">
                      <span className="font-bold">Proposed Deletion Policy</span>
                      <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
                        {migrationPlan.deletionProposed}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Automated 24-Test Runner */}
          {activeTab === 'tests' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    SongVerse Core Acceptance Test Suite
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tests 4-level scoring (100, 70, 40, 20), skip mechanics, audio bounds, guest mode, and account deletion.
                  </p>
                </div>

                <button
                  onClick={handleRunTests}
                  disabled={isRunningTests}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-2 shrink-0"
                >
                  {isRunningTests ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Running Suite...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>Execute All Tests</span>
                    </>
                  )}
                </button>
              </div>

              {testResults.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold px-1">
                    <span className="text-slate-600">
                      Results: <strong className="text-emerald-700">{passedTestsCount} Passed</strong>, <strong className="text-rose-700">{testResults.length - passedTestsCount} Failed</strong>
                    </span>
                    <span className="text-slate-400 font-mono">
                      Duration: {testResults.reduce((acc, t) => acc + t.durationMs, 0)}ms
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
                    {testResults.map((t) => (
                      <div key={t.id} className="p-3 bg-white flex items-start gap-3 text-xs">
                        {t.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">
                              #{t.scenarioNumber}. {t.title}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {t.durationMs}ms
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            {t.details}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  <FileCheck2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Click &quot;Execute All Tests&quot; to run verification assertions.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CSV Ingestion */}
          {activeTab === 'csv' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Bulk CSV Catalogue Import
                  </h3>
                  <p className="text-xs text-slate-500">
                    Import metadata records with client-side syntax and duplicate verification.
                  </p>
                </div>
              </div>

              <textarea
                value={csvInputText}
                onChange={(e) => setCsvInputText(e.target.value)}
                placeholder='title,artist,album,language,genre,releaseYear,country,playbackStatus,licenceType,attributionText&#10;"Sample Track","Artist Name","Album Title","English","Indie Pop",2024,"United States","metadata_only","Creative Commons 0","Attribution text"'
                rows={6}
                className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDryRun}
                    onChange={(e) => setIsDryRun(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Dry Run (Validate without inserting)</span>
                </label>

                <button
                  onClick={handleRunCSVImport}
                  disabled={!csvInputText.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  Process CSV
                </button>
              </div>

              {csvResult && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                  <div className="font-bold text-slate-900">CSV Processed Results:</div>
                  <div>Valid rows: {csvResult.validRows.length}</div>
                  <div>Duplicates skipped: {csvResult.duplicateCount}</div>
                  <div>Inserted: {csvResult.importedCount}</div>
                  {csvResult.invalidRows.length > 0 && (
                    <div className="text-rose-600">Errors in {csvResult.invalidRows.length} rows.</div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
