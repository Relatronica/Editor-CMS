import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';

interface TutorialTourProps {
  steps: Step[];
  isRunning: boolean;
  onComplete: () => void;
  onSkip: () => void;
  continuous?: boolean;
  showProgress?: boolean;
  showSkipButton?: boolean;
  locale?: {
    back?: string;
    close?: string;
    last?: string;
    next?: string;
    open?: string;
    skip?: string;
  };
}

export default function TutorialTour({
  steps,
  isRunning,
  onComplete,
  onSkip,
  continuous = true,
  showProgress = true,
  showSkipButton = true,
  locale = {
    back: 'Indietro',
    close: 'Chiudi',
    last: 'Fine',
    next: 'Avanti',
    open: 'Apri',
    skip: 'Salta',
  },
}: TutorialTourProps) {
  const handleCallback = (data: CallBackProps) => {
    const { status, action } = data;

    // Gestisci tutti i casi in cui il tutorial termina
    // Joyride può emettere vari stati, gestiamo tutti quelli che indicano la fine del tour
    if (status === STATUS.FINISHED) {
      onComplete();
    } else if (status === STATUS.SKIPPED) {
      onSkip();
    } else if (action === 'close') {
      // L'utente ha chiuso il tour manualmente (cliccando X o fuori dall'overlay)
      onSkip();
    } else if (action === 'skip') {
      // L'utente ha saltato il tour
      onSkip();
    }
  };

  // Non renderizzare se non ci sono step
  if (steps.length === 0) {
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={isRunning}
      continuous={continuous}
      showProgress={showProgress}
      showSkipButton={showSkipButton}
      callback={handleCallback}
      locale={locale}
      styles={{
        options: {
          primaryColor: '#4f46e5',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '1rem',
          padding: '1.5rem',
          boxShadow: '0 10px 40px -15px rgba(0, 0, 0, 0.1)',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#4f46e5',
          borderRadius: '0.75rem',
          padding: '0.625rem 1.25rem',
          fontSize: '0.875rem',
          fontWeight: '600',
        },
        buttonBack: {
          color: '#64748b',
          marginRight: '0.5rem',
        },
        buttonSkip: {
          color: '#94a3b8',
          fontSize: '0.875rem',
        },
      }}
      floaterProps={{
        disableAnimation: false,
      }}
      scrollToFirstStep={true}
      spotlightClicks={true}
      disableOverlayClose={false}
    />
  );
}
