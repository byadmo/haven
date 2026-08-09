# REBUILD PLAN — Haven Financial & Education Overhaul

## Design Language (from Growth Blueprint)

| Token | Growth | Financial (Target) | Education (Target) |
|---|---|---|---|
| Primary accent | Amber (#F59E0B) | Emerald/Teal (#00E5A0) | Indigo/Violet (#6366F1) |
| Splash theme | THEMES.sunset | THEMES.wealthsimple | THEMES.midnight |
| Active nav | bg-amber-500/10 border-amber-400/30 | bg-emerald-500/10 border-emerald-400/30 | bg-indigo-500/10 border-indigo-400/30 |
| Card pattern | rounded-2xl border border-white/10 bg-black | same | same |
| Stat layout | grid-cols-2 lg:grid-cols-4 | same | same |
| Floating nav | 56px pill, 4 icons + More | same | same |
| Xp bar | Gradient from-amber-500 to-teal-400 | Gradient from-emerald-500 to-blue-400 | Gradient from-indigo-500 to-purple-400 |

## Execution Sequence

1. Create FinancialSplash + FinancialLayout (mirrors SILayout)
2. Create FinancialDashboard with command header, upcoming timeline, budget bar, quick-log
3. Create EducationSplash + EducationLayout
4. Create EducationDashboard with focus-first hub, flashcard deck, study mode
5. Wire into App.jsx routes
6. Lint + build + push