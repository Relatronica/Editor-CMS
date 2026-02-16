import { useLocation } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { useTutorial } from '../hooks/useTutorial';

export default function HelpButton() {
  const location = useLocation();
  
  const getTutorialId = () => {
    const path = location.pathname;
    
    if (path === '/' || path.startsWith('/dashboard')) {
      return 'dashboard';
    }
    
    if (path.includes('/articles') && (path.includes('/new') || path.includes('/edit'))) {
      return 'article-form';
    }
    
    if (path.includes('/columns') && (path.includes('/new') || path.includes('/edit'))) {
      return 'column-form';
    }
    
    return null;
  };

  const tutorialId = getTutorialId();
  
  if (!tutorialId) {
    return null;
  }

  const { completed, isRunning, startTutorial, resetTutorial } = useTutorial(tutorialId);

  const handleHelp = () => {
    if (isRunning) {
      return;
    }
    
    if (completed) {
      resetTutorial();
    } else {
      startTutorial();
    }
  };

  return (
    <button
      onClick={handleHelp}
      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      title={isRunning ? "Tutorial in corso" : "Mostra il tutorial"}
      disabled={isRunning}
    >
      <HelpCircle size={18} />
      <span className="hidden sm:inline">
        {isRunning ? "Tutorial..." : "Aiuto"}
      </span>
    </button>
  );
}
