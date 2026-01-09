import { useLocation } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { useTutorial } from '../hooks/useTutorial';

export default function HelpButton() {
  const location = useLocation();
  
  // Determina quale tutorial gestire in base alla route corrente
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
  
  // Se non c'è un tutorial per questa pagina, non mostrare il pulsante
  if (!tutorialId) {
    return null;
  }

  const { completed, isRunning, startTutorial, resetTutorial } = useTutorial(tutorialId);

  const handleHelp = () => {
    // Se il tutorial è già in corso, non fare nulla
    if (isRunning) {
      return;
    }
    
    // Sempre usa startTutorial, che funziona sia se completato che se non completato
    // Se è completato, prima resetta, altrimenti avvia direttamente
    if (completed) {
      resetTutorial();
    } else {
      startTutorial();
    }
  };

  return (
    <button
      onClick={handleHelp}
      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
