import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import IdentityHook from "./IdentityHook";
import IdentityIntake from "./IdentityIntake";
import ProcessingAnimation from "./ProcessingAnimation";
import BlueprintPanel from "./BlueprintPanel";
import DashboardHandoff from "./DashboardHandoff";
import { generateBlueprint } from "@/hooks/useIdentityBlueprint";
import { useSI } from "@/lib/SIContext";

export default function IdentitySetupFlow({ onComplete }) {
  const { addHabit, updateSettings } = useSI();
  const [phase, setPhase] = useState("hook"); // hook | intake | processing | blueprint | handoff | done
  const [theme, setTheme] = useState("sunset");
  const [intakeData, setIntakeData] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [saving, setSaving] = useState(false);

  // Phase 1 → 2
  const handleBegin = useCallback(() => {
    setPhase("intake");
  }, []);

  // Phase 2 → 3
  const handleIntakeComplete = useCallback((data) => {
    setIntakeData(data);
    // Generate the blueprint during the transition
    const bp = generateBlueprint({
      identityText: data.identityText,
      frictionText: data.frictionText,
      commitment: data.commitment,
    });
    setBlueprint(bp);
    setPhase("processing");
  }, []);

  // Phase 3 → 4
  const handleProcessingComplete = useCallback(() => {
    setPhase("blueprint");
  }, []);

  // Phase 4 → 5 (save + transition)
  const handleFinalize = useCallback(async (finalItems) => {
    setSaving(true);
    try {
      // Save settings with identity goal
      await updateSettings({
        has_completed_splash: true,
        has_completed_setup: true,
        display_name: intakeData?.identityText?.split(" ").slice(0, 3).join(" ") || "",
        primary_focus_goal: `Become ${blueprint?.identityPhrase || "the best version of myself"}`,
        daily_reminder_time: "09:00",
        week_starts_on: "monday",
      });

      // Create selected habits
      for (const item of finalItems) {
        await addHabit({
          name: item.name,
          icon: item.icon || "Target",
          color: item.color || "amber",
          difficulty: item.difficulty || 2,
          frequency: item.frequency || "daily",
          notes: `Anchor: ${item.anchor}`,
        });
      }

      setPhase("handoff");
    } catch (err) {
      console.error("Setup save failed:", err);
      // Still handoff on error
      setPhase("handoff");
    } finally {
      setSaving(false);
    }
  }, [addHabit, updateSettings, intakeData, blueprint]);

  // Phase 5 → done
  const handleHandoffComplete = useCallback(() => {
    setPhase("done");
    onComplete();
  }, [onComplete]);

  // Phase 4 regenerate
  const handleRegenerate = useCallback(() => {
    if (!intakeData) return;
    const bp = generateBlueprint({
      identityText: intakeData.identityText,
      frictionText: intakeData.frictionText,
      commitment: intakeData.commitment,
    });
    setBlueprint(bp);
  }, [intakeData]);

  if (phase === "done") return null;

  return (
    <AnimatePresence mode="wait">
      {phase === "hook" && (
        <IdentityHook key="hook" theme={theme} onBegin={handleBegin} />
      )}
      {phase === "intake" && (
        <IdentityIntake
          key="intake"
          theme={theme}
          onComplete={handleIntakeComplete}
          initialData={intakeData}
        />
      )}
      {phase === "processing" && blueprint && (
        <ProcessingAnimation
          key="processing"
          theme={theme}
          onComplete={handleProcessingComplete}
          identityPhrase={blueprint.identityPhrase}
        />
      )}
      {phase === "blueprint" && blueprint && (
        <BlueprintPanel
          key="blueprint"
          theme={theme}
          blueprint={blueprint}
          onFinalize={handleFinalize}
          onRegenerate={handleRegenerate}
        />
      )}
      {phase === "handoff" && blueprint && (
        <DashboardHandoff
          key="handoff"
          theme={theme}
          identityPhrase={blueprint.identityPhrase}
          onDismiss={handleHandoffComplete}
        />
      )}
    </AnimatePresence>
  );
}