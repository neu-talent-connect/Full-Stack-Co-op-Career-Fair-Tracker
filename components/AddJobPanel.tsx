'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { AutocompleteInput } from '@/components/ui/AutocompleteInput';
import { usePositionSuggestions } from '@/hooks/usePositionSuggestions';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { getTodayDate } from '@/lib/utils';

interface AddJobPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (jobData: any) => void | Promise<void>;
  //
}

export function AddJobPanel({ isOpen, onClose, onAdd }: AddJobPanelProps) {
  const { positions, addPosition } = usePositionSuggestions();
  const [formData, setFormData] = useState({
    company: '',
    title: '',
    contact: '',
    contactEmail: '',
    status: 'Not Started' as const,
    interest: 3,
    deadline: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company.trim()) {
      alert('Company name is required');
      return;
    }

    // Add position to suggestions if provided
    if (formData.title.trim()) {
      addPosition(formData.title.trim());
    }

    try {
      await onAdd(formData);
    } catch {
      // Provider already shows an error toast; keep the form populated
      return;
    }

    // Reset form
    setFormData({
      company: '',
      title: '',
      contact: '',
      contactEmail: '',
      status: 'Not Started',
      interest: 3,
      deadline: '',
      notes: '',
    });
  };

  const handleSetToday = () => {
    setFormData({ ...formData, deadline: getTodayDate() });
  };

  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-in Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add Application"
        className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-y-auto animate-slide-in-right"
      >
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Add Application
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Fill in the details below
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
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
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
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
                value={formData.title}
                onChange={(value) => setFormData({ ...formData, title: value })}
                suggestions={positions}
                placeholder="e.g., Software Engineer (optional)"
              />
            </div>

            {/* Status */}
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
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
              value={formData.interest}
              onChange={(e) => setFormData({ ...formData, interest: Number(e.target.value) })}
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
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
              <button
                type="button"
                onClick={handleSetToday}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
              >
                Set to today
              </button>
            </div>

            {/* Contact Name */}
            <Input
              label="Contact Name"
              placeholder="e.g., Sarah Johnson"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            />

            {/* Contact Email */}
            <Input
              label="Contact Email"
              type="email"
              placeholder="sarah@company.com"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
            />

            {/* Notes */}
            <Textarea
              label="Notes"
              placeholder="Any additional notes about this application..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
            />

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                💡 <strong>Tip:</strong> Need more fields like location, salary, or resume version?
                Use the full application form from the{' '}
                <a href="/applications" className="underline font-medium">
                  Applications page
                </a>
                .
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex gap-3">
              <Button type="submit" className="flex-1">
                Add Application
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

// a
// stats