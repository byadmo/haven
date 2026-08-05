import React from "react";
import StatementDropzone from "../StatementDropzone";
import EditableRows from "../EditableRows";
import { TextInput, NumberInput, SelectInput, Field } from "../fields";

export const BILL_CATEGORIES = [
  "Housing", "Utilities", "Food & Dining", "Subscriptions",
  "Transportation", "Insurance", "Phone & Internet", "Health",
  "Entertainment", "Other",
];

const SCHEMA = {
  type: "object",
  properties: {
    recurring: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          amount: { type: "number" },
          category: { type: "string" },
          frequency: { type: "string", enum: ["monthly", "biweekly", "yearly", "one_time"] },
          day: { type: "number", description: "Day of month the charge typically posts (1-31)" },
        },
        required: ["description", "amount"],
      },
    },
  },
  required: ["recurring"],
};

const PROMPT =
  "Analyze this bank or credit card statement image/PDF. Detect recurring bills, subscriptions, and regular monthly charges (rent, phone, wifi, subscriptions, groceries, insurance, utilities). For each return a short description, the amount, a category, the frequency (monthly/biweekly/yearly/one_time), and the day of month it usually posts. Return JSON only.";

export default function Step3Bills({ items, setItems }) {
  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold text-zinc-100 font-mono tracking-tight">Recurring Monthly Expenses</h2>
        <p className="text-sm text-white/50 mt-1.5 leading-relaxed">
          Upload monthly bank or credit card statements to automatically detect recurring
          bills and spending habits.
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {["Rent", "Phone Bill", "Wi-Fi", "Subscriptions", "Groceries", "Car Insurance", "Utilities"].map((x) => (
          <span key={x} className="text-[10px] px-2 py-1 rounded-full border border-white/10 text-white/40 font-mono">
            {x}
          </span>
        ))}
      </div>

      <StatementDropzone
        prompt={PROMPT}
        schema={SCHEMA}
        onExtracted={(rows) =>
          setItems([
            ...items,
            ...rows.map((r) => ({
              description: r.description || "",
              amount: r.amount ?? 0,
              category: BILL_CATEGORIES.find((c) => c.toLowerCase() === String(r.category || "").toLowerCase()) || "Other",
              frequency: ["monthly", "biweekly", "yearly", "one_time"].includes(r.frequency) ? r.frequency : "monthly",
              day: r.day || 1,
            })),
          ])
        }
      />

      <EditableRows
        items={items}
        onChange={setItems}
        makeBlank={() => ({ description: "", amount: "", category: "Other", frequency: "monthly", day: "1" })}
        addLabel="Add bill manually"
        emptyHint="No recurring bills yet — upload a statement or add one manually."
        renderRow={(it, up) => (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="col-span-2 sm:col-span-1">
              <Field label="Description">
                <TextInput value={it.description} onChange={(v) => up({ description: v })} placeholder="Rogers Phone" />
              </Field>
            </div>
            <Field label="Amount">
              <NumberInput value={it.amount} onChange={(v) => up({ amount: v })} placeholder="0" />
            </Field>
            <Field label="Category">
              <SelectInput
                value={it.category}
                onChange={(v) => up({ category: v })}
                options={BILL_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
            </Field>
            <Field label="Frequency">
              <SelectInput
                value={it.frequency}
                onChange={(v) => up({ frequency: v })}
                options={[
                  { value: "monthly", label: "Monthly" },
                  { value: "biweekly", label: "Biweekly" },
                  { value: "yearly", label: "Yearly" },
                  { value: "one_time", label: "One-time" },
                ]}
              />
            </Field>
            <Field label="Day of month">
              <NumberInput value={it.day} onChange={(v) => up({ day: v })} placeholder="1" />
            </Field>
          </div>
        )}
      />
    </div>
  );
}