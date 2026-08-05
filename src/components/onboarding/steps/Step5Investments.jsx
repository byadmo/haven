import React from "react";
import StatementDropzone from "../StatementDropzone";
import EditableRows from "../EditableRows";
import { TextInput, NumberInput, SelectInput, Field } from "../fields";

export const INVEST_ACCOUNTS = [
  "TFSA", "RRSP", "FHSA", "RESP", "Non-Registered", "Cash", "Other",
];

const SCHEMA = {
  type: "object",
  properties: {
    positions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          account: { type: "string", description: "Brokerage account name e.g. 'Wealthsimple TFSA'" },
          symbol: { type: "string" },
          name: { type: "string" },
          shares: { type: "number" },
          avg_buy_price: { type: "number" },
        },
        required: ["symbol", "shares"],
      },
    },
  },
  required: ["positions"],
};

const PROMPT =
  "Analyze this brokerage / investment portfolio screenshot (e.g. Wealthsimple, Questrade, Robinhood, Interactive Brokers). Extract each holding: the account name it sits in, ticker symbol (e.g. AAPL, XEQT), company name, number of shares, and average buy price / cost basis. Return JSON only.";

export function mapInvestAccount(name) {
  const n = String(name || "").toLowerCase();
  if (n.includes("tfsa")) return "TFSA";
  if (n.includes("rrsp") || n.includes("rsp")) return "RRSP";
  if (n.includes("fhsa")) return "FHSA";
  if (n.includes("resp")) return "RESP";
  if (n.includes("margin") || n.includes("non-reg")) return "Non-Registered";
  if (n.includes("cash")) return "Cash";
  return "Other";
}

export default function Step5Investments({ items, setItems }) {
  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-lg font-semibold text-zinc-100 font-mono tracking-tight">Investment Accounts & Stocks</h2>
        <p className="text-sm text-white/50 mt-1.5 leading-relaxed">
          Take a screenshot of your brokerage or investment portfolio holdings and upload
          it. We'll extract your positions grouped by account.
        </p>
      </header>

      <StatementDropzone
        prompt={PROMPT}
        schema={SCHEMA}
        onExtracted={(rows) =>
          setItems([
            ...items,
            ...rows.map((r) => ({
              account: r.account || "",
              symbol: (r.symbol || "").toUpperCase(),
              name: r.name || "",
              shares: r.shares ?? 0,
              avg_buy_price: r.avg_buy_price ?? 0,
            })),
          ])
        }
      />

      <EditableRows
        items={items}
        onChange={setItems}
        makeBlank={() => ({ account: "", symbol: "", name: "", shares: "", avg_buy_price: "" })}
        addLabel="Add holding manually"
        emptyHint="No holdings yet — upload a portfolio screenshot or add one manually."
        renderRow={(it, up) => (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Field label="Account">
              <SelectInput
                value={INVEST_ACCOUNTS.includes(it.account) ? it.account : "Other"}
                onChange={(v) => up({ account: v })}
                options={INVEST_ACCOUNTS.map((a) => ({ value: a, label: a }))}
              />
            </Field>
            <Field label="Ticker">
              <TextInput value={it.symbol} onChange={(v) => up({ symbol: v.toUpperCase() })} placeholder="XEQT" />
            </Field>
            <Field label="Shares">
              <NumberInput value={it.shares} onChange={(v) => up({ shares: v })} placeholder="0" />
            </Field>
            <Field label="Avg buy price">
              <NumberInput value={it.avg_buy_price} onChange={(v) => up({ avg_buy_price: v })} placeholder="0" />
            </Field>
            <div className="col-span-2 sm:col-span-4">
              <Field label="Company / name">
                <TextInput value={it.name} onChange={(v) => up({ name: v })} placeholder="iShares Core Equity ETF" />
              </Field>
            </div>
          </div>
        )}
      />
    </div>
  );
}