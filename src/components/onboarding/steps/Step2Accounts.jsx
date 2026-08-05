import React from "react";
import StatementDropzone from "../StatementDropzone";
import EditableRows from "../EditableRows";
import { TextInput, NumberInput, SelectInput, Field } from "../fields";

const SCHEMA = {
  type: "object",
  properties: {
    accounts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string", enum: ["chequing", "savings"] },
          balance: { type: "number" },
        },
        required: ["name", "balance"],
      },
    },
  },
  required: ["accounts"],
};

const PROMPT =
  "Analyze this bank statement image or PDF. Extract every account shown (chequing, savings, etc). For each account return its display name (e.g. 'TD Chequing'), account type as exactly 'chequing' or 'savings', and the current numeric balance. Return JSON only.";

function normType(t) {
  const v = String(t || "").toLowerCase();
  if (v.includes("sav")) return "savings";
  return "chequing";
}

export default function Step2Accounts({ items, setItems }) {
  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold text-zinc-100 font-mono tracking-tight">Bank Accounts & Balances</h2>
        <p className="text-sm text-white/50 mt-1.5 leading-relaxed">
          Upload screenshots or PDFs of your bank statements or account overviews.
          We'll automatically extract your account details — review and edit before saving.
        </p>
      </header>

      <StatementDropzone
        prompt={PROMPT}
        schema={SCHEMA}
        onExtracted={(rows) =>
          setItems([
            ...items,
            ...rows.map((r) => ({
              name: r.name || "",
              type: normType(r.type),
              balance: r.balance ?? r.current_balance ?? 0,
            })),
          ])
        }
      />

      <EditableRows
        items={items}
        onChange={setItems}
        makeBlank={() => ({ name: "", type: "chequing", balance: "" })}
        addLabel="Add account manually"
        emptyHint="No accounts yet — upload a statement or add one manually."
        renderRow={(it, up) => (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Field label="Account name">
              <TextInput value={it.name} onChange={(v) => up({ name: v })} placeholder="TD Chequing" />
            </Field>
            <Field label="Type">
              <SelectInput
                value={it.type}
                onChange={(v) => up({ type: v })}
                options={[
                  { value: "chequing", label: "Chequing" },
                  { value: "savings", label: "Savings" },
                ]}
              />
            </Field>
            <Field label="Balance">
              <NumberInput value={it.balance} onChange={(v) => up({ balance: v })} placeholder="0" />
            </Field>
          </div>
        )}
      />
    </div>
  );
}