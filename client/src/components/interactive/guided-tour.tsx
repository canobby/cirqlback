import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft, 
  Eye, 
  EyeOff,
  Lightbulb,
  Target
} from "lucide-react";

interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  tip?: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    text: string;
    onClick: () => void;
  };
}

interface GuidedTourProps {
  tourId: string;
  steps: TourStep[];
  onComplete?: () => void;
  onDismiss?: () => void;
  autoStart?: boolean;
}

export function GuidedTour({ 
  tourId, 
  steps, 
  onComplete, 
  onDismiss, 
  autoStart = false 
}: GuidedTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if tour was previously dismissed
    const dismissed = localStorage.getItem(`tour-dismissed-${tourId}`);
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    if (autoStart) {
      // Small delay to ensure page is loaded
      setTimeout(() => setIsActive(true), 1000);
    }
  }, [tourId, autoStart]);

  useEffect(() => {
    if (isActive && steps[currentStep]) {
      positionTooltip();
      highlightElement();
    }
  }, [isActive, currentStep, steps]);

  const positionTooltip = () => {
    const currentStepData = steps[currentStep];
    const targetElement = document.querySelector(currentStepData.target);
    const tooltip = tooltipRef.current;

    if (!targetElement || !tooltip) return;

    const targetRect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let top = 0;
    let left = 0;

    switch (currentStepData.position) {
      case 'top':
        top = targetRect.top - tooltipRect.height - 10;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + 10;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.left - tooltipRect.width - 10;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.right + 10;
        break;
    }

    // Ensure tooltip stays within viewport
    const padding = 10;
    top = Math.max(padding, Math.min(window.innerHeight - tooltipRect.height - padding, top));
    left = Math.max(padding, Math.min(window.innerWidth - tooltipRect.width - padding, left));

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  };

  const highlightElement = () => {
    // Remove previous highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });

    const currentStepData = steps[currentStep];
    const targetElement = document.querySelector(currentStepData.target);
    
    if (targetElement) {
      targetElement.classList.add('tour-highlight');
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    setIsActive(false);
    // Remove highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });
    onComplete?.();
  };

  const dismissTour = () => {
    setIsActive(false);
    setIsDismissed(true);
    localStorage.setItem(`tour-dismissed-${tourId}`, 'true');
    // Remove highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });
    onDismiss?.();
  };

  const restartTour = () => {
    localStorage.removeItem(`tour-dismissed-${tourId}`);
    setIsDismissed(false);
    setCurrentStep(0);
    setIsActive(true);
  };

  if (isDismissed) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={restartTour}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Show Guide
      </Button>
    );
  }

  if (!isActive) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsActive(true)}
        className="fixed bottom-4 right-4 z-50 shadow-lg"
      >
        <Target className="h-4 w-4 mr-2" />
        Start Tour
      </Button>
    );
  }

  const currentStepData = steps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" />
      
      {/* Tooltip */}
      <Card
        ref={tooltipRef}
        className="fixed z-50 w-80 shadow-xl border-2 border-primary/20"
        style={{ position: 'fixed' }}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {currentStep + 1} of {steps.length}
              </Badge>
              <Lightbulb className="h-4 w-4 text-yellow-500" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissTour}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <h3 className="font-semibold text-sm mb-2">{currentStepData.title}</h3>
          <p className="text-xs text-muted-foreground mb-3">
            {currentStepData.description}
          </p>

          {currentStepData.tip && (
            <div className="bg-blue-50 p-2 rounded text-xs text-blue-800 mb-3 border-l-2 border-blue-400">
              <span className="font-medium">💡 Tip: </span>
              {currentStepData.tip}
            </div>
          )}

          {currentStepData.action && (
            <Button
              size="sm"
              variant="outline"
              onClick={currentStepData.action.onClick}
              className="w-full mb-3 text-xs"
            >
              {currentStepData.action.text}
            </Button>
          )}

          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="text-xs"
            >
              <ChevronLeft className="h-3 w-3 mr-1" />
              Back
            </Button>

            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            <Button
              size="sm"
              onClick={nextStep}
              className="text-xs"
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Hook for managing multiple tours
export function useTourManager() {
  const [activeTour, setActiveTour] = useState<string | null>(null);

  const startTour = (tourId: string) => {
    setActiveTour(tourId);
  };

  const stopTour = () => {
    setActiveTour(null);
  };

  return {
    activeTour,
    startTour,
    stopTour
  };
}