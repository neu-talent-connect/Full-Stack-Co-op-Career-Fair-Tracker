'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/Button';
import { X, Upload, Trash2 } from 'lucide-react';
import { AppData } from '@/types';
import { notifyLocalStorageChange } from '@/hooks/useLocalStorage';

const STORAGE_KEY = 'careerFairData';
const MIGRATION_DISMISSED_KEY = 'migrationDismissed';

export function MigrateDataModal() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const isAuthenticated = !!user;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [localData, setLocalData] = useState<AppData | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;

    // Check if migration was already dismissed
    const dismissed = localStorage.getItem(MIGRATION_DISMISSED_KEY);
    if (dismissed) return;

    // Check if there's local data to migrate
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const data: AppData = JSON.parse(stored);
      const hasData =
        data.jobs?.length > 0 ||
        data.contacts?.length > 0 ||
        data.companies?.length > 0 ||
        data.followups?.length > 0 ||
        data.interviews?.length > 0 ||
        data.researchContacts?.length > 0;

      if (hasData) {
        setLocalData(data);
        setShowModal(true);
      }
    } catch (err) {
      console.error('Error checking local data:', err);
    }
  }, [isAuthenticated, authLoading]);

  const handleMigrate = async () => {
    if (!localData) return;

    setIsMigrating(true);
    setError(null);

    // Each entity is migrated record-by-record, and localStorage is rewritten
    // after EVERY successful POST — closing the tab mid-migration leaves only
    // the not-yet-saved records behind, so a retry can't create duplicates.
    // Jobs go first so interviews can reference their server-assigned ids.
    const entities: { key: keyof AppData; url: string; label: string }[] = [
      { key: 'jobs', url: '/api/jobs', label: 'jobs' },
      { key: 'contacts', url: '/api/contacts', label: 'contacts' },
      { key: 'companies', url: '/api/companies', label: 'companies' },
      { key: 'followups', url: '/api/followups', label: 'follow-ups' },
      { key: 'interviews', url: '/api/interviews', label: 'interviews' },
      { key: 'researchContacts', url: '/api/research', label: 'research contacts' },
    ];

    // Working copy: successfully saved records are removed as we go.
    const pending: AppData = {
      jobs: [...(localData.jobs ?? [])],
      contacts: [...(localData.contacts ?? [])],
      companies: [...(localData.companies ?? [])],
      followups: [...(localData.followups ?? [])],
      interviews: [...(localData.interviews ?? [])],
      researchContacts: [...(localData.researchContacts ?? [])],
    };
    const failures: string[] = [];
    // Guest job id -> server-assigned id, for remapping interview.jobId.
    const jobIdMap = new Map<string, string>();

    const persistPending = () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
      // Same-tab write: keep the provider's useLocalStorage state in sync so a
      // later guest edit can't write the stale pre-migration snapshot back.
      notifyLocalStorageChange(STORAGE_KEY);
    };

    try {
      for (const { key, url, label } of entities) {
        const items = [...(pending[key] as { id?: string; jobId?: string }[])];
        let failed = 0;

        for (const item of items) {
          // Interviews reference a job by id; the migrated job has a new
          // server id. If the job itself hasn't migrated yet, defer the
          // interview to the next retry instead of saving a dangling id.
          let body: Record<string, unknown> = item;
          if (key === 'interviews' && item.jobId) {
            const mappedId = jobIdMap.get(item.jobId);
            if (!mappedId && pending.jobs.some(j => j.id === item.jobId)) {
              failed++;
              continue;
            }
            body = { ...item, jobId: mappedId ?? item.jobId };
          }

          let ok = false;
          let created: { id?: string } | null = null;
          try {
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            });
            ok = res.ok;
            if (ok) created = await res.json().catch(() => null);
          } catch {
            ok = false;
          }

          if (ok) {
            if (key === 'jobs' && item.id && created?.id) {
              jobIdMap.set(item.id, created.id);
            }
            const arr = pending[key] as unknown[];
            const idx = arr.indexOf(item);
            if (idx !== -1) arr.splice(idx, 1);
            persistPending();
          } else {
            failed++;
          }
        }

        if (failed > 0) failures.push(`${failed} ${label}`);
      }

      const anyRemaining = entities.some(
        (e) => (pending[e.key] as unknown[]).length > 0
      );

      if (anyRemaining) {
        // Partial success: localStorage already holds only the unmigrated
        // records; keep the modal open so the user can retry. Do NOT mark
        // migration dismissed.
        setLocalData({ ...pending });
        setError(
          `Saved everything except: ${failures.join(', ')}. These are still stored on this device — please try again.`
        );
      } else {
        // Full success: everything is in the account now.
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(MIGRATION_DISMISSED_KEY, 'true');
        notifyLocalStorageChange(STORAGE_KEY);
        setShowModal(false);
        window.location.reload(); // Reload to fetch from API
      }
    } catch (err) {
      console.error('Error migrating data:', err);
      setError('Failed to migrate data. Please try again.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(MIGRATION_DISMISSED_KEY, 'true');
    setShowModal(false);
  };

  const handleDiscardClick = () => {
    // Two-step confirm — this permanently deletes guest data with no undo.
    if (!confirmingDiscard) {
      setConfirmingDiscard(true);
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(MIGRATION_DISMISSED_KEY, 'true');
    // Sync the provider's in-memory guest snapshot, otherwise its next write
    // would resurrect the discarded data.
    notifyLocalStorageChange(STORAGE_KEY);
    setShowModal(false);
  };

  if (!showModal || !localData) return null;

  const jobsCount = localData.jobs?.length || 0;
  const contactsCount = localData.contacts?.length || 0;
  const companiesCount = localData.companies?.length || 0;
  const followupsCount = localData.followups?.length || 0;
  const interviewsCount = localData.interviews?.length || 0;
  const researchCount = localData.researchContacts?.length || 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="migrate-data-title"
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 id="migrate-data-title" className="text-2xl font-bold text-gray-900 dark:text-white">
              Save Your Data?
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              You have data from guest mode
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Data Summary */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            We found:
          </p>
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            {jobsCount > 0 && <li>• {jobsCount} job application{jobsCount !== 1 ? 's' : ''}</li>}
            {contactsCount > 0 && <li>• {contactsCount} contact{contactsCount !== 1 ? 's' : ''}</li>}
            {companiesCount > 0 && <li>• {companiesCount} compan{companiesCount !== 1 ? 'ies' : 'y'}</li>}
            {followupsCount > 0 && <li>• {followupsCount} follow-up{followupsCount !== 1 ? 's' : ''}</li>}
            {interviewsCount > 0 && <li>• {interviewsCount} interview{interviewsCount !== 1 ? 's' : ''}</li>}
            {researchCount > 0 && <li>• {researchCount} research contact{researchCount !== 1 ? 's' : ''}</li>}
          </ul>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleMigrate}
            disabled={isMigrating}
            className="w-full bg-northeastern-red hover:bg-red-700 text-white flex items-center justify-center gap-2"
          >
            {isMigrating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving to Account...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Save to My Account
              </>
            )}
          </Button>

          {confirmingDiscard && (
            <p className="text-xs text-red-600 dark:text-red-400 text-center px-2">
              This permanently deletes your guest data on this device and cannot be undone.
            </p>
          )}

          <Button
            onClick={handleDiscardClick}
            disabled={isMigrating}
            variant={confirmingDiscard ? 'danger' : 'outline'}
            className="w-full flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {confirmingDiscard ? 'Yes, permanently delete' : 'Discard Guest Data'}
          </Button>

          {confirmingDiscard ? (
            <button
              onClick={() => setConfirmingDiscard(false)}
              disabled={isMigrating}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Keep my data
            </button>
          ) : (
            <button
              onClick={handleDismiss}
              disabled={isMigrating}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Remind me later
            </button>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
          Your data will be securely saved to your account
        </p>
      </div>
    </div>
  );
}
