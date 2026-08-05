import React from "react";
import StatementDropzone from "../StatementDropzone";
import EditableRows from "../EditableRows";
import { TextInput, NumberInput, Field } from "../fields";

const SCHEMA = {
  type: "object",
  properties: {
    debts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          current_balance: { type: "number" },
          interest_rate: { type: "number", description: "APR percentage" },
          minimum_payment: { type: "number" },
          due_date: { type: "string", description: "YYYY-MM-DD" },
          original_balance: { type: "number" },
        },
        required: ["name", "current_balance"],
      },
    },
  },
  required: ["debts"],
};

const PROMPT =
  "Analyze this credit card or loan statement image/PDF. Extract every debt/credit account with its name, current balance, APR interest rate (number), minimum payment, due date (YYYY-MM-DD), and original balance if shown. Return JSON only.";

export default function Step4Debts({ items, setItems }) {
  return (
    <div className="space-y-5">
      <header>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-zinc-100 font-mono tracking-tight">Liabilities & Debts</h2>
          <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400 font-mono">
            Optional
          </span>
        </div>
        <p className="text-sm text-white/50 mt-1.5 leading-relaxed">
          Upload credit card or loan statement screenshots to track payoff goals. This
          step is optional — feel free to skip it and revisit anytime.
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
              current_balance: r.current_balance ?? 0,
              interest_rate: r.interest_rate ?? 0,
              minimum_payment: r.minimum_payment ?? 0,
              due_date: r.due_date || "",
              original_balance: r.original_balance ?? r.current_balance ?? 0,
            })),
          ])
        }
      />

      <EditableRows
        items={items}
        onChange={setItems}
        makeBlank={() => ({ name: "", current_balance: "", interest_rate: "", minimum_payment: "", due_date: "", original_balance: "" })}
        addLabel="Add debt manually"
        emptyHint="No debts added — upload a statement or add one manually. Skip if none."
        renderRow={(it, up) => (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="col-span-2 sm:col-span-1">
              <Field label="Name">
                <TextInput value={it.name} onChange={(v) => up({ name: v })} placeholder="Visa Infinite" />
              </Field>
            </div>
            <Field label="Current balance">
              <NumberInput value={it.current_balance} onChange={(v) => up({ current_balance: v })} placeholder="0" />
            </Field>
            <Field label="Interest rate (APR %)">
              <NumberInput value={it.interest_rate} onChange={(v) => up({ interest_rate: v })} placeholder="19.99" />
            </Field>
            <Field label="Min payment">
              <NumberInput value={it.minimum_payment} onChange={(v) => up({ minimum_payment: v })} placeholder="0" />
            </Field>
            <Field label="Due date">
              <TextInput value={it.due_date} onChange={(v) => up({ due_date: v })} placeholder="YYYY-MM-DD" />
            </Field>
            <Field label="Original balance">
              <NumberInput value={it.original_balance} onChange={(v) => up({ original_balance: v })} placeholder="0" />
            </Field>
          </div>
        )}
      />
    </div>
  );
}