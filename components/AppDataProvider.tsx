'use client';

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useLocalStorage, LOCAL_STORAGE_ERROR_EVENT } from '@/hooks/useLocalStorage';
import { useUndo } from '@/hooks/useUndo';
import { useToast } from '@/components/Toast';
import { AppData, Job, Company, Contact, FollowUp, Interview, ResearchContact } from '@/types';
import { generateId } from '@/lib/utils';

const STORAGE_KEY = 'careerFairData';
const MIGRATION_DISMISSED_KEY = 'migrationDismissed';
// Dispatched (e.g. by MigrateDataModal after a partial migration) to force an
// immediate refetch instead of leaving newly-saved records invisible until
// the next manual reload.
export const API_STALE_EVENT = 'career-tracker-api-stale';

const initialData: AppData = {
  companies: [],
  contacts: [],
  jobs: [],
  followups: [],
  interviews: [],
  researchContacts: [],
};

interface AppDataContextType {
  data: AppData;
  // Jobs
  addJob: (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Job>;
  updateJob: (id: string, updates: Partial<Job>) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  // Companies
  addCompany: (company: Omit<Company, 'id' | 'createdAt'>) => Promise<Company>;
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  // Contacts
  addContact: (contact: Omit<Contact, 'id' | 'createdAt'>) => Promise<Contact>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  // Follow-ups
  addFollowUp: (followup: Omit<FollowUp, 'id' | 'createdAt'>) => Promise<FollowUp>;
  updateFollowUp: (id: string, updates: Partial<FollowUp>) => Promise<void>;
  deleteFollowUp: (id: string) => Promise<void>;
  // Interviews
  addInterview: (interview: Omit<Interview, 'id' | 'createdAt'>) => Promise<Interview>;
  updateInterview: (id: string, updates: Partial<Interview>) => Promise<void>;
  deleteInterview: (id: string) => Promise<void>;
  // Research contacts
  addResearchContact: (contact: Omit<ResearchContact, 'id' | 'createdAt'>) => Promise<ResearchContact>;
  updateResearchContact: (id: string, updates: Partial<ResearchContact>) => Promise<void>;
  deleteResearchContact: (id: string) => Promise<void>;
  // Bulk
  loadSampleData: () => Promise<void>;
  // Undo
  undo: () => Promise<void>;
  canUndo: boolean;
  undoCount: number;
  // True while auth state or (for signed-in users) initial API data is loading
  isLoading: boolean;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const { addToUndoStack, popFromUndoStack, clearUndoStack, consumeIfMatches, canUndo, undoCount } = useUndo();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      // The undo item must not cross the guest/account boundary: restoring a
      // guest deletion into an account (or vice versa) inserts data that was
      // never owned by that side.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        clearUndoStack();
      }
      // On sign-out, drop the previous user's in-memory data and clear the
      // migration flag so the next guest on this browser is offered migration.
      if (event === 'SIGNED_OUT') {
        setApiData(initialData);
        try {
          localStorage.removeItem(MIGRATION_DISMISSED_KEY);
        } catch {
          // localStorage may be unavailable (SSR/private mode) — safe to ignore
        }
      }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAuthenticated = !!user;
  const isLoading = authLoading;

  // For guests: use localStorage
  const [localData, setLocalData] = useLocalStorage<AppData>(STORAGE_KEY, initialData);
  
  // For authenticated users: use state + API
  const [apiData, setApiData] = useState<AppData>(initialData);
  const [isApiLoading, setIsApiLoading] = useState(false);

  // Choose which data source to use
  const data = isAuthenticated ? apiData : localData;
  const setData = isAuthenticated ? setApiData : setLocalData;

  const { showToast } = useToast();

