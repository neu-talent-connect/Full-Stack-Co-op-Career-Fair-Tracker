'use client';

import { useState, useEffect, useRef } from 'react';
import { Job, JobStatus } from '@/types';
import { formatDate, getStatusColor, getInterestDisplay } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Trash2, ExternalLink, Mail, Phone, User, X, Copy, Pencil } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import { usePositionSuggestions } from '@/hooks/usePositionSuggestions';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { getTodayDate } from '@/lib/utils';

interface SpreadsheetTableProps {
  jobs: Job[];
  onUpdate: (id: string, updates: Partial<Job>) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (job: Job) => void;
  showRecommendedFields?: boolean;
}

interface ContactEditData {
  contact: string;
  contactEmail: string;
  contactPhone: string;
}

interface JobEditData {
  company: string;
  title: string;
  status: JobStatus;
  interest: number;
  deadline: string;
  contact: string;
  contactEmail: string;
  notes: string;
}

export function SpreadsheetTable({ jobs, onUpdate, onDelete, onDuplicate, showRecommendedFields = false }: SpreadsheetTableProps) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [notesColumnWidth, setNotesColumnWidth] = useState<number>(250);
  const [isResizing, setIsResizing] = useState(false);
  const [editingContact, setEditingContact] = useState<{ id: string; data: ContactEditData } | null>(null);
  const [editingJob, setEditingJob] = useState<{ id: string; data: JobEditData } | null>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(250);
  const { positions, addPosition } = usePositionSuggestions();

  // Close modals on Escape
  useEscapeKey(() => setEditingContact(null), !!editingContact);
  useEscapeKey(() => setEditingJob(null), !!editingJob);

  // Load saved column width from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notesColumnWidth');
    if (saved) {
      setNotesColumnWidth(parseInt(saved));
    }
  }, []);

  // Save column width to localStorage
  useEffect(() => {
    localStorage.setItem('notesColumnWidth', notesColumnWidth.toString());
  }, [notesColumnWidth]);

  const handleCellClick = (id: string, field: string, currentValue: any) => {
    setEditingCell({ id, field });
    setEditValue(currentValue || '');
  };

  const handleCellBlur = () => {
    if (editingCell) {
      onUpdate(editingCell.id, { [editingCell.field]: editValue });
      
      // If editing position (title), add to suggestions
      if (editingCell.field === 'title' && editValue.trim()) {
        addPosition(editValue.trim());
      }
      
      setEditingCell(null);
    }
  };

  // Immediate save for dropdowns (status, interest)
  const handleDropdownChange = (value: string) => {
    setEditValue(value);
    if (editingCell) {
      // Interest is numeric — saving the raw string breaks Number comparisons downstream
      const parsedValue = editingCell.field === 'interest' ? Number(value) : value;
      onUpdate(editingCell.id, { [editingCell.field]: parsedValue });
      setEditingCell(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // Shared props so editable cells work for keyboard users too
  const editableCellProps = (startEdit: () => void) => ({
    onClick: startEdit,
    tabIndex: 0,
    role: 'button',
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.target !== e.currentTarget) return; // ignore keys from the inline editor
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startEdit();
      }
    },
  });

  // Contact editing handlers
  const handleContactClick = (id: string, job: Job) => {
    setEditingContact({
      id,
      data: {
        contact: job.contact || '',
        contactEmail: job.contactEmail || '',
        contactPhone: job.contactPhone || '',
      },
    });
  };

  const handleContactSave = () => {
    if (editingContact) {
      onUpdate(editingContact.id, editingContact.data);
      setEditingContact(null);
    }
  };

  // Job editing handlers
  const handleJobEditClick = (job: Job) => {
    setEditingJob({
      id: job.id,
      data: {
        company: job.company || '',
        title: job.title || '',
        status: job.status,
        interest: job.interest ?? 3,
        deadline: job.deadline || '',
        contact: job.contact || '',
        contactEmail: job.contactEmail || '',
        notes: job.notes || '',
      },
    });
  };

  const handleJobEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;

    if (!editingJob.data.company.trim()) {
      alert('Company name is required');
      return;
    }

    if (editingJob.data.title.trim()) {
      addPosition(editingJob.data.title.trim());
    }

    onUpdate(editingJob.id, editingJob.data);
    setEditingJob(null);
  };

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = notesColumnWidth;
  };

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const diff = e.clientX - startXRef.current;
      const newWidth = Math.max(150, Math.min(600, startWidthRef.current + diff));
      setNotesColumnWidth(newWidth);
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing]);

  const renderCell = (job: Job, field: keyof Job) => {
    const isEditing = editingCell?.id === job.id && editingCell?.field === field;
    const value = job[field];

    if (isEditing) {
      if (field === 'status') {
        return (
          <select
            autoFocus
            value={editValue}
            onChange={(e) => handleDropdownChange(e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-northeastern-red dark:bg-gray-800 dark:border-gray-600"
          >
            <option value="Not Started">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="Interview">Interview</option>
            <option value="Rejected">Rejected</option>
            <option value="Offer">Offer</option>
          </select>
        );
      } else if (field === 'interest') {
        return (
          <select
            autoFocus
            value={editValue}
            onChange={(e) => handleDropdownChange(e.target.value)}
            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-northeastern-red dark:bg-gray-800 dark:border-gray-600"
          >
            <option value="5">5 - Dream Job</option>
            <option value="4">4 - Very Interested</option>
            <option value="3">3 - Interested</option>
            <option value="2">2 - Backup</option>
            <option value="1">1 - Practice</option>
          </select>
        );
      } else if (field === 'deadline' || field === 'dateApplied' || field === 'datePosted') {
        return (
          <input
            autoFocus
            type="date"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleCellBlur}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-northeastern-red dark:bg-gray-800 dark:border-gray-600"
          />
        );
      } else if (field === 'notes') {
        return (
          <textarea
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleCellBlur}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-northeastern-red dark:bg-gray-800 dark:border-gray-600 resize-none"
            rows={3}
          />
        );
      } else if (field === 'title') {
        // Use autocomplete for position field
        return (
          <AutocompleteInput
            autoFocus
            value={editValue}
            onChange={setEditValue}
            onBlur={handleCellBlur}
            suggestions={positions}
            placeholder="Enter position..."
          />
        );
      } else {
        return (
          <input
            autoFocus
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleCellBlur}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-northeastern-red dark:bg-gray-800 dark:border-gray-600"
          />
        );
      }
    }

    // Display value
    if (field === 'status') {
      return (
        <div className="inline-block">
          <Badge className={getStatusColor(value as string)}>
            {value}
          </Badge>
        </div>
      );
    } else if (field === 'interest') {
      const display = getInterestDisplay(value as number);
      return <span className={display.color}>{value}</span>;
    } else if (field === 'deadline' || field === 'dateApplied' || field === 'datePosted') {
      return <span className="text-sm">{formatDate(value as string)}</span>;
    } else if (field === 'notes') {
      const noteText = value as string;
      if (!noteText) return <span className="text-gray-400 text-sm">-</span>;
      return (
        <span className="text-sm text-gray-700 dark:text-gray-300" title={noteText}>
          {noteText}
        </span>
      );
    } else {
      return <span className="text-sm">{value || '-'}</span>;
    }
  };

  const renderContactCell = (job: Job) => {
    const hasContact = job.contact || job.contactEmail || job.contactPhone;
    
    if (!hasContact) {
      return (
        <span className="text-gray-400 text-sm">-</span>
      );
    }

    return (
      <div className="flex items-center gap-2 group">
        <span className="text-sm truncate flex-1" title={job.contact || undefined}>
          {job.contact || '-'}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {job.contactEmail && (
            <a
              href={`mailto:${job.contactEmail}`}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title={job.contactEmail}
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </a>
          )}
          {job.contactPhone && (
            <a
              href={`tel:${job.contactPhone}`}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title={job.contactPhone}
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
            </a>
          )}
        </div>
      </div>
    );
  };

  if (jobs.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          No applications yet. Add your first job application!
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Interest
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                {showRecommendedFields && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Salary
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date Applied
                    </th>
                  </>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Deadline
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative"
                  style={{ width: `${notesColumnWidth}px` }}
                >
                  <div className="flex items-center justify-between">
                    <span>Notes</span>
                    <div
                      ref={resizeRef}
                      onMouseDown={handleResizeStart}
                      className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-northeastern-red transition-colors"
                      title="Drag to resize"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {jobs.map((job) => (
                <tr 
                  key={job.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td
                    className="px-4 py-3 whitespace-nowrap cursor-pointer"
                    {...editableCellProps(() => handleCellClick(job.id, 'interest', job.interest))}
                  >
                    {renderCell(job, 'interest')}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap cursor-pointer font-medium"
                    {...editableCellProps(() => handleCellClick(job.id, 'company', job.company))}
                  >
                    {renderCell(job, 'company')}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap cursor-pointer"
                    {...editableCellProps(() => handleCellClick(job.id, 'title', job.title))}
                  >
                    {renderCell(job, 'title')}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap cursor-pointer"
                    {...editableCellProps(() => handleContactClick(job.id, job))}
                  >
                    {renderContactCell(job)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div
                      className="cursor-pointer"
                      {...editableCellProps(() => handleCellClick(job.id, 'status', job.status))}
                    >
                      {renderCell(job, 'status')}
                    </div>
                  </td>
                  {showRecommendedFields && (
                    <>
                      <td
                        className="px-4 py-3 whitespace-nowrap cursor-pointer"
                        {...editableCellProps(() => handleCellClick(job.id, 'location', job.location))}
                      >
                        {renderCell(job, 'location')}
                      </td>
                      <td
                        className="px-4 py-3 whitespace-nowrap cursor-pointer"
                        {...editableCellProps(() => handleCellClick(job.id, 'salary', job.salary))}
                      >
                        {renderCell(job, 'salary')}
                      </td>
                      <td
                        className="px-4 py-3 whitespace-nowrap cursor-pointer"
                        {...editableCellProps(() => handleCellClick(job.id, 'dateApplied', job.dateApplied))}
                      >
                        {renderCell(job, 'dateApplied')}
                      </td>
                    </>
                  )}
                  <td
                    className="px-4 py-3 whitespace-nowrap cursor-pointer"
                    {...editableCellProps(() => handleCellClick(job.id, 'deadline', job.deadline))}
                  >
                    {renderCell(job, 'deadline')}
                  </td>
                  <td
                    className="px-4 py-3 cursor-pointer"
                    style={{
                      width: `${notesColumnWidth}px`,
                      maxWidth: `${notesColumnWidth}px`,
                    }}
                    {...editableCellProps(() => handleCellClick(job.id, 'notes', job.notes))}
                  >
                    <div className="overflow-hidden text-ellipsis">
                      {renderCell(job, 'notes')}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-northeastern-red transition-colors"
                          title="View job posting"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {onDuplicate && (
                        <button
                          onClick={() => onDuplicate(job)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Duplicate row"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleJobEditClick(job)}
                        className="text-gray-400 hover:text-northeastern-red transition-colors"
                        title="Edit application"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(job.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete application"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Column resize guide */}
        {isResizing && (
          <div className="fixed inset-0 z-50 cursor-col-resize" />
        )}
      </Card>

      {/* Contact Edit Modal */}
      {editingContact && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit Contact"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
        >
          <Card className="w-full max-w-md">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Edit Contact
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Update contact information
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingContact(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <Input
                  label="Contact Name"
                  placeholder="e.g., Sarah Johnson"
                  value={editingContact.data.contact}
                  onChange={(e) => setEditingContact({
                    ...editingContact,
                    data: { ...editingContact.data, contact: e.target.value }
                  })}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="sarah@company.com"
                  value={editingContact.data.contactEmail}
                  onChange={(e) => setEditingContact({
                    ...editingContact,
                    data: { ...editingContact.data, contactEmail: e.target.value }
                  })}
                />
                <Input
                  label="Phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={editingContact.data.contactPhone}
                  onChange={(e) => setEditingContact({
                    ...editingContact,
                    data: { ...editingContact.data, contactPhone: e.target.value }
                  })}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={handleContactSave} className="flex-1">
                  Save Contact
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingContact(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Job Edit Panel */}
      {editingJob && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-fade-in"
            onClick={() => setEditingJob(null)}
          />

          {/* Slide-in Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit Application"
            className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-y-auto animate-slide-in-right"
          >
            <form onSubmit={handleJobEditSave} className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Edit Application
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Update the details below
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Form Fields */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Company - REQUIRED */}
                <div>
                  <Input
                    label="Company"
                    required
                    placeholder="e.g., Google"
                    value={editingJob.data.company}
                    onChange={(e) => setEditingJob({
                      ...editingJob,
                      data: { ...editingJob.data, company: e.target.value }
                    })}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    * Required field
                  </p>
                </div>

                {/* Position - OPTIONAL with Autocomplete */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Position
                  </label>
                  <AutocompleteInput
                    value={editingJob.data.title}
                    onChange={(value) => setEditingJob({
                      ...editingJob,
                      data: { ...editingJob.data, title: value }
                    })}
                    suggestions={positions}
                    placeholder="e.g., Software Engineer (optional)"
                  />
                </div>

                {/* Status */}
                <Select
                  label="Status"
                  value={editingJob.data.status}
                  onChange={(e) => setEditingJob({
                    ...editingJob,
                    data: { ...editingJob.data, status: e.target.value as JobStatus }
                  })}
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Interview">Interview</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Offer">Offer</option>
                </Select>

                {/* Interest Level */}
                <Select
                  label="Interest Level"
                  value={editingJob.data.interest}
                  onChange={(e) => setEditingJob({
                    ...editingJob,
                    data: { ...editingJob.data, interest: Number(e.target.value) }
                  })}
                >
                  <option value="5">5 ⭐ - Dream Job</option>
                  <option value="4">4 ⭐ - Very Interested</option>
                  <option value="3">3 ⭐ - Interested</option>
                  <option value="2">2 ⭐ - Backup</option>
                  <option value="1">1 ⭐ - Practice</option>
                </Select>

                {/* Deadline */}
                <div>
                  <Input
                    label="Deadline"
                    type="date"
                    value={editingJob.data.deadline}
                    onChange={(e) => setEditingJob({
                      ...editingJob,
                      data: { ...editingJob.data, deadline: e.target.value }
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setEditingJob({
                      ...editingJob,
                      data: { ...editingJob.data, deadline: getTodayDate() }
                    })}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                  >
                    Set to today
                  </button>
                </div>

                {/* Contact Name */}
                <Input
                  label="Contact Name"
                  placeholder="e.g., Sarah Johnson"
                  value={editingJob.data.contact}
                  onChange={(e) => setEditingJob({
                    ...editingJob,
                    data: { ...editingJob.data, contact: e.target.value }
                  })}
                />

                {/* Contact Email */}
                <Input
                  label="Contact Email"
                  type="email"
                  placeholder="sarah@company.com"
                  value={editingJob.data.contactEmail}
                  onChange={(e) => setEditingJob({
                    ...editingJob,
                    data: { ...editingJob.data, contactEmail: e.target.value }
                  })}
                />

                {/* Notes */}
                <Textarea
                  label="Notes"
                  placeholder="Any additional notes about this application..."
                  value={editingJob.data.notes}
                  onChange={(e) => setEditingJob({
                    ...editingJob,
                    data: { ...editingJob.data, notes: e.target.value }
                  })}
                  rows={4}
                />
              </div>

              {/* Footer Actions */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1">
                    Save Changes
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setEditingJob(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
