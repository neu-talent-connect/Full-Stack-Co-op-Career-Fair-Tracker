'use client';

import { useState, useEffect } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { useRouter } from 'next/navigation';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { Charts } from '@/components/dashboard/Charts';
import { SpreadsheetTable } from '@/components/dashboard/SpreadsheetTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Download, Upload, Plus, ArrowRight } from 'lucide-react';
import { exportToCSV } from '@/lib/utils';
import { Job, DashboardFilters } from '@/types';
import Link from 'next/link';
import { GettingStartedBanner } from '@/components/onboarding/GettingStartedBanner';

export default function DashboardPage() {
  const router = useRouter();
  const { data, updateJob, deleteJob, loadSampleData } = useAppData();
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [showGettingStarted, setShowGettingStarted] = useState(false);

  // Check if user has data
  useEffect(() => {
    const dismissed = localStorage.getItem('dismissedGettingStarted');
    if (!dismissed && data.jobs.length === 0) {
      setShowGettingStarted(true);
    }
  }, [data.jobs.length]);

  const handleDismissGettingStarted = () => {
    setShowGettingStarted(false);
    localStorage.setItem('dismissedGettingStarted', 'true');
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Your complete job search overview with stats and insights
            </p>
          </div>
          <Link href="/spreadsheet">
            <Button variant="outline">
              Go to Spreadsheet
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Getting Started Banner */}
      {showGettingStarted && data.jobs.length === 0 && (
        <GettingStartedBanner
          onDismiss={handleDismissGettingStarted}
          onLoadSample={() => {
            handleLoadSampleData();
            setShowGettingStarted(false);
          }}
          onAddFirst={() => {
            router.push('/applications');
            setShowGettingStarted(false);
          }}
        />
      )}

      {/* Stats Cards */}
      <div className="mb-8">
        <StatsCards jobs={data.jobs} />
      </div>

      {/* Charts */}
      {data.jobs.length > 0 && (
        <div className="mb-8">
          <Charts jobs={data.jobs} />
        </div>
      )}

      {/* Filters and Actions */}
      <div className="mb-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Applications
            </h2>
            <div className="flex flex-wrap gap-2">
              {/* Only show Sample Data button when user has no data */}
              {data.jobs.length === 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleLoadSampleData}
                  title="Load sample data to explore features"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Load Sample Data
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExport}
                disabled={filteredJobs.length === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Link href="/applications">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Application
                </Button>
              </Link>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
        <SpreadsheetTable
          jobs={filteredJobs}
          onUpdate={updateJob}
          onDelete={deleteJob}
        />
      </div>
    </div>
  );
}