  // Surface localStorage read/write failures (quota exceeded, corrupt JSON)
  // instead of leaving them console-only.
  useEffect(() => {
    const onStorageError = (e: Event) => {
      const message = (e as CustomEvent).detail?.message;
      if (message) showToast(message, 'error');
    };
    window.addEventListener(LOCAL_STORAGE_ERROR_EVENT, onStorageError);
    return () => window.removeEventListener(LOCAL_STORAGE_ERROR_EVENT, onStorageError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Append a restored record only if it isn't already present — guards against
  // double-restore (toast UNDO followed by global undo) in guest mode.
  const appendUnlessExists = <T extends { id: string }>(list: T[], item: T): T[] =>
    list.some(x => x.id === item.id) ? list : [...list, item];

  // Fetch data from API on mount if authenticated, again on window focus (so
  // a second device's changes eventually show up), and whenever a
  // 'career-tracker-api-stale' event fires (e.g. after a partial migration
  // saves some records — see MigrateDataModal).
  // Each entity loads independently: a failed/transient fetch surfaces a clear
  // error instead of silently rendering that entity empty (which reads as data
  // loss). Successfully-loaded entities still populate.
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    let cancelled = false;

    const endpoints: { key: keyof AppData; label: string; url: string }[] = [
      { key: 'jobs', label: 'jobs', url: '/api/jobs' },
      { key: 'contacts', label: 'contacts', url: '/api/contacts' },
      { key: 'followups', label: 'follow-ups', url: '/api/followups' },
      { key: 'interviews', label: 'interviews', url: '/api/interviews' },
      { key: 'researchContacts', label: 'research contacts', url: '/api/research' },
      { key: 'companies', label: 'companies', url: '/api/companies' },
    ];

    const fetchAll = () => {
      setIsApiLoading(true);

      Promise.allSettled(
        endpoints.map(async ({ url }) => {
          const r = await fetch(url);
          if (!r.ok) throw new Error(`${url} responded ${r.status}`);
          return r.json();
        })
      )
        .then((results) => {
          if (cancelled) return;

          const failed: string[] = [];
          results.forEach((result, i) => {
            if (result.status === 'rejected') {
              failed.push(endpoints[i].label);
              console.error(`Failed to load ${endpoints[i].label}:`, result.reason);
            }
          });

          // Merge into existing state instead of replacing it: records created
          // while the load was in flight (missing from the fetch's DB snapshot)
          // must not vanish, and a failed entity keeps what we already have
          // rather than rendering empty.
          setApiData(prev => {
            const next: AppData = { ...prev };
            results.forEach((result, i) => {
              if (result.status !== 'fulfilled') return;
              const { key } = endpoints[i];
              const fetched = result.value as { id: string }[];
              const fetchedIds = new Set(fetched.map(r => r.id));
              const inFlight = (prev[key] as { id: string }[]).filter(r => !fetchedIds.has(r.id));
              (next as Record<keyof AppData, unknown>)[key] = [...fetched, ...inFlight];
            });
            return next;
          });

          if (failed.length > 0) {
            showToast(
              `Couldn't load: ${failed.join(', ')}. Please refresh to try again.`,
              'error'
            );
          }
        })
        .finally(() => {
          if (!cancelled) setIsApiLoading(false);
        });
    };

    fetchAll();

    window.addEventListener('focus', fetchAll);
    window.addEventListener(API_STALE_EVENT, fetchAll);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', fetchAll);
      window.removeEventListener(API_STALE_EVENT, fetchAll);
    };
  }, [isAuthenticated, isLoading]);

