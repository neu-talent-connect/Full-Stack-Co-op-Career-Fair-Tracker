'use client';

import { useState, useEffect } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Plus, Download, Upload, Filter, X } from 'lucide-react';
import { SpreadsheetTable } from '@/components/dashboard/SpreadsheetTable';
import { AddJobPanel } from '@/components/AddJobPanel';
import { exportToCSV } from '@/lib/utils';
import { DashboardFilters } from '@/types';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';
import { GettingStartedBanner } from '@/components/onboarding/GettingStartedBanner';

export default function SpreadsheetPage() {
  const { data, updateJob, deleteJob, addJob, loadSampleData } = useAppData();
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showGettingStarted, setShowGettingStarted] = useState(false);
  const [showRecommendedFields, setShowRecommendedFields] = useState(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('showRecommendedFields');
      return saved === 'true';
    }
    return false;
  });

  // Check if first time user
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    const hasData = data.jobs.length > 0;
    
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    } else if (!hasData) {
      setShowGettingStarted(true);
    }
  }, [data.jobs.length]);

  const handleWelcomeClose = () => {
    setShowWelcome(false);
    localStorage.setItem('hasSeenWelcome', 'true');
    if (data.jobs.length === 0) {
      setShowGettingStarted(true);
    }
  };

  const handleDismissGettingStarted = () => {
    setShowGettingStarted(false);
    localStorage.setItem('dismissedGettingStarted', 'true');
  };

  // Filter jobs
  const filteredJobs = data.jobs.filter((job) => {
    if (filters.status && job.status !== filters.status) return false;
    if (filters.interest && job.interest !== Number(filters.interest)) return false;
    if (filters.applicationCycle && job.applicationCycle !== filters.applicationCycle) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return (
        job.company.toLowerCase().includes(search) ||
        job.title.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const handleExport = () => {
    exportToCSV(filteredJobs, 'job-applications');
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleAddJob = (jobData: any) => {
    addJob(jobData);
    setShowAddPanel(false);
  };

  const handleDuplicateJob = (job: any) => {
    // Create a copy with a new ID and reset some fields
    const duplicatedJob = {
      ...job,
      id: undefined, // Will generate new ID
      createdAt: undefined,
      updatedAt: undefined,
    };
    addJob(duplicatedJob);
  };

  const toggleRecommendedFields = () => {
    const newValue = !showRecommendedFields;
    setShowRecommendedFields(newValue);
    localStorage.setItem('showRecommendedFields', String(newValue));
  };

  const handleLoadSampleData = () => {
    // Safety check: if user has data, show confirmation
    if (data.jobs.length > 0 || data.companies.length > 0 || data.contacts.length > 0) {
      const confirmed = window.confirm(
        '⚠️ WARNING: This will REPLACE all your current data with sample data.\n\n' +
        'All your applications, companies, and contacts will be lost.\n\n' +
        'Are you absolutely sure you want to continue?'
      );
      
      if (!confirmed) {
        return;
      }
    }
    
    loadSampleData();
  };

  return (
    <>
      {/* Welcome Modal for First-Time Users */}
      {showWelcome && (
        <WelcomeModal
          onClose={handleWelcomeClose}
        />
      )}
      
      <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50 dark:bg-gray-950">
        {/* Toolbar */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex-shrink-0">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-4">
          {/* Left side */}
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white hidden sm:block">
              My Applications
            </h1>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({filteredJobs.length} {filteredJobs.length === 1 ? 'job' : 'jobs'})
            </span>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={showRecommendedFields}
                onChange={toggleRecommendedFields}
                className="w-4 h-4 text-northeastern-red bg-gray-100 border-gray-300 rounded focus:ring-northeastern-red focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="whitespace-nowrap">Show Recommended</span>
            </label>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-gray-100 dark:bg-gray-800' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            
            {/* Only show Sample Data button when user has no data */}
            {data.jobs.length === 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleLoadSampleData}
                title="Load sample data to explore features"
              >
                <Upload className="w-4 h-4 mr-2" />
                Sample Data
              </Button>
            )}
            
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              disabled={filteredJobs.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            
            <Button
              size="sm"
              onClick={() => setShowAddPanel(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Row
            </Button>
          </div>
        </div>

        {/* Filters Row */}
        {showFilters && (
          <div className="max-w-[1920px] mx-auto mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input
                placeholder="Search company or position..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
              <Select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              >
                <option value="">All Status</option>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Interview">Interview</option>
                <option value="Rejected">Rejected</option>
                <option value="Offer">Offer</option>
              </Select>
              <Select
                value={filters.interest || ''}
                onChange={(e) => setFilters({ ...filters, interest: e.target.value as any })}
              >
                <option value="">All Interest Levels</option>
                <option value="5">5 - Dream Job</option>
                <option value="4">4 - Very Interested</option>
                <option value="3">3 - Interested</option>
                <option value="2">2 - Backup</option>
                <option value="1">1 - Practice</option>
              </Select>
              {Object.values(filters).some(v => v) && (
                <Button variant="outline" size="sm" onClick={handleClearFilters}>
                  <X className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

        {/* Spreadsheet Table - Full height */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-[1920px] mx-auto p-4">
            {/* Getting Started Banner */}
            {showGettingStarted && data.jobs.length === 0 && (
              <GettingStartedBanner
                onDismiss={handleDismissGettingStarted}
                onLoadSample={() => {
                  handleLoadSampleData();
                  setShowGettingStarted(false);
                }}
                onAddFirst={() => {
                  setShowAddPanel(true);
                  setShowGettingStarted(false);
                }}
              />
            )}
            
            <SpreadsheetTable
              jobs={filteredJobs}
              onUpdate={updateJob}
              onDelete={deleteJob}
              onDuplicate={handleDuplicateJob}
              showRecommendedFields={showRecommendedFields}
            />
          </div>
        </div>
      </div>

      {/* Add Job Slide-in Panel */}
      <AddJobPanel
        isOpen={showAddPanel}
        onClose={() => setShowAddPanel(false)}
        onAdd={handleAddJob}
      />
    </>
  );
}
