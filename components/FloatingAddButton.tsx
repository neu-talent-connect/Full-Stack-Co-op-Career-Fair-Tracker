'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAppData } from '@/hooks/useAppData';
import { AddJobPanel } from '@/components/AddJobPanel';

export function FloatingAddButton() {
  const { addJob } = useAppData();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const handleAddJob = async (jobData: any) => {
    // Throws on failure — AddJobPanel keeps the form populated
    await addJob(jobData);
    setIsOpen(false);

    // Show success animation
    const btn = document.getElementById('floating-add-btn');
    if (btn) {
      btn.classList.add('scale-110');
      setTimeout(() => btn.classList.remove('scale-110'), 200);
    }
  };

  // Hide on the auth pages — an "add application" nudge is out of place there.
  const authPaths = ['/login', '/signup', '/forgot-password', '/reset-password'];
  if (authPaths.includes(pathname)) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        id="floating-add-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-30 w-14 h-14 bg-northeastern-red hover:bg-red-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center group ${
          isOpen ? 'rotate-45' : ''
        }`}
        title="Add new application"
      >
        <Plus className="w-6 h-6" />

        {/* Tooltip */}
        <span className="absolute right-16 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Add Application
        </span>
      </button>

      {/* Add Job Panel */}
      <AddJobPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onAdd={handleAddJob}
      />
    </>
  );
}
