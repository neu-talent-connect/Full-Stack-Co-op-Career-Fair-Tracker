'use client';

import { useState } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { ChevronDown, ChevronUp, Trash2, ExternalLink } from 'lucide-react';
import { formatDate, getStatusColor, getInterestDisplay, getTodayDate } from '@/lib/utils';
import { Job } from '@/types';

export default function ApplicationsPage() {
  const router = useRouter();
  const { data, addJob, deleteJob } = useAppData();
  const { showToast } = useToast();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState<Partial<Job>>({
    status: 'Not Started',
    interest: 3,
    resume: 'None',
    coverLetter: 'None',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company || !formData.title) return;

    try {
      await addJob(formData as any);
    } catch {
      // Provider already shows an error toast; keep the form populated
      return;
    }
    setFormData({
      status: 'Not Started',
      interest: 3,
      resume: 'None',
      coverLetter: 'None',
    });
    setShowAdvanced(false);

    showToast('Application added', 'success');
    router.push('/');
  };

  const handleDelete = (id: string) => {
    deleteJob(id);
  };

  const sortedJobs = [...data.jobs].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Add Application
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Add detailed job applications here. They'll appear in the Dashboard spreadsheet.
        </p>
      </div>

      {/* Add Application Form */}
      <Card className="mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Basic Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Company"
              required
              placeholder="e.g., Amazon"
              value={formData.company || ''}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            />
            
            <Input
              label="Position Title"
              required
              placeholder="e.g., Data Analyst Co-op"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />

            <Select
              label="Application Status"
              value={formData.status || 'Not Started'}
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

            <Select
              label="Interest Level"
              value={formData.interest || 3}
              onChange={(e) => setFormData({ ...formData, interest: Number(e.target.value) })}
            >
              <option value="5">5 - Dream Job</option>
              <option value="4">4 - Very Interested</option>
              <option value="3">3 - Interested</option>
              <option value="2">2 - Backup Option</option>
              <option value="1">1 - Practice</option>
            </Select>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Date Applied
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={formData.dateApplied || ''}
                  onChange={(e) => setFormData({ ...formData, dateApplied: e.target.value })}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setFormData({ ...formData, dateApplied: getTodayDate() })}
                >
                  Today
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Deadline
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
            label="Notes"
            placeholder="Any additional info..."
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="mb-4"
          />

          {/* Show More Fields Button */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mb-4"
          >
            {showAdvanced ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Hide Advanced Fields
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Show Advanced Fields
              </>
            )}
          </Button>

          {/* Advanced Fields */}
          {showAdvanced && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Additional Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                  label="Job ID/Req Number"
                  placeholder="e.g., REQ-2025-1234"
                  value={formData.jobId || ''}
                  onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
                />

                <Input
                  label="Location"
                  placeholder="e.g., Boston, MA"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />

                <Input
                  label="Salary Range"
                  placeholder="e.g., $25-30/hour"
                  value={formData.salary || ''}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                />

                <Input
                  label="Application Cycle"
                  placeholder="e.g., Fall 2026"
                  value={formData.applicationCycle || ''}
                  onChange={(e) => setFormData({ ...formData, applicationCycle: e.target.value })}
                />

                <Input
                  label="Date Posted"
                  type="date"
                  value={formData.datePosted || ''}
                  onChange={(e) => setFormData({ ...formData, datePosted: e.target.value })}
                />

                <Input
                  label="Contact Person"
                  placeholder="e.g., Jane Smith"
                  value={formData.contact || ''}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                />

                <Input
                  label="Contact Email"
                  type="email"
                  placeholder="jane@company.com"
                  value={formData.contactEmail || ''}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />

                <Input
                  label="Contact Phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.contactPhone || ''}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                />

                <Select
                  label="Resume Version"
                  value={formData.resume || 'None'}
                  onChange={(e) => setFormData({ ...formData, resume: e.target.value as any })}
                >
                  <option value="None">None</option>
                  <option value="Standard">Standard</option>
                  <option value="Tailored">Tailored</option>
                </Select>

                <Select
                  label="Cover Letter"
                  value={formData.coverLetter || 'None'}
                  onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value as any })}
                >
                  <option value="None">None</option>
                  <option value="Required">Required</option>
                  <option value="Submitted">Submitted</option>
                </Select>

                <Input
                  label="Job Posting URL"
                  type="url"
                  placeholder="https://..."
                  value={formData.url || ''}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="md:col-span-2"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button type="submit">
              Add Application
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      {/* Recent Applications */}
      {sortedJobs.length > 0 && (
        <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Recent Applications
          </h2>
          <div className="space-y-4">
            {sortedJobs.slice(0, 5).map((job, index) => {
              const interestDisplay = getInterestDisplay(job.interest);
              return (
                <Card 
                  key={job.id} 
                  className="p-6 hover:shadow-lg transition-all animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <span className={`text-xl font-bold ${interestDisplay.color}`}>
                          {job.interest}
                        </span>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {job.company}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400">
                            {job.title}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                        {job.location && (
                          <Badge variant="secondary">{job.location}</Badge>
                        )}
                        {job.dateApplied && (
                          <Badge variant="default">
                            Applied: {formatDate(job.dateApplied)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Posting
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(job.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
