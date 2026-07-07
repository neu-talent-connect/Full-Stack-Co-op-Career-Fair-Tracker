'use client';

import { useState } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import {
  Trash2, Mail, Linkedin, Phone, Calendar, AlertCircle,
  Star, Pin, Edit, X, Plus, Search,
} from 'lucide-react';
import {
  formatDate, getPriorityColor, getStatusColor, getTodayDate, isOverdue,
} from '@/lib/utils';
import { Contact, FollowUp, ResearchContact, ResearchCompany, OutreachStatus } from '@/types';

// ── helpers ──────────────────────────────────────────────────────────────────

function outreachBadgeVariant(status: OutreachStatus) {
  if (status === 'To Reach Out') return 'default' as const;
  if (status === 'Reached Out') return 'success' as const;
  return 'warning' as const; // Waiting for Reply
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < value ? 'text-yellow-500 fill-current' : 'text-gray-300 dark:text-gray-600'}`}
        />
      ))}
      <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">({value}/{max})</span>
    </div>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

export default function NetworkingPage() {
  const {
    data,
    addContact, updateContact, deleteContact,
    addFollowUp, updateFollowUp, deleteFollowUp,
    addResearchContact, updateResearchContact, deleteResearchContact,
  } = useAppData();

  const [activeTab, setActiveTab] = useState<'contacts' | 'followups' | 'research'>('research');

  // ── Contact form state ────────────────────────────────────────────────────
  const [contactForm, setContactForm] = useState<Partial<Contact>>({
    type: 'Career Fair',
    strength: 'Cold',
    ranking: 3,
    isPinned: false,
  });
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  // ── Follow-up form state ──────────────────────────────────────────────────
  const [followupForm, setFollowupForm] = useState<Partial<FollowUp>>({
    type: 'Thank You',
    priority: 'Medium',
    status: 'Pending',
  });

  // ── Research form state ───────────────────────────────────────────────────
  const emptyResearchForm = (): Partial<ResearchContact> => ({
    companies: [],
    interest: 3,
    outreachStatus: 'To Reach Out',
  });
  const [researchForm, setResearchForm] = useState<Partial<ResearchContact>>(emptyResearchForm());
  const [editingResearchId, setEditingResearchId] = useState<string | null>(null);
  const [companyEntry, setCompanyEntry] = useState<ResearchCompany>({ company: '', position: '', interest: 3 });
  const [editingPositionIndex, setEditingPositionIndex] = useState<number | null>(null);
  const [editingPositionValue, setEditingPositionValue] = useState('');

  // ── Filter/sort state ─────────────────────────────────────────────────────
  const [rankFilter, setRankFilter] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showPinnedFirst, setShowPinnedFirst] = useState(true);
  const [researchStatusFilter, setResearchStatusFilter] = useState<OutreachStatus | ''>('');

  // ── Contact handlers ──────────────────────────────────────────────────────
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name) return;
    try {
      if (editingContactId) {
        await updateContact(editingContactId, contactForm);
      } else {
        await addContact(contactForm as any);
      }
    } catch {
      // Provider already shows an error toast; keep the form populated
      return;
    }
    setEditingContactId(null);
    setContactForm({ type: 'Career Fair', strength: 'Cold', ranking: 3, isPinned: false });
  };

  const handleEditContact = (contact: Contact) => {
    setContactForm(contact);
    setEditingContactId(contact.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingContactId(null);
    setContactForm({ type: 'Career Fair', strength: 'Cold', ranking: 3, isPinned: false });
  };

  const handleDeleteContact = (id: string) => {
    deleteContact(id);
  };

  const togglePin = (contact: Contact) => {
    updateContact(contact.id, { isPinned: !contact.isPinned });
  };

  // ── Follow-up handlers ────────────────────────────────────────────────────
  const handleFollowupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupForm.company || !followupForm.dueDate) return;
    try {
      await addFollowUp(followupForm as any);
    } catch {
      // Provider already shows an error toast; keep the form populated
      return;
    }
    setFollowupForm({ type: 'Thank You', priority: 'Medium', status: 'Pending' });
  };

  const handleDeleteFollowup = (id: string) => {
    deleteFollowUp(id);
  };

  // ── Research handlers ─────────────────────────────────────────────────────
  const handleAddCompanyEntry = () => {
    const names = companyEntry.company.split(',').map(s => s.trim()).filter(Boolean);
    if (names.length === 0) return;
    const newEntries: ResearchCompany[] = names.map(name => ({
      company: name,
      position: companyEntry.position ?? '',
      interest: companyEntry.interest,
    }));
    setResearchForm(prev => ({
      ...prev,
      companies: [...(prev.companies ?? []), ...newEntries],
    }));
    setCompanyEntry({ company: '', position: '', interest: 3 });
  };

  const handleUpdateCompanyInterest = (index: number, interest: number) => {
    setResearchForm(prev => ({
      ...prev,
      companies: (prev.companies ?? []).map((c, i) =>
        i === index ? { ...c, interest } : c
      ),
    }));
  };

  const commitPositionEdit = (index: number) => {
    const trimmed = editingPositionValue.trim();
    if (trimmed) {
      setResearchForm(prev => ({
        ...prev,
        companies: (prev.companies ?? []).map((c, i) =>
          i === index ? { ...c, position: trimmed } : c
        ),
      }));
    }
    setEditingPositionIndex(null);
    setEditingPositionValue('');
  };

  const handleRemoveCompany = (index: number) => {
    setResearchForm(prev => ({
      ...prev,
      companies: (prev.companies ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleResearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!researchForm.name) return;
    const payload = {
      name: researchForm.name,
      linkedin: researchForm.linkedin,
      companies: researchForm.companies ?? [],
      interest: researchForm.interest ?? 3,
      outreachStatus: researchForm.outreachStatus ?? 'To Reach Out',
      notes: researchForm.notes,
    };
    try {
      if (editingResearchId) {
        await updateResearchContact(editingResearchId, payload);
      } else {
        await addResearchContact(payload);
      }
    } catch {
      // Provider already shows an error toast; keep the form populated
      return;
    }
    setEditingResearchId(null);
    setResearchForm(emptyResearchForm());
    setCompanyEntry({ company: '', interest: 3 });
  };

  const handleEditResearch = (contact: ResearchContact) => {
    setResearchForm(contact);
    setEditingResearchId(contact.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelResearchEdit = () => {
    setEditingResearchId(null);
    setResearchForm(emptyResearchForm());
    setCompanyEntry({ company: '', interest: 3 });
  };

  const handleDeleteResearch = (id: string) => {
    deleteResearchContact(id);
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const filteredAndSortedContacts = data.contacts
    .filter(c => !rankFilter || c.ranking === rankFilter)
    .sort((a, b) => {
      if (showPinnedFirst) {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
      }
      const aRank = a.ranking ?? 0;
      const bRank = b.ranking ?? 0;
      return sortOrder === 'desc' ? bRank - aRank : aRank - bRank;
    });

  const sortedFollowups = [...data.followups].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'Pending' ? -1 : 1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
  const pendingFollowups = sortedFollowups.filter(f => f.status === 'Pending');
  const overdueFollowups = pendingFollowups.filter(f => isOverdue(f.dueDate));

  const researchContacts = (data.researchContacts ?? [])
    .filter(c => !researchStatusFilter || c.outreachStatus === researchStatusFilter)
    .sort((a, b) => b.interest - a.interest);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Networking</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Research people, manage contacts, and track follow-ups.
        </p>
      </div>

      {/* Overdue alert */}
      {overdueFollowups.length > 0 && (
        <Card className="mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 animate-fade-in">
          <div className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-200">
                {overdueFollowups.length} Overdue Follow-up{overdueFollowups.length > 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                You have follow-ups that need attention!
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <Button
          variant={activeTab === 'research' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('research')}
        >
          <Search className="w-4 h-4 mr-2" />
          Research ({(data.researchContacts ?? []).length})
        </Button>
        <Button
          variant={activeTab === 'contacts' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('contacts')}
        >
          Contacts ({data.contacts.length})
        </Button>
        <Button
          variant={activeTab === 'followups' ? 'primary' : 'outline'}
          onClick={() => setActiveTab('followups')}
        >
          Follow-ups ({pendingFollowups.length})
        </Button>
      </div>

      {/* ── RESEARCH TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'research' && (
        <>
          {/* Intro banner */}
          <Card className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 animate-fade-in">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Research first, apply later.</strong> Find people in your major on LinkedIn,
              note which companies they&#39;ve worked at, and rate your interest before you reach out.
            </p>
          </Card>

          {/* Form */}
          <Card className="mb-8 animate-fade-in" style={{ animationDelay: '150ms' }}>
            <form onSubmit={handleResearchSubmit} className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingResearchId ? 'Edit Research Contact' : 'Add Person to Research'}
                </h2>
                {editingResearchId && (
                  <Button type="button" variant="outline" size="sm" onClick={handleCancelResearchEdit}>
                    <X className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                )}
              </div>

              {/* Name + LinkedIn */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Input
                  label="Name"
                  required
                  placeholder="e.g., Jane Smith"
                  value={researchForm.name ?? ''}
                  onChange={e => setResearchForm(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  label="LinkedIn URL"
                  type="url"
                  placeholder="https://linkedin.com/in/janesmith"
                  value={researchForm.linkedin ?? ''}
                  onChange={e => setResearchForm(prev => ({ ...prev, linkedin: e.target.value }))}
                />
              </div>

              {/* Companies worked at */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Companies they&#39;ve worked at
                </label>

                {/* Existing entries */}
                {(researchForm.companies ?? []).length > 0 && (
                  <div className="space-y-2 mb-3">
                    {(researchForm.companies ?? []).map((entry, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="w-36 flex-shrink-0">
                          <span className="block font-medium text-gray-900 dark:text-white text-sm truncate">
                            {entry.company}
                          </span>
                          {editingPositionIndex === i ? (
                            <input
                              autoFocus
                              className="mt-0.5 w-full text-xs border-b border-gray-400 dark:border-gray-500 bg-transparent text-gray-700 dark:text-gray-300 outline-none placeholder:text-gray-400"
                              placeholder={entry.position || 'e.g., SWE Intern'}
                              value={editingPositionValue}
                              onChange={e => setEditingPositionValue(e.target.value)}
                              onBlur={() => commitPositionEdit(i)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); commitPositionEdit(i); }
                                if (e.key === 'Escape') { setEditingPositionIndex(null); setEditingPositionValue(''); }
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setEditingPositionIndex(i); setEditingPositionValue(''); }}
                              className="mt-0.5 block text-xs text-left truncate w-full text-gray-500 dark:text-gray-400 hover:text-northeastern-red dark:hover:text-northeastern-red transition-colors"
                              title="Click to edit role"
                            >
                              {entry.position || <span className="italic opacity-60">add role</span>}
                            </button>
                          )}
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={5}
                            step={1}
                            value={entry.interest}
                            onChange={e => handleUpdateCompanyInterest(i, Number(e.target.value))}
                            className="flex-1 accent-red-600"
                          />
                          <span className="text-sm text-gray-500 dark:text-gray-400 w-8 text-right">
                            {entry.interest}/5
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCompany(i)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add company sub-form */}
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <Input
                      placeholder="e.g., Google, Amazon, Meta — separate with commas"
                      value={companyEntry.company}
                      onChange={e => setCompanyEntry(prev => ({ ...prev, company: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); handleAddCompanyEntry(); }
                      }}
                    />
                  </div>
                  <div className="w-full sm:w-40">
                    <Input
                      placeholder="Role (e.g., SWE Intern)"
                      value={companyEntry.position ?? ''}
                      onChange={e => setCompanyEntry(prev => ({ ...prev, position: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); handleAddCompanyEntry(); }
                      }}
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Interest: {companyEntry.interest}/5
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={5}
                      step={1}
                      value={companyEntry.interest}
                      onChange={e => setCompanyEntry(prev => ({ ...prev, interest: Number(e.target.value) }))}
                      className="w-full accent-red-600"
                    />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddCompanyEntry}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </div>

              {/* Overall interest + outreach status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    How eager are you to connect?
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    0 = not a priority &nbsp;·&nbsp; 5 = reach out ASAP
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={5}
                      step={1}
                      value={researchForm.interest ?? 3}
                      onChange={e => setResearchForm(prev => ({ ...prev, interest: Number(e.target.value) }))}
                      className="flex-1 accent-red-600"
                    />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-8 text-right">
                      {researchForm.interest ?? 3}/5
                    </span>
                  </div>
                </div>

                <Select
                  label="Outreach Status"
                  value={researchForm.outreachStatus ?? 'To Reach Out'}
                  onChange={e =>
                    setResearchForm(prev => ({
                      ...prev,
                      outreachStatus: e.target.value as OutreachStatus,
                    }))
                  }
                >
                  <option value="To Reach Out">To Reach Out</option>
                  <option value="Reached Out">Reached Out</option>
                  <option value="Waiting for Reply">Waiting for Reply</option>
                </Select>
              </div>

              <Textarea
                label="Notes"
                placeholder="Shared major, mutual connections, interesting background..."
                value={researchForm.notes ?? ''}
                onChange={e => setResearchForm(prev => ({ ...prev, notes: e.target.value }))}
                className="mb-6"
              />

              <Button type="submit">
                {editingResearchId ? 'Update' : 'Save to Research'}
              </Button>
            </form>
          </Card>

          {/* Filter */}
          <Card className="mb-6 p-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by status:
              </label>
              <Select
                value={researchStatusFilter}
                onChange={e => setResearchStatusFilter(e.target.value as OutreachStatus | '')}
                className="w-52"
              >
                <option value="">All</option>
                <option value="To Reach Out">To Reach Out</option>
                <option value="Reached Out">Reached Out</option>
                <option value="Waiting for Reply">Waiting for Reply</option>
              </Select>
            </div>
          </Card>

          {/* List */}
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '250ms' }}>
            {researchContacts.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  {researchStatusFilter
                    ? 'No contacts match this filter.'
                    : 'No research contacts yet. Find people on LinkedIn and add them here!'}
                </p>
              </Card>
            ) : (
              researchContacts.map((contact, index) => (
                <Card
                  key={contact.id}
                  className="p-6 hover:shadow-lg transition-all animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      {/* Name + LinkedIn + status */}
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {contact.name}
                        </h3>
                        {contact.linkedin && (
                          <a
                            href={contact.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                          >
                            <Linkedin className="w-4 h-4" /> LinkedIn
                          </a>
                        )}
                        <Badge variant={outreachBadgeVariant(contact.outreachStatus)}>
                          {contact.outreachStatus}
                        </Badge>
                      </div>

                      {/* Overall interest */}
                      <div className="mb-3">
                        <StarRating value={contact.interest} />
                      </div>

                      {/* Companies */}
                      {contact.companies.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {contact.companies.map((entry, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                            >
                              <span className="text-gray-800 dark:text-gray-200 font-medium">
                                {entry.company}
                              </span>
                              {entry.position && (
                                <span className="text-gray-500 dark:text-gray-400 text-xs">
                                  · {entry.position}
                                </span>
                              )}
                              <span className="text-yellow-500 font-semibold">{entry.interest}/5</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {contact.notes && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{contact.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 min-w-fit">
                      {/* Quick status update */}
                      <Select
                        value={contact.outreachStatus}
                        onChange={e =>
                          updateResearchContact(contact.id, {
                            outreachStatus: e.target.value as OutreachStatus,
                          })
                        }
                        className="text-sm"
                      >
                        <option value="To Reach Out">To Reach Out</option>
                        <option value="Reached Out">Reached Out</option>
                        <option value="Waiting for Reply">Waiting for Reply</option>
                      </Select>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditResearch(contact)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDeleteResearch(contact.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {/* ── CONTACTS TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'contacts' && (
        <>
          {/* Add/Edit Contact Form */}
          <Card className="mb-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <form onSubmit={handleContactSubmit} className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingContactId ? 'Edit Contact' : 'Add New Contact'}
                </h2>
                {editingContactId && (
                  <Button type="button" variant="outline" size="sm" onClick={handleCancelEdit}>
                    <X className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <Input
                  label="Name"
                  required
                  placeholder="e.g., John Doe"
                  value={contactForm.name ?? ''}
                  onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                />
                <Input
                  label="Company"
                  placeholder="e.g., Microsoft"
                  value={contactForm.company ?? ''}
                  onChange={e => setContactForm({ ...contactForm, company: e.target.value })}
                />
                <Input
                  label="Position"
                  placeholder="e.g., Senior Recruiter"
                  value={contactForm.position ?? ''}
                  onChange={e => setContactForm({ ...contactForm, position: e.target.value })}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="john.doe@company.com"
                  value={contactForm.email ?? ''}
                  onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                />
                <Input
                  label="LinkedIn URL"
                  type="url"
                  placeholder="https://linkedin.com/in/johndoe"
                  value={contactForm.linkedin ?? ''}
                  onChange={e => setContactForm({ ...contactForm, linkedin: e.target.value })}
                />
                <Input
                  label="Phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={contactForm.phone ?? ''}
                  onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                />
                <Select
                  label="Connection Type"
                  value={contactForm.type ?? 'Career Fair'}
                  onChange={e => setContactForm({ ...contactForm, type: e.target.value as any })}
                >
                  <option value="Career Fair">Career Fair</option>
                  <option value="Alumni">Alumni</option>
                  <option value="Faculty">Faculty</option>
                  <option value="Referral">Referral</option>
                  <option value="Cold Outreach">Cold Outreach</option>
                  <option value="Event">Event</option>
                </Select>
                <div>
                  <Select
                    label="Relationship Strength"
                    value={contactForm.strength ?? 'Cold'}
                    onChange={e => setContactForm({ ...contactForm, strength: e.target.value as any })}
                  >
                    <option value="Cold">Cold</option>
                    <option value="Warm">Warm</option>
                    <option value="Hot">Hot</option>
                  </Select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Cold = never spoken, Warm = exchanged messages, Hot = strong rapport
                  </p>
                </div>
                <div>
                  <Select
                    label="Priority Ranking"
                    value={contactForm.ranking ?? 3}
                    onChange={e => setContactForm({ ...contactForm, ranking: Number(e.target.value) })}
                  >
                    <option value="5">⭐⭐⭐⭐⭐ (5 - Top Priority)</option>
                    <option value="4">⭐⭐⭐⭐ (4 - High)</option>
                    <option value="3">⭐⭐⭐ (3 - Medium)</option>
                    <option value="2">⭐⭐ (2 - Low)</option>
                    <option value="1">⭐ (1 - Minimal)</option>
                  </Select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    How much you want to stay in touch
                  </p>
                </div>
              </div>

              <Textarea
                label="Notes"
                placeholder="Personal details, conversation topics, preferences..."
                value={contactForm.notes ?? ''}
                onChange={e => setContactForm({ ...contactForm, notes: e.target.value })}
                className="mb-4"
              />

              <div className="flex gap-3">
                <Button type="submit">
                  {editingContactId ? 'Update Contact' : 'Add Contact'}
                </Button>
                {editingContactId && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>

          {/* Filter/Sort Controls */}
          <Card className="mb-6 p-4 animate-fade-in" style={{ animationDelay: '250ms' }}>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Filter by Rank:
                </label>
                <Select
                  value={rankFilter ?? ''}
                  onChange={e => setRankFilter(e.target.value ? Number(e.target.value) : null)}
                  className="w-48"
                >
                  <option value="">All Ranks</option>
                  <option value="5">⭐⭐⭐⭐⭐ (5)</option>
                  <option value="4">⭐⭐⭐⭐ (4)</option>
                  <option value="3">⭐⭐⭐ (3)</option>
                  <option value="2">⭐⭐ (2)</option>
                  <option value="1">⭐ (1)</option>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Sort Order:
                </label>
                <Select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="w-40"
                >
                  <option value="desc">Highest First</option>
                  <option value="asc">Lowest First</option>
                </Select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPinnedFirst}
                  onChange={e => setShowPinnedFirst(e.target.checked)}
                  className="w-4 h-4 text-northeastern-red bg-gray-100 border-gray-300 rounded focus:ring-northeastern-red focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Show Pinned First
                </span>
              </label>
            </div>
          </Card>

          {/* Contacts List */}
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
            {filteredAndSortedContacts.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-lg">
                  {rankFilter ? 'No contacts match this filter.' : 'No contacts added yet. Start networking!'}
                </p>
              </Card>
            ) : (
              filteredAndSortedContacts.map((contact, index) => (
                <Card
                  key={contact.id}
                  className="p-6 hover:shadow-lg transition-all animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                              {contact.name}
                            </h3>
                            <button
                              onClick={() => togglePin(contact)}
                              className={`transition-colors ${
                                contact.isPinned
                                  ? 'text-yellow-500 hover:text-yellow-600'
                                  : 'text-gray-300 dark:text-gray-600 hover:text-gray-400'
                              }`}
                              title={contact.isPinned ? 'Unpin contact' : 'Pin contact'}
                            >
                              <Pin className={`w-5 h-5 ${contact.isPinned ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                          <div className="flex items-center gap-1 mb-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < (contact.ranking ?? 0)
                                    ? 'text-yellow-500 fill-current'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                              />
                            ))}
                            {!!contact.ranking && (
                              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                                ({contact.ranking}/5)
                              </span>
                            )}
                          </div>
                          {contact.company && (
                            <p className="text-gray-600 dark:text-gray-400">
                              {contact.position ? `${contact.position} at ` : ''}{contact.company}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary">{contact.type}</Badge>
                          <Badge
                            variant={
                              contact.strength === 'Hot' ? 'success' :
                              contact.strength === 'Warm' ? 'warning' :
                              'default'
                            }
                          >
                            {contact.strength}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm mb-3">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-northeastern-red transition-colors"
                          >
                            <Mail className="w-4 h-4" />
                            {contact.email}
                          </a>
                        )}
                        {contact.linkedin && (
                          <a
                            href={contact.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-northeastern-red transition-colors"
                          >
                            <Linkedin className="w-4 h-4" />
                            LinkedIn
                          </a>
                        )}
                        {contact.phone && (
                          <a
                            href={`tel:${contact.phone}`}
                            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-northeastern-red transition-colors"
                          >
                            <Phone className="w-4 h-4" />
                            {contact.phone}
                          </a>
                        )}
                      </div>

                      {contact.notes && (
                        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{contact.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditContact(contact)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteContact(contact.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </>
      )}

      {/* ── FOLLOW-UPS TAB ───────────────────────────────────────────────── */}
      {activeTab === 'followups' && (
        <>
          <Card id="followup-form" className="mb-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <form onSubmit={handleFollowupSubmit} className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Add Follow-Up Reminder
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="Company"
                  required
                  placeholder="e.g., Meta"
                  value={followupForm.company ?? ''}
                  onChange={e => setFollowupForm({ ...followupForm, company: e.target.value })}
                />
                <Input
                  label="Contact Person"
                  placeholder="e.g., Sarah Johnson"
                  value={followupForm.contact ?? ''}
                  onChange={e => setFollowupForm({ ...followupForm, contact: e.target.value })}
                />
                <Select
                  label="Task Type"
                  value={followupForm.type ?? 'Thank You'}
                  onChange={e => setFollowupForm({ ...followupForm, type: e.target.value as any })}
                >
                  <option value="Thank You">Thank You Email</option>
                  <option value="Check-in">Check-in</option>
                  <option value="Application Status">Application Status</option>
                  <option value="LinkedIn Connection">LinkedIn Connection</option>
                </Select>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      required
                      value={followupForm.dueDate ?? ''}
                      onChange={e => setFollowupForm({ ...followupForm, dueDate: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setFollowupForm({ ...followupForm, dueDate: getTodayDate() })}
                    >
                      Today
                    </Button>
                  </div>
                </div>

                <Select
                  label="Priority"
                  value={followupForm.priority ?? 'Medium'}
                  onChange={e => setFollowupForm({ ...followupForm, priority: e.target.value as any })}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </Select>

                <Select
                  label="Status"
                  value={followupForm.status ?? 'Pending'}
                  onChange={e => setFollowupForm({ ...followupForm, status: e.target.value as any })}
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                </Select>
              </div>

              <div className="mt-4">
                <Button type="submit">Add Follow-Up</Button>
              </div>
            </form>
          </Card>

          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '300ms' }}>
            {sortedFollowups.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
                  No follow-ups scheduled yet.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('followup-form')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Add your first follow-up
                </Button>
              </Card>
            ) : (
              sortedFollowups.map((followup, index) => {
                const overdue = followup.status === 'Pending' && isOverdue(followup.dueDate);
                return (
                  <Card
                    key={followup.id}
                    className={`p-6 hover:shadow-lg transition-all animate-slide-up ${
                      overdue ? 'border-red-300 dark:border-red-800' : ''
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {followup.company}
                              </h3>
                              {overdue && (
                                <Badge variant="danger" className="flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Overdue
                                </Badge>
                              )}
                            </div>
                            {followup.contact && (
                              <p className="text-gray-600 dark:text-gray-400">
                                Contact: {followup.contact}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{followup.type}</Badge>
                          <Badge className={getPriorityColor(followup.priority)}>
                            {followup.priority} Priority
                          </Badge>
                          <Badge className={getStatusColor(followup.status)}>
                            {followup.status}
                          </Badge>
                          <Badge variant="default" className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Due: {formatDate(followup.dueDate)}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {followup.status === 'Pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateFollowUp(followup.id, { status: 'Completed' })}
                          >
                            Mark Complete
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteFollowup(followup.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
