"use client";

import { Check, CreditCard, UserPlus, Play, PhoneCall, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConvertLeadWizardProps {
  status: string | null;
}

const steps = [
  { label: "Lead Created", icon: PhoneCall, desc: "Record initialized" },
  { label: "Trial Scheduled", icon: Play, desc: "Trial booked" },
  { label: "Trial Completed", icon: CheckCircle, desc: "Level assessed" },
  { label: "Enrollment", icon: UserPlus, desc: "Contract signed" },
  { label: "Payment", icon: CreditCard, desc: "Tuition processed" },
];

export function ConvertLeadWizard({ status }: ConvertLeadWizardProps) {
  const normStatus = (status || "").toLowerCase().trim();
  
  let currentStepIndex = 0;
  let isLost = false;

  if (normStatus === "new" || normStatus === "contacted") {
    currentStepIndex = 0;
  } else if (normStatus === "trial booked" || normStatus === "trial scheduled") {
    currentStepIndex = 1;
  } else if (normStatus === "trial done" || normStatus === "trial completed" || normStatus === "follow-up") {
    currentStepIndex = 2;
  } else if (normStatus === "enrolled" || normStatus === "won") {
    currentStepIndex = 4; // Complete funnel
  } else if (normStatus === "lost") {
    isLost = true;
    currentStepIndex = -1;
  }

  return (
    <div className="w-full bg-card border border-border rounded-xl p-5 shadow-sm select-none">
      <div className="flex items-center justify-between mb-4 border-b border-border pb-2">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Conversion Progress
        </h3>
        <span className={cn(
          "text-xs font-semibold px-2 py-0.5 rounded-full border",
          isLost 
            ? "bg-rose-500/10 border-rose-500/20 text-rose-600" 
            : normStatus === "enrolled" || normStatus === "won"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 animate-pulse"
              : "bg-primary/10 border-primary/20 text-primary"
        )}>
          {isLost ? "Lead Lost" : normStatus === "enrolled" || normStatus === "won" ? "Converted (Won)" : ` funnel step ${currentStepIndex + 1}/5`}
        </span>
      </div>

      {/* Horizontal workflow steps */}
      <div className="relative flex justify-between items-center w-full mt-4">
        {/* Progress connecting lines */}
        <div className="absolute top-5 left-4 right-4 h-0.5 bg-muted z-0">
          <div 
            className={cn(
              "h-full transition-all duration-500 z-0",
              isLost ? "bg-rose-400" : "bg-primary"
            )}
            style={{ 
              width: isLost 
                ? "100%" 
                : `${(currentStepIndex / (steps.length - 1)) * 100}%` 
            }}
          />
        </div>

        {/* Step circles */}
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isCompleted = idx < currentStepIndex;
          const isActive = idx === currentStepIndex;
          
          let circleColorClass = "bg-muted text-muted-foreground border-border";
          if (isLost) {
            circleColorClass = "bg-rose-500 text-white border-rose-500";
          } else if (isCompleted) {
            circleColorClass = "bg-primary text-white border-primary";
          } else if (isActive) {
            circleColorClass = "bg-background text-primary border-primary ring-2 ring-primary/20";
          }

          return (
            <div key={idx} className="relative flex flex-col items-center z-10 flex-1">
              <div 
                className={cn(
                  "h-10 w-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-sm",
                  circleColorClass
                )}
              >
                {isCompleted && !isLost ? (
                  <Check className="h-5 w-5 stroke-[3px]" />
                ) : (
                  <StepIcon className="h-4 w-4" />
                )}
              </div>
              
              <div className="text-center mt-2.5 max-w-[80px] sm:max-w-none">
                <p className={cn(
                  "text-[10px] sm:text-xs font-bold leading-tight",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                <p className="hidden sm:block text-[9px] text-muted-foreground/80 mt-0.5 leading-none font-medium">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      {isLost && (
        <div className="mt-4 p-3 bg-rose-500/5 border border-rose-500/10 rounded-lg text-rose-600 text-xs font-medium text-center">
          This lead was marked as Lost. Progression wizard is locked.
        </div>
      )}
    </div>
  );
}
