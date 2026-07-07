import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
  category: 'Navigation' | 'Actions' | 'View' | 'General';
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        // Allow Escape to work in inputs
        if (event.key !== 'Escape') {
          return;
        }
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        
        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          ctrlMatch &&
          shiftMatch &&
          altMatch
        ) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
}

export function useGlobalShortcuts(
  onNewJob?: () => void,
  onShowShortcuts?: () => void,
  onToggleTheme?: () => void
) {
  const router = useRouter();

  const shortcuts: KeyboardShortcut[] = [
    // Actions
    {
      key: 'z',
      ctrl: true,
      description: 'Undo last deletion',
      action: () => {
        // Undo is handled globally, just log for now
        console.log('Ctrl+Z pressed - undo should work globally');
      },
      category: 'Actions',
    },
    {
      key: 'n',
      ctrl: true,
      description: 'Add new job',
      action: () => {
        if (onNewJob) {
          onNewJob();
        } else {
          router.push('/applications');
        }
      },
      category: 'Actions',
    },
    // View
    {
      key: 'd',
      ctrl: true,
      description: 'Toggle dark mode',
      action: () => {
        if (onToggleTheme) {
          onToggleTheme();
        }
      },
      category: 'View',
    },
    // General
    {
      key: '/',
      ctrl: true,
      description: 'Show keyboard shortcuts',
      action: () => {
        if (onShowShortcuts) {
          onShowShortcuts();
        }
      },
      category: 'General',
    },
    {
      key: 'Escape',
      description: 'Close modal/Cancel action',
      action: () => {
        // This is handled by individual components
      },
      category: 'General',
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}
