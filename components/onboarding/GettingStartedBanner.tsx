'use client';

import { X, Plus, Upload, Lightbulb } from 'lucide-react';

interface GettingStartedBannerProps {
  onDismiss: () => void;
  onLoadSample: () => void;
  onAddFirst: () => void;
}

export function GettingStartedBanner({
  onDismiss,
  onLoadSample,
  onAddFirst,
}: GettingStartedBannerProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-6 animate-slide-down">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-northeastern-red rounded-xl flex items-center justify-center">
            <Lightbulb className="w-6 h-6 text-white" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                👋 Not sure where to start?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose one of these quick actions to get started with your job search tracking:
              </p>
            </div>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={onLoadSample}
              className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-northeastern-red dark:hover:border-northeastern-red hover:shadow-md transition-all text-left group"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                  Load Sample Data
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  See how it works with example jobs
                </p>
              </div>
            </button>

            <button
              onClick={onAddFirst}
              className="flex items-start gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-northeastern-red dark:hover:border-northeastern-red hover:shadow-md transition-all text-left group"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                  Add First Application
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Start tracking your applications
                </p>
              </div>
            </button>

          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <strong>💡 Tip:</strong> Click any cell in the spreadsheet to edit it directly - just like Google Sheets!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
