// Paycheque Allocator — orchestrator for the income-allocation & vaults
// framework. Owns AllocationVault loading, default-vault scaffolding, live
// recalculation of the per-paycheque Bills Vault requirement when bills
// change, and composition of the income / overview / splitter / preview cards.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useFinanceData } from "@/lib/FinanceDataContext";
import IncomeProfileCard from "@/components/allocator/IncomeProfileCard";
import SubscriptionsOverviewCard from "@/components/allocator/SubscriptionsOverviewCard";
import PaychequeSplitter from "@/components/allocator/PaychequeSplitter";
import PaydayTransferPreview from "@/components/allocator/PaydayTransferPreview";
import AddVaultModal from "@/components/allocator/AddVaultModal";
import {
  totalMonthlyCommitment,
  perPaychequeRequirement,
  buildDefaultVaultPayloads,
  computeAllocation,
} from "@/lib/paychequeAllocator";

export default function PaychequeAllocator({ bills, vaults, setVaults, loadingVaults, reloadVaults, onAddBill, onEditBill, onDeleteBill }) {
  const { profile, updateProfile } = useFinanceData();
  const [addOpen, setAddOpen] = useState(false);

  const frequency = profile?.income_frequency || "Bi-Weekly";
  const baseIncome = Number(profile?.base_income) || 0;

  const monthlyCommitment = useMemo(() => totalMonthlyCommitment(bills), [bills]);
  const perPaycheque = useMemo(() => perPaychequeRequirement(monthlyCommitment, frequency), [monthlyCommitment, frequency]);

  // First run: if the user has no vaults yet, scaffold the 5 default vaults.
  const didInit = useRef(false);
  useEffect(() => {
    if (loadingVaults || didInit.current) return;
    if (vaults.length === 0) {
      didInit.current = true;
      (async () => {
        const payloads = buildDefaultVaultPayloads({ perPaychequeBills: perPaycheque, baseIncome });
        try { await base44.entities.AllocationVault.bulkCreate(payloads); reloadVaults(); }
        catch { didInit.current = false; }
      })();
    } else {
      didInit.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingVaults, vaults.length]);

  // Auto-update the Bills Vault target_allocation whenever the per-paycheque
  // requirement changes (bill added/edited/deleted or pay frequency changed).
  const lastReqSaved = useRef(null);
  useEffect(() => {
    if (loadingVaults || !vaults.length) return;
    const req = Math.round(perPaycheque * 100) / 100;
    if (lastReqSaved.current === req) return;
    lastReqSaved.current = req;
    const billsVault = vaults.find((v) => v.is_active && v.allocation_type === "Fixed Bill");
    if (!billsVault) return;
    if (Math.round((Number(billsVault.target_allocation) || 0) * 100) === Math.round(req * 100)) return;
    const t = setTimeout(async () => {
      try {
        await base44.entities.AllocationVault.update(billsVault.id, { target_allocation: req });
        setVaults((prev) => prev.map((x) => (x.id === billsVault.id ? { ...x, target_allocation: req } : x)));
      } catch {}
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perPaycheque, loadingVaults, vaults.length]);

  const nextOrder = (vaults.reduce((m, v) => Math.max(m, v.display_order || 0), 0) || 0) + 1;

  return (
    <div className="space-y-4">
      <IncomeProfileCard profile={profile} updateProfile={updateProfile} />

      <SubscriptionsOverviewCard
        bills={bills}
        vaults={vaults}
        onAddBill={onAddBill}
        onEdit={onEditBill}
        onDelete={onDeleteBill}
        monthlyCommitment={monthlyCommitment}
        perPaycheque={perPaycheque}
      />

      {!loadingVaults && vaults.length > 0 && (
        <PaychequeSplitter
          bills={bills}
          vaults={vaults}
          setVaults={setVaults}
          profile={profile}
          reloadVaults={reloadVaults}
          onAddVault={() => setAddOpen(true)}
          billsRequirement={perPaycheque}
        />
      )}

      {!loadingVaults && vaults.length > 0 && (() => {
        const split = computeAllocation({ income: baseIncome, vaults, perPaychequeBills: perPaycheque });
        return (
          <PaydayTransferPreview
            items={split.items}
            income={baseIncome}
            cushion={split.cushion}
          />
        );
      })()}

      {loadingVaults && <p className="text-sm text-white/30 text-center py-6">Loading vaults…</p>}

      <AddVaultModal open={addOpen} onOpenChange={setAddOpen} nextOrder={nextOrder} onSaved={reloadVaults} />
    </div>
  );
}