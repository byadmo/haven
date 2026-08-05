import React from "react";
import { useNavigate } from "react-router-dom";
import OnboardingGate from "@/components/onboarding/OnboardingGate";

// Re-runs the onboarding wizard on demand. Returning (profile marked complete)
// sends the user back to the home dashboard.
export default function Setup() {
  const navigate = useNavigate();
  return (
    <OnboardingGate force onComplete={() => navigate("/", { replace: true })}>
      <div />
    </OnboardingGate>
  );
}