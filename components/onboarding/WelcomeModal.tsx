'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { X, ArrowRight, CheckCircle } from 'lucide-react';

interface WelcomeModalProps {
  onClose: () => void;
}

export function WelcomeModal({ onClose }: WelcomeModalProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: '👋 Welcome to Career Tracker!',
      description: 'The easiest way to track your co-op and job applications',
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            This app helps you organize your job search in one place - just like a spreadsheet, 
            but with superpowers!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-3xl mb-2">📊</div>
              <h4 className="font-semibold text-sm">Spreadsheet View</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Just like Excel or Google Sheets
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-3xl mb-2">📈</div>
              <h4 className="font-semibold text-sm">Visual Analytics</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                See your progress with charts
              </p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-3xl mb-2">🎯</div>
              <h4 className="font-semibold text-sm">Stay Organized</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Never miss a deadline or follow-up
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: '🚀 How to Get Started',
      description: 'Choose your preferred way to begin',
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex-shrink-0 w-8 h-8 bg-northeastern-red text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Start with Sample Data
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  See how the app works with example applications (recommended for first-time users)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex-shrink-0 w-8 h-8 bg-northeastern-red text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Start Fresh
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Begin with an empty spreadsheet and add your applications
                </p>
              </div>
            </div>

          </div>
        </div>
      ),
    },
    {
      title: '💡 Pro Tips',
      description: 'Get the most out of Career Tracker',
      content: (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Click any cell</strong> in the spreadsheet to edit it directly
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Use keyboard shortcuts:</strong> Ctrl+N to add new job, Ctrl+/ to see all shortcuts
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Start with the Spreadsheet page</strong> for the familiar Google Sheets experience
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Check the Dashboard</strong> to see your progress with charts and stats
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Use Resources</strong> for professional email templates to follow up with companies
              </p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;

  useEscapeKey(onClose);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
    >
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 id="welcome-modal-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {currentStep.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {currentStep.description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            {currentStep.content}
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setStep(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === step
                    ? 'bg-northeastern-red w-8'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={onClose}
            >
              Skip
            </Button>

            <div className="flex gap-3">
              {step > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </Button>
              )}
              
              {isLastStep ? (
                <Button onClick={onClose}>
                  Get Started
                </Button>
              ) : (
                <Button onClick={() => setStep(step + 1)}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
