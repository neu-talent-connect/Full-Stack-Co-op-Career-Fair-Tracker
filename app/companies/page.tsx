'use client';

import { useRef, useState } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Trash2, Calendar, Pencil, MapPin, ExternalLink } from 'lucide-react';
import { formatDate, getInterestDisplay, getTodayDate } from '@/lib/utils';
import { Company } from '@/types';

const EMPTY_FORM: Partial<Company> = { interest: 3, optFriendly: '', status: '' };

export default function CompaniesPage() {
  const { data, addCompany, updateCompany, deleteCompany } = useAppData();
  const [formData, setFormData] = useState<Partial<Company>>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingId) {
      updateCompany(editingId, formData);
    } else {
      addCompany(formData as any);
    }
    setFormData(EMPTY_FORM);
    setEditingId(null);
  };

  const handleEdit = (company: Company) => {
    setFormData(company);
    setEditingId(company.id);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCancel = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this company?')) {
      deleteCompany(id);
      if (editingId === id) handleCancel();
    }
  };

  const sortedCompanies = [...data.companies].sort((a, b) =>
    b.interest - a.interest
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Companies
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Research and track companies before you apply.
        </p>
      </div>

      {/* Add/Edit Company Form */}
      <Card ref={formRef} className="mb-8 animate-fade-in scroll-mt-24" style={{ animationDelay: '100ms' }}>
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            {editingId ? 'Edit Company' : 'Add Company'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <Input
              label="Company Name"
              required
              placeholder="e.g., Google"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <Select
              label="Industry"
              value={formData.industry || ''}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            >
              <option value="">Select Industry</option>
              <option value="Technology">Technology</option>
              <option value="Finance">Finance</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Consulting">Consulting</option>
              <option value="Retail">Retail</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Education">Education</option>
              <option value="Non-profit">Non-profit</option>
              <option value="Other">Other</option>
            </Select>

            <Select
              label="Interest Level (1-5)"
              value={formData.interest || 3}
              onChange={(e) => setFormData({ ...formData, interest: Number(e.target.value) })}
            >
              <option value="5">5 - Extremely Interested</option>
              <option value="4">4 - Very Interested</option>
              <option value="3">3 - Interested</option>
              <option value="2">2 - Somewhat Interested</option>
              <option value="1">1 - Low Interest</option>
            </Select>

            <Select
              label="Application Status"
              value={formData.status || ''}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Company['status'] })}
            >
              <option value="">Not Set</option>
              <option value="Researching">Researching</option>
              <option value="To Apply">To Apply</option>
              <option value="Applied">Applied</option>
              <option value="Interviewing">Interviewing</option>
              <option value="Offer">Offer</option>
              <option value="Rejected">Rejected</option>
            </Select>

            <Input
              label="Location"
              placeholder="e.g., Boston, MA / Remote"
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />

            <Input
              label="Website / Careers URL"
              type="url"
              placeholder="e.g., https://careers.google.com"
              value={formData.website || ''}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            />

            <Input
              label="Booth Number/Session Time"
              placeholder="e.g., Booth 42 or 2:00 PM Virtual"
              value={formData.booth || ''}
              onChange={(e) => setFormData({ ...formData, booth: e.target.value })}
            />

            <Input
              label="Recruiter Name"
              placeholder="e.g., Jane Smith"
              value={formData.recruiter || ''}
              onChange={(e) => setFormData({ ...formData, recruiter: e.target.value })}
            />

            <Input
              label="Position of Interest"
              placeholder="e.g., Software Engineer Co-op"
              value={formData.position || ''}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            />

            <Select
              label="OPT/CPT Friendly?"
              value={formData.optFriendly || ''}
              onChange={(e) => setFormData({ ...formData, optFriendly: e.target.value as any })}
            >
              <option value="">Unknown</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
              <option value="Case-by-case">Case by Case</option>
            </Select>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Application Deadline
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={formData.deadline || ''}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setFormData({ ...formData, deadline: getTodayDate() })}
                >
                  Today
                </Button>
              </div>
            </div>
          </div>

          <Textarea
            label="Key Takeaways"
            placeholder="What excited you about this company? Any concerns?"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="mb-4"
          />

          <div className="flex gap-2">
            <Button type="submit">
              {editingId ? 'Update Company' : 'Add Company'}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Companies List */}
      <div className="space-y-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
        {sortedCompanies.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              No companies added yet. Add your first company above!
            </p>
          </Card>
        ) : (
          sortedCompanies.map((company, index) => {
            const interestDisplay = getInterestDisplay(company.interest);
            return (
              <Card
                key={company.id}
                className="p-6 hover:shadow-lg transition-all animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <span className={`text-2xl font-bold ${interestDisplay.color}`}>
                        {company.interest}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {company.name}
                          </h3>
                          {company.status && (
                            <Badge variant="default">{company.status}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {company.industry && (
                            <Badge variant="secondary">
                              {company.industry}
                            </Badge>
                          )}
                          {company.location && (
                            <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                              <MapPin className="w-3.5 h-3.5" />
                              {company.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {company.position && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Position: </span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {company.position}
                          </span>
                        </div>
                      )}
                      {company.recruiter && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Recruiter: </span>
                          <span className="text-gray-900 dark:text-white">
                            {company.recruiter}
                          </span>
                        </div>
                      )}
                      {company.booth && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Booth/Session: </span>
                          <span className="text-gray-900 dark:text-white">
                            {company.booth}
                          </span>
                        </div>
                      )}
                      {company.optFriendly && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">OPT/CPT: </span>
                          <Badge
                            variant={company.optFriendly === 'Yes' ? 'success' : 'default'}
                          >
                            {company.optFriendly}
                          </Badge>
                        </div>
                      )}
                      {company.website && (
                        <div className="flex items-center gap-2 min-w-0">
                          <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
                          <a
                            href={company.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-northeastern-red dark:text-red-400 hover:underline truncate"
                          >
                            {company.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                      {company.deadline && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-500 dark:text-gray-400">Deadline: </span>
                          <span className="text-gray-900 dark:text-white">
                            {formatDate(company.deadline)}
                          </span>
                        </div>
                      )}
                    </div>

                    {company.notes && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {company.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex md:flex-col gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(company)}
                      aria-label="Edit company"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(company.id)}
                      aria-label="Delete company"
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
    </div>
  );
}
