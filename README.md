# ⚡ SPLIT//MAX — Maximalist Shared Expense Tracker

> **Loud, dense, layered, and joyful.** No boring corporate SaaS design. A feature-complete Splitwise tracker engineered with React, Tailwind CSS, 100% integer paise precision, and maximalist neo-brutalist visual style.

---

## 🚀 Quick Start

### Option 1: Run with Vite Dev Server
```bash
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Option 2: Single-File Standalone HTML
A completely self-contained build is compiled into:
- `standalone.html` (or `dist/index.html`)

You can double-click and run this HTML file directly in any modern browser—no web server or backend needed! All data persists locally in `localStorage`.

---

## ✨ Core Features Implemented

1. **Groups & Themes**
   - Create, edit, and delete expense groups (e.g., *Goa Trip 🏖️*, *Flat 402 🛋️*).
   - Custom emoji picker and signature color scheme per group (Tangerine, Hot Pink, Acid Green, Electric Cyan, Cobalt Shock, Neon Violet).
   - Add custom members dynamically by name.

2. **Members & Avatar Styling**
   - Auto-assigned high-contrast neon avatar colors and animal/cosmic emojis.
   - Switchable "YOU" profile perspective in the header to view debt balances from any member's perspective.

3. **Maximalist Add / Edit Expense Engine**
   - Title, Amount, Date, Category with emojis, Notes.
   - Currency selection (₹ INR default, $ USD, € EUR, £ GBP).
   - **Single Payer vs Multiple Payers**: Support for split bills where multiple people paid parts of the total.
   - **4 Advanced Split Methods**:
     - **Equal**: Automatic division with remaining paise assigned to the payer.
     - **Exact Amounts**: Precise custom amounts with live difference indicator.
     - **Percentages**: Percentage shares totaling 100% with floor remainder assigned to payer.
     - **Shares**: Weighted integer ratios (e.g. 2 shares vs 1 share).
   - One-click participant toggling to easily include/exclude specific members.
   - Live "₹ remaining to allocate" validation box with instant feedback.

4. **100% Integer Paise Precision (Zero-Loss Math)**
   - All internal calculations operate in integer paise to avoid IEEE-754 floating point rounding leaks.
   - Leftover paise are consistently awarded to the primary payer or first participant.

5. **Balances & Greedy Debt Minimization (Simplify Debts)**
   - Real-time running net balance totals for all members (Acid Green = gets back, Hot Pink = owes).
   - **Simplify Debts Toggle**: Greedy net-balance matching algorithm that collapses circular debts into the minimum possible transactions.
   - Animated transaction savings banner (e.g. *"Reduced 7 bilateral payments down to 3! Saved 4 awkward UPI reminders"*).
   - Direct "SETTLE UP" buttons on debt cards that pre-populate the settlement modal.

6. **Settle Up & Confetti Celebrations**
   - Record payments between any two members with date and payment mode (UPI, GPay, Cash).
   - Canvas Confetti explosion + synthetic 8-bit cash register chime via the Web Audio API.

7. **Activity Feed & Undo Engine**
   - Full audit log of expenses added, edited, deleted, and settled with timestamps.
   - **"Undo Last Action"** button: Reverts the latest mutation using an immutable snapshot stack.

8. **Interactive Visual Dashboard & Charts**
   - 4 Hero Bento Cards: Total Group Spend, Your Share, You Owe, You Get Back.
   - **Category Donut Chart**: Hoverable SVG rings with percentage badges and center totals.
   - **Spending Over Time**: Daily timeline bar chart with hover tooltips.
   - **Member Contribution**: Grouped bar chart comparing what each person paid vs what they consumed.

9. **Search, Filter & Sort**
   - Instant search across descriptions and notes.
   - Category filter chips with item counts.
   - Member filter dropdown (filter by payer or participant).
   - Sorting: Newest, Oldest, Highest Amount, Lowest Amount, Title A-Z.

10. **Exporting Tools**
    - **CSV Export**: Instant download of all group expenses and settlements.
    - **WhatsApp Summary**: Formats balances and simplified debts into formatted WhatsApp text with emojis, ready to paste.

11. **Seed Demo Data**
    - Comes pre-populated with 2 rich groups (*Goa Trip* with 5 members & 7 expenses, *Flat 402* with 3 members & 5 expenses) across equal, exact, percentage, shares, and multi-payer splits.
    - "Reset Demo Data" button in header anytime.

12. **Sound FX & Dark Mode**
    - Built-in Web Audio API synthesizer for 8-bit sounds (clicks, buzzers, success chimes).
    - Sound mute button in header.
    - Neon-on-black Dark Mode toggle.
    - `prefers-reduced-motion` accessible fallback.

---

## 🎨 Maximalist Design Elements

- **Color Palette**: Clashing saturated neon accents: Hot Pink (`#FF2E93`), Electric Yellow (`#FFE600`), Acid Green (`#B6FF00`), Cyan (`#00F0FF`), Cobalt (`#2B2BFF`), Tangerine (`#FF7A00`).
- **Typography**: 5 distinct typefaces via Google Fonts:
  - *Rubik Mono One* & *Bowlby One SC* for loud headings.
  - *Space Mono* for numbers and amounts.
  - *Fraunces* for quirky serif accents.
  - *Caveat* for playful annotations.
  - *Outfit* for crisp body readability.
- **Borders & Shadows**: 3-4px solid black outlines with 6px-8px hard neo-brutalist offset drop shadows.
- **Micro-Decorations**: Top marquee ticker with real-time stats, washi-tape corners, candy stripes, dot patterns, sticker rotations (`-rotate-1`, `rotate-2`), pulsing glow buttons, and sassy microcopy (*"Rahul owes cash! Settle up before they call your mom."*).

---

## 🧪 Math Sanity Checks

Run automated tests on split calculations and debt simplification:
```bash
node -e "import('./src/utils/expenseLogic.js').then(m => console.log(m.runSanityChecks()))"
```
Tests pass for:
- Zero-loss paise distribution on odd splits (100 / 3 = 33.34 + 33.33 + 33.33 = 100.00).
- Exact amount sum validation.
- Percentage allocation and residual attribution.
- Greedy net-balance matching debt reduction.
