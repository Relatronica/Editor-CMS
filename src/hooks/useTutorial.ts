import { useState, useEffect, useCallback, useRef } from 'react';

const TUTORIAL_STORAGE_KEY = 'editor-cms-tutorial-completed';

export function useTutorial(tutorialId: string) {
  const storageKey = `${TUTORIAL_STORAGE_KEY}-${tutorialId}`;
  const hasAutoStarted = useRef(false);
  
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(storageKey);
    return saved === 'true';
  });

  // Sincronizza completed quando il localStorage cambia (per sincronizzare tra componenti)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey) {
        const isCompleted = e.newValue === 'true';
        setCompleted(isCompleted);
        if (isCompleted) {
          setIsRunning(false);
        }
      }
    };

    // Questo event listener funziona solo per cambiamenti da altre tab/finestre
    // Per la stessa tab, dobbiamo fare polling o usare eventi custom
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [storageKey]);

  // Auto-start tutorial solo al primo render se non è mai stato completato
  useEffect(() => {
    if (typeof window === 'undefined' || hasAutoStarted.current) {
      return;
    }

    const wasCompleted = localStorage.getItem(storageKey) === 'true';
    if (!wasCompleted) {
      hasAutoStarted.current = true;
      // Piccolo delay per permettere al DOM di renderizzare
      const timer = setTimeout(() => {
        setIsRunning(true);
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  // Ascolta gli eventi globali per sincronizzare lo stato tra componenti
  useEffect(() => {
    const handleTutorialEvent = (event: CustomEvent<{ tutorialId: string; action: 'start' | 'reset' }>) => {
      if (event.detail.tutorialId === tutorialId) {
        hasAutoStarted.current = false;
        
        // Se è un reset, rimuovi dal localStorage e aggiorna lo stato
        if (event.detail.action === 'reset') {
          localStorage.removeItem(storageKey);
          setCompleted(false);
        } else {
          // Per start, verifica il localStorage
          const isCompletedInStorage = localStorage.getItem(storageKey) === 'true';
          setCompleted(isCompletedInStorage);
        }
        
        // Forza un aggiornamento dello stato e poi avvia il tutorial
        // Usa un delay per assicurarsi che lo stato si aggiorni e il DOM sia pronto
        setTimeout(() => {
          setIsRunning(true);
        }, 150);
      }
    };

    window.addEventListener('tutorial:action', handleTutorialEvent as EventListener);
    
    return () => {
      window.removeEventListener('tutorial:action', handleTutorialEvent as EventListener);
    };
  }, [tutorialId, storageKey]);

  const startTutorial = useCallback(() => {
    // Emetti evento globale PRIMA di aggiornare lo stato locale
    // Questo assicura che tutti i componenti ricevano l'evento
    window.dispatchEvent(new CustomEvent('tutorial:action', { 
      detail: { tutorialId, action: 'start' } 
    }));
    // Aggiorna anche lo stato locale per immediate feedback
    hasAutoStarted.current = false;
    setCompleted(false);
    requestAnimationFrame(() => {
      setIsRunning(true);
    });
  }, [tutorialId]);

  const stopTutorial = useCallback(() => {
    setIsRunning(false);
    // Non cambiare completed quando si salta/chiude
    // Questo permette di riavviare il tutorial in seguito
  }, []);

  const completeTutorial = useCallback(() => {
    setIsRunning(false);
    setCompleted(true);
    localStorage.setItem(storageKey, 'true');
  }, [storageKey]);

  const resetTutorial = useCallback(() => {
    // Rimuovi il flag di completamento PRIMA di emettere l'evento
    localStorage.removeItem(storageKey);
    hasAutoStarted.current = false;
    setCompleted(false);
    
    // Emetti evento globale in modo sincrono per garantire che venga ricevuto
    // Questo assicura che tutti i componenti ricevano l'evento prima che lo stato locale cambi
    window.dispatchEvent(new CustomEvent('tutorial:action', { 
      detail: { tutorialId, action: 'reset' } 
    }));
    
    // Aggiorna anche lo stato locale per immediate feedback
    // Usa un piccolo delay per assicurarsi che l'evento venga processato prima
    setTimeout(() => {
      setIsRunning(true);
    }, 50);
  }, [storageKey, tutorialId]);

  return {
    isRunning,
    completed,
    startTutorial,
    stopTutorial,
    completeTutorial,
    resetTutorial,
  };
}
