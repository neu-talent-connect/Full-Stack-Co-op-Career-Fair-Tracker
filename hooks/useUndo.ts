'use client';

import { useState, useEffect } from 'react';

export interface UndoItem {
  type: 'job' | 'company' | 'contact' | 'followup' | 'interview' | 'research';
  data: any;
  deletedAt: string;
}

const STORAGE_KEY = 'lastDeleted';

export function useUndo() {
  const [lastDeleted, setLastDeleted] = useState<UndoItem | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setLastDeleted(parsed);
      }
    } catch (error) {
      console.error('Error loading undo item:', error);
    }
  }, []);

  // Save to localStorage whenever it changes
  useEffect(() => {
    try {
      if (lastDeleted) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lastDeleted));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error saving undo item:', error);
    }
  }, [lastDeleted]);

  const addToUndoStack = (item: UndoItem) => {
    // Replace with new item (only track last deletion)
    setLastDeleted(item);
  };

  const popFromUndoStack = (): UndoItem | null => {
    if (!lastDeleted) return null;

    const item = lastDeleted;
    setLastDeleted(null); // Clear after retrieving
    return item;
  };

  const clearUndoStack = () => {
    setLastDeleted(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Clear the undo item only if it is the given deletion — used by toast UNDO
  // buttons so a restored record can't be restored again via global undo,
  // without discarding a newer deletion's undo entry.
  const consumeIfMatches = (id: string) => {
    setLastDeleted(prev => (prev && prev.data?.id === id ? null : prev));
  };

  const canUndo = lastDeleted !== null;

  return {
    addToUndoStack,
    popFromUndoStack,
    clearUndoStack,
    consumeIfMatches,
    canUndo,
    undoCount: lastDeleted ? 1 : 0,
  };
}