  // Jobs CRUD
  const addJob = async (job: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (isAuthenticated) {
      // API mode
      try {
        const response = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(job),
        });
        
        if (!response.ok) throw new Error('Failed to create job');
        
        const newJob: Job = await response.json();
        // Prepend, not append: the API returns jobs `createdAt desc` on
        // reload, so a new record's position wouldn't otherwise match until
        // the next fetch.
        setData(prev => ({
          ...prev,
          jobs: [newJob, ...prev.jobs],
        }));
        
        return newJob;
      } catch (error) {
        showToast('Failed to add job', 'error');
        throw error;
      }
    } else {
      // localStorage mode (guest)
      const newJob: Job = {
        ...job,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      setData(prev => ({
        ...prev,
        jobs: [...prev.jobs, newJob],
      }));
      
      return newJob;
    }
  };

  const updateJob = async (id: string, updates: Partial<Job>) => {
    if (isAuthenticated) {
      // API mode
      try {
        const response = await fetch(`/api/jobs/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        
        if (!response.ok) throw new Error('Failed to update job');
        
        const updatedJob: Job = await response.json();
        setData(prev => ({
          ...prev,
          jobs: prev.jobs.map(job => job.id === id ? updatedJob : job),
        }));
      } catch {
        showToast('Failed to update job', 'error');
      }
    } else {
      // localStorage mode (guest)
      setData(prev => ({
        ...prev,
        jobs: prev.jobs.map(job =>
          job.id === id
            ? { ...job, ...updates, updatedAt: new Date().toISOString() }
            : job
        ),
      }));
    }
  };

  const deleteJob = async (id: string) => {
    const job = data.jobs.find(j => j.id === id);
    if (!job) return;

    const deletedJob = { ...job };

    if (isAuthenticated) {
      // API mode
      try {
        const response = await fetch(`/api/jobs/${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) throw new Error('Failed to delete job');
        
        // Remove from local state immediately
        setData(prev => ({
          ...prev,
          jobs: prev.jobs.filter(job => job.id !== id),
        }));

        addToUndoStack({
          type: 'job',
          data: deletedJob,
          deletedAt: new Date().toISOString(),
        });

        showToast(
          `Deleted ${job.company}${job.title ? ` - ${job.title}` : ''}`,
          'success',
          {
            label: 'UNDO',
            onClick: async () => {
              // Re-create via API
              try {
                const response = await fetch('/api/jobs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(deletedJob),
                });
                
                if (!response.ok) throw new Error('Failed to restore job');
                
                const restoredJob = await response.json();
                setData(prev => ({
                  ...prev,
                  jobs: [...prev.jobs, restoredJob],
                }));
                consumeIfMatches(deletedJob.id);
                showToast('Restored!', 'success');
              } catch {
                showToast('Failed to restore job', 'error');
              }
            },
          }
        );
      } catch {
        showToast('Failed to delete job', 'error');
      }
    } else {
      // localStorage mode (guest)
      addToUndoStack({
        type: 'job',
        data: deletedJob,
        deletedAt: new Date().toISOString(),
      });

      setData(prev => ({
        ...prev,
        jobs: prev.jobs.filter(job => job.id !== id),
      }));

      showToast(
        `Deleted ${job.company}${job.title ? ` - ${job.title}` : ''}`,
        'success',
        {
          label: 'UNDO',
          onClick: () => {
            setData(prev => ({
              ...prev,
              jobs: appendUnlessExists(prev.jobs, deletedJob),
            }));
            consumeIfMatches(deletedJob.id);
            showToast('Restored!', 'success');
          },
        }
      );
    }
  };

  // Companies CRUD
  const addCompany = async (company: Omit<Company, 'id' | 'createdAt'>) => {
    if (isAuthenticated) {
      // API mode
      try {
        const response = await fetch('/api/companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(company),
        });

        if (!response.ok) throw new Error('Failed to create company');

        const newCompany: Company = await response.json();
        setData(prev => ({
          ...prev,
          companies: [newCompany, ...prev.companies],
        }));

        return newCompany;
      } catch (error) {
        showToast('Failed to add company', 'error');
        throw error;
      }
    } else {
      // localStorage mode (guest)
      const newCompany: Company = {
        ...company,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };

      setData(prev => ({
        ...prev,
        companies: [...prev.companies, newCompany],
      }));

      return newCompany;
    }
  };

  const updateCompany = async (id: string, updates: Partial<Company>) => {
    if (isAuthenticated) {
      // API mode
      try {
        const response = await fetch(`/api/companies/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) throw new Error('Failed to update company');

        const updatedCompany: Company = await response.json();
        setData(prev => ({
          ...prev,
          companies: prev.companies.map(company => company.id === id ? updatedCompany : company),
        }));
      } catch {
        showToast('Failed to update company', 'error');
      }
    } else {
      // localStorage mode (guest)
      setData(prev => ({
        ...prev,
        companies: prev.companies.map(company =>
          company.id === id ? { ...company, ...updates } : company
        ),
      }));
    }
  };

  const deleteCompany = async (id: string) => {
    const company = data.companies.find(c => c.id === id);
    if (!company) return;

    const deletedCompany = { ...company };

    if (isAuthenticated) {
      // API mode
      try {
        const response = await fetch(`/api/companies/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to delete company');

        setData(prev => ({
          ...prev,
          companies: prev.companies.filter(company => company.id !== id),
        }));

        addToUndoStack({
          type: 'company',
          data: deletedCompany,
          deletedAt: new Date().toISOString(),
        });

        showToast(
          `Deleted company: ${company.name}`,
          'success',
          {
            label: 'UNDO',
            onClick: async () => {
              try {
                const response = await fetch('/api/companies', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(deletedCompany),
                });

                if (!response.ok) throw new Error('Failed to restore company');

                const restoredCompany = await response.json();
                setData(prev => ({
                  ...prev,
                  companies: [...prev.companies, restoredCompany],
                }));
                consumeIfMatches(deletedCompany.id);
                showToast('Restored!', 'success');
              } catch {
                showToast('Failed to restore company', 'error');
              }
            },
          }
        );
      } catch {
        showToast('Failed to delete company', 'error');
      }
    } else {
      // localStorage mode (guest)
      addToUndoStack({
        type: 'company',
        data: deletedCompany,
        deletedAt: new Date().toISOString(),
      });

      setData(prev => ({
        ...prev,
        companies: prev.companies.filter(company => company.id !== id),
      }));

      showToast(
        `Deleted company: ${company.name}`,
        'success',
        {
          label: 'UNDO',
          onClick: () => {
            setData(prev => ({
              ...prev,
              companies: appendUnlessExists(prev.companies, deletedCompany),
            }));
            consumeIfMatches(deletedCompany.id);
            showToast('Restored!', 'success');
          },
        }
      );
    }
  };

  // Research Contacts CRUD
  const addResearchContact = async (contact: Omit<ResearchContact, 'id' | 'createdAt'>) => {
    if (isAuthenticated) {
      // API mode
      try {
        const response = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contact),
        });

        if (!response.ok) throw new Error('Failed to create research contact');

        const newContact: ResearchContact = await response.json();
        setData(prev => ({
          ...prev,
          researchContacts: [newContact, ...(prev.researchContacts ?? [])],
        }));

        return newContact;
      } catch (error) {
        showToast('Failed to add research contact', 'error');
        throw error;
      }
    } else {
      // localStorage mode (guest)
      const newContact: ResearchContact = {
        ...contact,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      setData(prev => ({
        ...prev,
        researchContacts: [...(prev.researchContacts ?? []), newContact],
      }));
      return newContact;
    }
  };

  const updateResearchContact = async (id: string, updates: Partial<ResearchContact>) => {
    if (isAuthenticated) {
      // API mode
      try {
        const response = await fetch(`/api/research/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (!response.ok) throw new Error('Failed to update research contact');

        const updatedContact: ResearchContact = await response.json();
        setData(prev => ({
          ...prev,
          researchContacts: (prev.researchContacts ?? []).map(c =>
            c.id === id ? updatedContact : c
          ),
        }));
      } catch {
        showToast('Failed to update research contact', 'error');
      }
    } else {
      // localStorage mode (guest)
      setData(prev => ({
        ...prev,
        researchContacts: (prev.researchContacts ?? []).map(c =>
          c.id === id ? { ...c, ...updates } : c
        ),
      }));
    }
  };

  const deleteResearchContact = async (id: string) => {
    const contact = (data.researchContacts ?? []).find(c => c.id === id);
    if (!contact) return;

    const deletedResearch = { ...contact };

    if (isAuthenticated) {
      // API mode
      try {
        const response = await fetch(`/api/research/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to delete research contact');

        setData(prev => ({
          ...prev,
          researchContacts: (prev.researchContacts ?? []).filter(c => c.id !== id),
        }));

        addToUndoStack({
          type: 'research',
          data: deletedResearch,
          deletedAt: new Date().toISOString(),
        });

        showToast(
          `Deleted research contact: ${contact.name}`,
          'success',
          {
            label: 'UNDO',
            onClick: async () => {
              try {
                const response = await fetch('/api/research', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(deletedResearch),
                });

                if (!response.ok) throw new Error('Failed to restore research contact');

                const restoredResearch = await response.json();
                setData(prev => ({
                  ...prev,
                  researchContacts: [...(prev.researchContacts ?? []), restoredResearch],
                }));
                consumeIfMatches(deletedResearch.id);
                showToast('Restored!', 'success');
              } catch {
                showToast('Failed to restore research contact', 'error');
              }
            },
          }
        );
      } catch {
        showToast('Failed to delete research contact', 'error');
      }
    } else {
      // localStorage mode (guest)
      addToUndoStack({
        type: 'research',
        data: deletedResearch,
        deletedAt: new Date().toISOString(),
      });

      setData(prev => ({
        ...prev,
        researchContacts: (prev.researchContacts ?? []).filter(c => c.id !== id),
      }));

      showToast(
        `Deleted research contact: ${contact.name}`,
        'success',
        {
          label: 'UNDO',
          onClick: () => {
            setData(prev => ({
              ...prev,
              researchContacts: appendUnlessExists(prev.researchContacts ?? [], deletedResearch),
            }));
            consumeIfMatches(deletedResearch.id);
            showToast('Restored!', 'success');
          },
        }
      );
    }
  };

  // Contacts CRUD
  const addContact = async (contact: Omit<Contact, 'id' | 'createdAt'>) => {
    if (isAuthenticated) {
      try {
        const response = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contact),
        });
        
        if (!response.ok) throw new Error('Failed to create contact');
        
        const newContact: Contact = await response.json();
        setData(prev => ({
          ...prev,
          contacts: [newContact, ...prev.contacts],
        }));
        
        return newContact;
      } catch (error) {
        showToast('Failed to add contact', 'error');
        throw error;
      }
    } else {
      const newContact: Contact = {
        ...contact,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      
      setData(prev => ({
        ...prev,
        contacts: [...prev.contacts, newContact],
      }));
      
      return newContact;
    }
  };

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    if (isAuthenticated) {
      try {
        const response = await fetch(`/api/contacts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        
        if (!response.ok) throw new Error('Failed to update contact');
        
        const updatedContact: Contact = await response.json();
        setData(prev => ({
          ...prev,
          contacts: prev.contacts.map(contact => contact.id === id ? updatedContact : contact),
        }));
      } catch {
        showToast('Failed to update contact', 'error');
      }
    } else {
      setData(prev => ({
        ...prev,
        contacts: prev.contacts.map(contact =>
          contact.id === id ? { ...contact, ...updates } : contact
        ),
      }));
    }
  };

  const deleteContact = async (id: string) => {
    const contact = data.contacts.find(c => c.id === id);
    if (!contact) return;

    const deletedContact = { ...contact };

    if (isAuthenticated) {
      try {
        const response = await fetch(`/api/contacts/${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) throw new Error('Failed to delete contact');
        
        setData(prev => ({
          ...prev,
          contacts: prev.contacts.filter(contact => contact.id !== id),
        }));

        addToUndoStack({
          type: 'contact',
          data: deletedContact,
          deletedAt: new Date().toISOString(),
        });

        showToast(
          `Deleted contact: ${contact.name}`,
          'success',
          {
            label: 'UNDO',
            onClick: async () => {
              try {
                const response = await fetch('/api/contacts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(deletedContact),
                });
                
                if (!response.ok) throw new Error('Failed to restore contact');
                
                const restoredContact = await response.json();
                setData(prev => ({
                  ...prev,
                  contacts: [...prev.contacts, restoredContact],
                }));
                consumeIfMatches(deletedContact.id);
                showToast('Restored!', 'success');
              } catch {
                showToast('Failed to restore contact', 'error');
              }
            },
          }
        );
      } catch {
        showToast('Failed to delete contact', 'error');
      }
    } else {
      addToUndoStack({
        type: 'contact',
        data: deletedContact,
        deletedAt: new Date().toISOString(),
      });

      setData(prev => ({
        ...prev,
        contacts: prev.contacts.filter(contact => contact.id !== id),
      }));

      showToast(
        `Deleted contact: ${contact.name}`,
        'success',
        {
          label: 'UNDO',
          onClick: () => {
            setData(prev => ({
              ...prev,
              contacts: appendUnlessExists(prev.contacts, deletedContact),
            }));
            consumeIfMatches(deletedContact.id);
            showToast('Restored!', 'success');
          },
        }
      );
    }
  };

  // Follow-ups CRUD
  const addFollowUp = async (followup: Omit<FollowUp, 'id' | 'createdAt'>) => {
    if (isAuthenticated) {
      try {
        const response = await fetch('/api/followups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(followup),
        });
        
        if (!response.ok) throw new Error('Failed to create follow-up');
        
        const newFollowUp: FollowUp = await response.json();
        // The API orders follow-ups by dueDate asc (not createdAt) — sort
        // after insert so the new record lands in the right spot instead of
        // jumping there only after the next reload.
        setData(prev => ({
          ...prev,
          followups: [...prev.followups, newFollowUp].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
        }));
        
        return newFollowUp;
      } catch (error) {
        showToast('Failed to add follow-up', 'error');
        throw error;
      }
    } else {
      const newFollowUp: FollowUp = {
        ...followup,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      
      setData(prev => ({
        ...prev,
        followups: [...prev.followups, newFollowUp],
      }));
      
      return newFollowUp;
    }
  };

  const updateFollowUp = async (id: string, updates: Partial<FollowUp>) => {
    if (isAuthenticated) {
      try {
        const response = await fetch(`/api/followups/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        
        if (!response.ok) throw new Error('Failed to update follow-up');
        
        const updatedFollowUp: FollowUp = await response.json();
        setData(prev => ({
          ...prev,
          followups: prev.followups.map(followup => followup.id === id ? updatedFollowUp : followup),
        }));
      } catch {
        showToast('Failed to update follow-up', 'error');
      }
    } else {
      setData(prev => ({
        ...prev,
        followups: prev.followups.map(followup =>
          followup.id === id ? { ...followup, ...updates } : followup
        ),
      }));
    }
  };

  const deleteFollowUp = async (id: string) => {
    const followup = data.followups.find(f => f.id === id);
    if (!followup) return;

    const deletedFollowUp = { ...followup };

    if (isAuthenticated) {
      try {
        const response = await fetch(`/api/followups/${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) throw new Error('Failed to delete follow-up');
        
        setData(prev => ({
          ...prev,
          followups: prev.followups.filter(followup => followup.id !== id),
        }));

        addToUndoStack({
          type: 'followup',
          data: deletedFollowUp,
          deletedAt: new Date().toISOString(),
        });

        showToast(
          `Deleted follow-up`,
          'success',
          {
            label: 'UNDO',
            onClick: async () => {
              try {
                const response = await fetch('/api/followups', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(deletedFollowUp),
                });
                
                if (!response.ok) throw new Error('Failed to restore follow-up');
                
                const restoredFollowUp = await response.json();
                setData(prev => ({
                  ...prev,
                  followups: [...prev.followups, restoredFollowUp],
                }));
                consumeIfMatches(deletedFollowUp.id);
                showToast('Restored!', 'success');
              } catch {
                showToast('Failed to restore follow-up', 'error');
              }
            },
          }
        );
      } catch {
        showToast('Failed to delete follow-up', 'error');
      }
    } else {
      addToUndoStack({
        type: 'followup',
        data: deletedFollowUp,
        deletedAt: new Date().toISOString(),
      });

      setData(prev => ({
        ...prev,
        followups: prev.followups.filter(followup => followup.id !== id),
      }));

      showToast(
        `Deleted follow-up`,
        'success',
        {
          label: 'UNDO',
          onClick: () => {
            setData(prev => ({
              ...prev,
              followups: appendUnlessExists(prev.followups, deletedFollowUp),
            }));
            consumeIfMatches(deletedFollowUp.id);
            showToast('Restored!', 'success');
          },
        }
      );
    }
  };

  // Interviews CRUD
  const addInterview = async (interview: Omit<Interview, 'id' | 'createdAt'>) => {
    if (isAuthenticated) {
      try {
        const response = await fetch('/api/interviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(interview),
        });
        
        if (!response.ok) throw new Error('Failed to create interview');
        
        const newInterview: Interview = await response.json();
        // The API orders interviews by date asc (not createdAt) — sort after
        // insert so the new record lands in the right spot immediately.
        setData(prev => ({
          ...prev,
          interviews: [...prev.interviews, newInterview].sort((a, b) => a.date.localeCompare(b.date)),
        }));
        
        return newInterview;
      } catch (error) {
        showToast('Failed to add interview', 'error');
        throw error;
      }
    } else {
      const newInterview: Interview = {
        ...interview,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      
      setData(prev => ({
        ...prev,
        interviews: [...prev.interviews, newInterview],
      }));
      
      return newInterview;
    }
  };

  const updateInterview = async (id: string, updates: Partial<Interview>) => {
    if (isAuthenticated) {
      try {
        const response = await fetch(`/api/interviews/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        
        if (!response.ok) throw new Error('Failed to update interview');
        
        const updatedInterview: Interview = await response.json();
        setData(prev => ({
          ...prev,
          interviews: prev.interviews.map(interview => interview.id === id ? updatedInterview : interview),
        }));
      } catch {
        showToast('Failed to update interview', 'error');
      }
    } else {
      setData(prev => ({
        ...prev,
        interviews: prev.interviews.map(interview =>
          interview.id === id ? { ...interview, ...updates } : interview
        ),
      }));
    }
  };

  const deleteInterview = async (id: string) => {
    const interview = data.interviews.find(i => i.id === id);
    if (!interview) return;

    const deletedInterview = { ...interview };

    if (isAuthenticated) {
      try {
        const response = await fetch(`/api/interviews/${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) throw new Error('Failed to delete interview');
        
        setData(prev => ({
          ...prev,
          interviews: prev.interviews.filter(interview => interview.id !== id),
        }));

        addToUndoStack({
          type: 'interview',
          data: deletedInterview,
          deletedAt: new Date().toISOString(),
        });

        showToast(
          `Deleted interview`,
          'success',
          {
            label: 'UNDO',
            onClick: async () => {
              try {
                const response = await fetch('/api/interviews', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(deletedInterview),
                });
                
                if (!response.ok) throw new Error('Failed to restore interview');
                
                const restoredInterview = await response.json();
                setData(prev => ({
                  ...prev,
                  interviews: [...prev.interviews, restoredInterview],
                }));
                consumeIfMatches(deletedInterview.id);
                showToast('Restored!', 'success');
              } catch {
                showToast('Failed to restore interview', 'error');
              }
            },
          }
        );
      } catch {
        showToast('Failed to delete interview', 'error');
      }
    } else {
      addToUndoStack({
        type: 'interview',
        data: deletedInterview,
        deletedAt: new Date().toISOString(),
      });

      setData(prev => ({
        ...prev,
        interviews: prev.interviews.filter(interview => interview.id !== id),
      }));

      showToast(
        `Deleted interview`,
        'success',
        {
          label: 'UNDO',
          onClick: () => {
            setData(prev => ({
              ...prev,
              interviews: appendUnlessExists(prev.interviews, deletedInterview),
            }));
            consumeIfMatches(deletedInterview.id);
            showToast('Restored!', 'success');
          },
        }
      );
    }
  };

  // Global undo function
  const undo = async () => {
    const item = popFromUndoStack();
    if (!item) {
      showToast('Nothing to undo', 'info');
      return;
    }

    if (isAuthenticated) {
      // API mode - re-create via API
      try {
        let endpoint = '';
        let successMessage = '';
        
        switch (item.type) {
          case 'job':
            endpoint = '/api/jobs';
            successMessage = `Restored ${item.data.company}`;
            break;
          case 'contact':
            endpoint = '/api/contacts';
            successMessage = `Restored ${item.data.name}`;
            break;
          case 'followup':
            endpoint = '/api/followups';
            successMessage = 'Restored follow-up';
            break;
          case 'interview':
            endpoint = '/api/interviews';
            successMessage = 'Restored interview';
            break;
          case 'company':
            endpoint = '/api/companies';
            successMessage = `Restored ${item.data.name}`;
            break;
          case 'research':
            endpoint = '/api/research';
            successMessage = `Restored ${item.data.name}`;
            break;
          default:
            showToast('Cannot undo this action', 'error');
            return;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });
        
        if (!response.ok) throw new Error('Failed to restore item');
        
        const restored = await response.json();
        
        // Update local state
        switch (item.type) {
          case 'job':
            setData(prev => ({ ...prev, jobs: [...prev.jobs, restored] }));
            break;
          case 'contact':
            setData(prev => ({ ...prev, contacts: [...prev.contacts, restored] }));
            break;
          case 'followup':
            setData(prev => ({ ...prev, followups: [...prev.followups, restored] }));
            break;
          case 'interview':
            setData(prev => ({ ...prev, interviews: [...prev.interviews, restored] }));
            break;
          case 'company':
            setData(prev => ({ ...prev, companies: [...prev.companies, restored] }));
            break;
          case 'research':
            setData(prev => ({ ...prev, researchContacts: [...(prev.researchContacts ?? []), restored] }));
            break;
        }

        showToast(successMessage, 'success');
      } catch {
        // Restore failed — put the item back so the deletion stays undoable.
        addToUndoStack(item);
        showToast('Failed to restore item', 'error');
      }
    } else {
      // localStorage mode (guest) — appendUnlessExists guards against
      // re-inserting a record the toast UNDO already restored.
      switch (item.type) {
        case 'job':
          setData(prev => ({
            ...prev,
            jobs: appendUnlessExists(prev.jobs, item.data),
          }));
          showToast(`Restored ${item.data.company}`, 'success');
          break;
        case 'company':
          setData(prev => ({
            ...prev,
            companies: appendUnlessExists(prev.companies, item.data),
          }));
          showToast(`Restored ${item.data.name}`, 'success');
          break;
        case 'contact':
          setData(prev => ({
            ...prev,
            contacts: appendUnlessExists(prev.contacts, item.data),
          }));
          showToast(`Restored ${item.data.name}`, 'success');
          break;
        case 'followup':
          setData(prev => ({
            ...prev,
            followups: appendUnlessExists(prev.followups, item.data),
          }));
          showToast('Restored follow-up', 'success');
          break;
        case 'interview':
          setData(prev => ({
            ...prev,
            interviews: appendUnlessExists(prev.interviews, item.data),
          }));
          showToast('Restored interview', 'success');
          break;
        case 'research':
          setData(prev => ({
            ...prev,
            researchContacts: appendUnlessExists(prev.researchContacts ?? [], item.data),
          }));
          showToast(`Restored ${item.data.name}`, 'success');
          break;
      }
    }
  };

  const loadSampleData = async () => {
    const sampleJobs = [
      {
        company: 'Amazon',
        title: 'Software Development Engineer Intern',
        status: 'Submitted' as const,
        interest: 4,
        dateApplied: '2026-01-05',
        deadline: '2026-01-20',
        location: 'Seattle, WA',
        salary: '$40-45/hour',
        notes: 'Applied through university portal',
      },
      {
        company: 'Meta',
        title: 'Frontend Engineer Intern',
        status: 'Interview' as const,
        interest: 5,
        dateApplied: '2025-12-15',
        location: 'Menlo Park, CA',
        notes: 'Phone screen scheduled for next week',
      },
    ];

    const sampleContacts = [
      {
        name: 'John Doe',
        company: 'Microsoft',
        position: 'Senior Recruiter',
        email: 'john.doe@microsoft.com',
        linkedin: 'https://linkedin.com/in/johndoe',
        type: 'Career Fair' as const,
        strength: 'Warm' as const,
        notes: 'Met at fall career fair, interested in cloud computing',
      },
    ];

    const sampleFollowups = [
      {
        company: 'Google',
        contact: 'Sarah Johnson',
        type: 'Thank You' as const,
        dueDate: '2026-01-10',
        priority: 'High' as const,
        status: 'Pending' as const,
      },
    ];

    if (isAuthenticated) {
      // Persist to API so IDs exist in the DB and mutations work
      try {
        const [jobs, contacts, followups] = await Promise.all([
          Promise.all(sampleJobs.map(j =>
            fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(j) })
              .then(r => r.ok ? r.json() : null)
          )),
          Promise.all(sampleContacts.map(c =>
            fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) })
              .then(r => r.ok ? r.json() : null)
          )),
          Promise.all(sampleFollowups.map(f =>
            fetch('/api/followups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
              .then(r => r.ok ? r.json() : null)
          )),
        ]);

        setApiData(prev => ({
          ...prev,
          jobs: [...prev.jobs, ...jobs.filter(Boolean)],
          contacts: [...prev.contacts, ...contacts.filter(Boolean)],
          followups: [...prev.followups, ...followups.filter(Boolean)],
        }));
      } catch {
        showToast('Failed to load sample data', 'error');
      }
    } else {
      // Guest mode: store locally only. Appended (not replaced) so existing
      // guest data — including follow-ups/interviews/research the old guard
      // never checked — can't be silently erased.
      const sampleData: AppData = {
        companies: [
          {
            id: generateId(),
            name: 'Google',
            industry: 'Technology',
            interest: 5,
            booth: 'Booth 42',
            recruiter: 'Sarah Johnson',
            position: 'Software Engineer Intern',
            optFriendly: 'Yes',
            deadline: '2026-02-15',
            website: 'https://careers.google.com',
            location: 'Cambridge, MA',
            status: 'Researching',
            notes: 'Really interested in their ML team',
            createdAt: new Date().toISOString(),
          },
        ],
        contacts: sampleContacts.map(c => ({ ...c, id: generateId(), createdAt: new Date().toISOString() })),
        jobs: sampleJobs.map(j => ({ ...j, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })),
        followups: sampleFollowups.map(f => ({ ...f, id: generateId(), createdAt: new Date().toISOString() })),
        interviews: [],
        researchContacts: [],
      };
      setLocalData(prev => ({
        companies: [...prev.companies, ...sampleData.companies],
        contacts: [...prev.contacts, ...sampleData.contacts],
        jobs: [...prev.jobs, ...sampleData.jobs],
        followups: [...prev.followups, ...sampleData.followups],
        interviews: prev.interviews,
        researchContacts: prev.researchContacts ?? [],
      }));
    }
  };

  const value: AppDataContextType = {
    data,
    addJob,
    updateJob,
    deleteJob,
    addCompany,
    updateCompany,
    deleteCompany,
    addContact,
    updateContact,
    deleteContact,
    addFollowUp,
    updateFollowUp,
    deleteFollowUp,
    addInterview,
    updateInterview,
    deleteInterview,
    addResearchContact,
    updateResearchContact,
    deleteResearchContact,
    loadSampleData,
    undo,
    canUndo,
    undoCount,
    isLoading: authLoading || isApiLoading,
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
}
