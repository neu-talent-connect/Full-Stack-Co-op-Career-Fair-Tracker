'use client';

import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useUndo } from '@/hooks/useUndo';
import { useToast } from '@/components/Toast';
import { AppData, Job, Company, Contact, FollowUp, Interview, ResearchContact } from '@/types';
import { generateId } from '@/lib/utils';

const STORAGE_KEY = 'careerFairData';

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
  addCompany: (company: Omit<Company, 'id' | 'createdAt'>) => Company;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
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
  addResearchContact: (contact: Omit<ResearchContact, 'id' | 'createdAt'>) => ResearchContact;
  updateResearchContact: (id: string, updates: Partial<ResearchContact>) => void;
  deleteResearchContact: (id: string) => void;
  // Bulk
  clearAllData: () => void;
  loadSampleData: () => Promise<void>;
  // Undo
  undo: () => Promise<void>;
  canUndo: boolean;
  undoCount: number;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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

  const { addToUndoStack, popFromUndoStack, canUndo, undoCount } = useUndo();
  const { showToast } = useToast();

  // Fetch data from API on mount if authenticated
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    setIsApiLoading(true);
    
    Promise.all([
      fetch('/api/jobs').then(r => r.ok ? r.json() : []),
      fetch('/api/contacts').then(r => r.ok ? r.json() : []),
      fetch('/api/followups').then(r => r.ok ? r.json() : []),
      fetch('/api/interviews').then(r => r.ok ? r.json() : []),
    ])
      .then(([jobs, contacts, followups, interviews]) => {
        setApiData({
          jobs,
          contacts,
          followups,
          interviews,
          companies: [], // Not using companies table for now
          researchContacts: [],
        });
      })
      .catch(() => {
        showToast('Failed to load data', 'error');
      })
      .finally(() => setIsApiLoading(false));
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
        setData(prev => ({
          ...prev,
          jobs: [...prev.jobs, newJob],
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
            setData(prev => {
              const exists = prev.jobs.some(j => j.id === deletedJob.id);
              if (exists) {
                return prev;
              }
              
              return {
                ...prev,
                jobs: [...prev.jobs, deletedJob],
              };
            });
            showToast('Restored!', 'success');
          },
        }
      );
    }
  };

  // Companies CRUD
  const addCompany = (company: Omit<Company, 'id' | 'createdAt'>) => {
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
  };

  const updateCompany = (id: string, updates: Partial<Company>) => {
    setData(prev => ({
      ...prev,
      companies: prev.companies.map(company =>
        company.id === id ? { ...company, ...updates } : company
      ),
    }));
  };

  const deleteCompany = (id: string) => {
    const company = data.companies.find(c => c.id === id);
    if (!company) return;

    const deletedCompany = { ...company };

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
            companies: [...prev.companies, deletedCompany],
          }));
          showToast('Restored!', 'success');
        },
      }
    );
  };

  // Research Contacts CRUD
  const addResearchContact = (contact: Omit<ResearchContact, 'id' | 'createdAt'>) => {
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
  };

  const updateResearchContact = (id: string, updates: Partial<ResearchContact>) => {
    setData(prev => ({
      ...prev,
      researchContacts: (prev.researchContacts ?? []).map(c =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  };

  const deleteResearchContact = (id: string) => {
    setData(prev => ({
      ...prev,
      researchContacts: (prev.researchContacts ?? []).filter(c => c.id !== id),
    }));
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
          contacts: [...prev.contacts, newContact],
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
              contacts: [...prev.contacts, deletedContact],
            }));
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
        setData(prev => ({
          ...prev,
          followups: [...prev.followups, newFollowUp],
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
              followups: [...prev.followups, deletedFollowUp],
            }));
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
        setData(prev => ({
          ...prev,
          interviews: [...prev.interviews, newInterview],
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
              interviews: [...prev.interviews, deletedInterview],
            }));
            showToast('Restored!', 'success');
          },
        }
      );
    }
  };

  // Bulk operations
  const clearAllData = () => {
    setData(initialData);
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
        }
        
        showToast(successMessage, 'success');
      } catch {
        showToast('Failed to restore item', 'error');
      }
    } else {
      // localStorage mode (guest)
      switch (item.type) {
        case 'job':
          setData(prev => ({
            ...prev,
            jobs: [...prev.jobs, item.data],
          }));
          showToast(`Restored ${item.data.company}`, 'success');
          break;
        case 'company':
          setData(prev => ({
            ...prev,
            companies: [...prev.companies, item.data],
          }));
          showToast(`Restored ${item.data.name}`, 'success');
          break;
        case 'contact':
          setData(prev => ({
            ...prev,
            contacts: [...prev.contacts, item.data],
          }));
          showToast(`Restored ${item.data.name}`, 'success');
          break;
        case 'followup':
          setData(prev => ({
            ...prev,
            followups: [...prev.followups, item.data],
          }));
          showToast('Restored follow-up', 'success');
          break;
        case 'interview':
          setData(prev => ({
            ...prev,
            interviews: [...prev.interviews, item.data],
          }));
          showToast('Restored interview', 'success');
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
      // Guest mode: store locally only
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
      setLocalData(sampleData);
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
    clearAllData,
    loadSampleData,
    undo,
    canUndo,
    undoCount,
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
