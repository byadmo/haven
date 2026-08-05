import React from "react";
import { base44 } from "@/api/base44Client";
import OnboardingWizard from "./OnboardingWizard";

// Decides whether to show the onboarding wizard or the app behind it.
// `force` re-runs the wizard even if already completed (used by the /setup route).
export default function OnboardingGate({ children, force = false, onComplete }) {
  const [profile, setProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    base44.entities.UserFinancialProfile
      .list("-created_date", 1)
      .then((rows) => { if (!cancelled) setProfile(rows[0] || null); })
      .catch(() => { if (!cancelled) setProfile(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const handleComplete = () => {
    setReloadKey((k) => k + 1);
    if (onComplete) onComplete();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    );
  }

  const needsWizard = force || !profile || !profile.onboarding_completed;
  if (needsWizard) {
    return <OnboardingWizard existingProfile={profile} force={force} onComplete={handleComplete} />;
  }
  return children;
}