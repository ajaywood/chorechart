# ⭐ ChoreChart — Family User Guide

ChoreChart is a family chore and rewards app designed to teach children the real value of money. Kids earn points by completing chores, save those points into goal-based banks, and learn to make smart spending decisions — all with parent oversight and approval at every step.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [The Home Screen](#the-home-screen)
3. [Parent Portal](#parent-portal)
   - [Approvals](#approvals)
   - [Fortnight Calendar](#fortnight-calendar)
   - [Managing Chores](#managing-chores)
   - [Managing Banks](#managing-banks)
   - [Managing Children](#managing-children)
   - [Settings](#settings)
4. [Child Portal](#child-portal)
   - [Chores Tab](#chores-tab)
   - [Schedule Tab](#schedule-tab)
   - [Distribute Tab](#distribute-tab)
   - [Banks Tab](#banks-tab)
   - [History Tab](#history-tab)
5. [The Point System](#the-point-system)
6. [Split Care & the Fortnight Calendar](#split-care--the-fortnight-calendar)
7. [Installing on Your Phone](#installing-on-your-phone)
8. [Deploying to Vercel](#deploying-to-vercel)
9. [Default Credentials](#default-credentials)
10. [Development](#development)

---

## Getting Started

When you first open ChoreChart you'll see the **Home Screen** with profile cards for each family member. The app comes pre-loaded with two demo children (Alex and Sam) and one parent account with PIN `1234`.

**Recommended first steps:**

1. Tap the **Parent** card and enter PIN `1234`
2. Go to **Settings** → set your **currency** and **point value**
3. Go to **Children** → edit the demo children's names and avatars, or remove them and add your own
4. Go to **Chores** → add the chores relevant to your family
5. Go to **Banks** → create savings goals for each child
6. Go to **Calendar** → set up your fortnight cycle if you have a split care arrangement
7. Share the app URL with your family and let the kids log in!

---

## The Home Screen

The home screen shows a profile card for every family member. Tap a card to enter that person's portal.

- **Child cards** show their name, avatar, and current wallet balance
- **Parent cards** (dark) require a PIN to enter
- If a child has a PIN set, they'll see a PIN pad before entering their portal
- Children without a PIN go straight in — useful for younger kids

---

## Parent Portal

The parent portal is PIN-protected and is where all setup and approvals happen. It has six tabs across the top.

### Approvals

This is the first thing you see when you log in as a parent. Any chore a child has submitted for approval will appear here as a **pending card**.

- Each card shows the child's name, the chore, the time submitted, and the points value
- If the chore requires photo evidence, a **📸 View Photo** link appears — tap it to inspect the photo before approving
- Tap **✓ Yes** to approve (points are instantly added to the child's wallet)
- Tap **✗ No** to reject (the child can try again)
- Approved and rejected chores move to the **Recent History** section below

> **Tip:** You'll see a red notification dot on the Approvals tab whenever there are pending requests waiting for you.

---

### Fortnight Calendar

The calendar lets you set up a **2-week rotating schedule** — perfect for split care families or any family that wants chores assigned to specific days.

**Setting up the calendar:**

1. Choose whether your weeks start on **Monday** or **Sunday**
2. Pick any date that falls in Week 1 of your fortnight cycle — the calendar will automatically snap to the nearest Mon/Sun and confirm the exact start date in green
3. The 14-day grid will populate with real dates

**Reading the calendar:**

- **Week 1** is shown in blue, **Week 2** in purple
- Today's cell is highlighted in amber
- Green cells indicate a child is marked as **in care** that day
- Blue dots on a cell show how many chores are scheduled for that day

**Editing a day:**

Tap any cell to open the **day detail panel**:

- **In Care** — tap a child's chip to toggle whether they're with you that day. Green = in care. This repeats every fortnight automatically.
- **Scheduled Chores** — lists all chores assigned to that day, with the child's name, points, and value. Tap **✕** to remove one.
- **+ Assign Chore** — opens a modal where you choose a child and a chore to add to that day. This assignment repeats every fortnight.

---

### Managing Chores

The Chores tab is where you create and manage all available chores.

**Adding a chore:**

Tap **+ Add Chore** and fill in:

| Field | Description |
|---|---|
| Icon | Pick an emoji to represent the chore |
| Chore Name | e.g. "Wash Dishes", "Feed the Dog" |
| Points | How many points this chore is worth |
| Type | **Recurring** (appears every fortnight) or **One-off** (single use) |
| Photo Required | If ticked, the child must upload a photo as proof before submitting |

> **Tip:** Use photo evidence for chores like "Clean Bedroom" where a quick snap keeps everyone honest. Skip it for simple ones like "Set the Table".

Chores appear in every child's Chores tab once created. Use the **Calendar** to assign specific chores to specific children on specific days if needed.

---

### Managing Banks

Banks are savings goals that children distribute their wallet points into. There are two types:

| Type | How it works |
|---|---|
| 🔄 **Recurring** | Resets after each redemption — e.g. "5 points = 15 min screen time" can be redeemed over and over |
| 🎯 **One-off Goal** | A single savings target — e.g. "40 points = new LEGO set". Once redeemed, the bank empties. |

**Adding a bank:**

1. Go to the **Banks** tab
2. Select the child using the pill selector at the top
3. Tap **+ Add Bank** and fill in the name, icon, reward description, points needed, and type

Banks are per-child — each child has their own set. This lets you tailor goals to each child's interests and age.

---

### Managing Children

The Children tab shows all children with their current wallet balance, total points earned, and PIN status.

**For each child you can:**

- **🎁 Gift Points** — inject points directly into their wallet (e.g. for birthdays, great behaviour, or a cash equivalent gift). Add a note like "Birthday bonus 🎂" that will show in their history.
- **✏️ Edit / Manage PIN** — change the child's name, avatar (emoji or photo), set a new PIN, or remove their PIN entirely. Use this if they forget their PIN.
- **Remove** — permanently removes the child and their data

**Adding a new child:**

Tap **+ Add Child**, choose an avatar emoji or upload a photo, enter their name, and optionally set a 4-digit PIN.

---

### Settings

The Settings tab has three sections:

#### Currency & Point Value

**Currency** — tap any of the 20 supported currencies to switch. The selection updates all money displays throughout the app instantly. Supported currencies include AUD, USD, GBP, EUR, NZD, CAD, SGD, ZAR, INR, JPY, CNY, HKD, AED, CHF, SEK, NOK, DKK, MXN, BRL, and PHP.

**Point Value** — set how much each point is worth in your chosen currency. The default is $0.50. You can change this at any time — for example:

- Start younger kids at $0.50 per point
- Reduce it as they get older to reflect real-world earning
- Use it as a teaching moment about wages and purchasing power

#### Parent Accounts

- **Edit Profile & PIN** — change your display name, avatar (emoji or photo), and PIN. You'll need to enter your current PIN to set a new one.
- **+ Add Parent** — add a second parent or carer with their own name, avatar, and PIN. Each parent logs in independently.
- **Remove** — remove a parent account (at least one must remain)

#### Family Stats

A quick snapshot showing the total number of children, chores, and approved completions.

---

## Child Portal

When a child taps their profile card (and enters their PIN if set), they land on their personal portal. The wallet banner at the top always shows their current point balance and dollar value.

### Chores Tab

Shows all available chores the child can claim. Each card displays:

- The chore icon and name
- Points value and dollar equivalent
- Whether photo evidence is required
- Whether it's recurring or one-off

**Claiming a chore:**

1. Tap **Claim Chore** on any card
2. If the chore requires a photo, tap the upload area to take or choose a photo
3. Tap **✅ Submit for Approval**
4. The button changes to **⏳ Pending** while a parent reviews it

Once a parent approves, the points land in the wallet automatically.

---

### Schedule Tab

If a parent has set up the fortnight calendar, this tab shows **today's scheduled chores** — the chores specifically assigned to this child for today's date in the fortnight cycle.

If no chores are scheduled for today, a message confirms this. General chores are always available in the Chores tab regardless of the calendar.

---

### Distribute Tab

The wallet holds unallocated points. This tab lets children **move points from their wallet into their savings banks** — teaching them to budget and save intentionally.

- Each bank shows its name, current saved balance, target, and a progress bar
- Enter how many points to move into each bank
- The running total and wallet balance after distribution is shown in real time
- Tap **💸 Distribute Points** to confirm

> **Tip:** Encourage children to allocate points as soon as they're earned, rather than letting them sit in the wallet. It builds the habit of purposeful saving.

---

### Banks Tab

Shows all the child's savings banks with their progress. For each bank:

- A progress bar shows how close they are to the goal
- Current saved points and target are shown alongside the dollar values

**For recurring banks** (like Screen Time), a yellow tally box appears after the first redemption showing:
- Total points spent on that reward to date
- Total dollar value spent
- How many times it's been redeemed
- A comparison: *"If you'd saved this instead, you'd be X% of the way to your [Goal] 🎮"*

This is the **financial literacy** moment — it shows children the real cost of impulse spending versus saving for something bigger.

**Redeeming a reward:**

When a bank reaches its target, a **🎉 Redeem!** button appears. Tapping it opens a nudge screen that shows:

- What they're about to spend and on what
- Their running tally for that reward
- A progress bar showing how far that money would have taken them toward a savings goal

They can then choose **"Yes, Redeem!"** or **"Save Instead"**. Either way, it's their choice — the nudge is purely informational.

Recurring banks reset and can be redeemed again. One-off goal banks complete and empty out.

---

### History Tab

A full record of everything that's happened in the child's account:

| Entry type | Colour | Description |
|---|---|---|
| 🧹 Chore earned | Amber left border | Points earned from approved chores |
| 🎁 Gift | Green left border | Points gifted by a parent |
| 🎉 Redemption | Purple left border | Points spent redeeming a reward |

Each entry shows the name, timestamp, points, and dollar value.

---

## The Point System

Points are the core currency of ChoreChart. Here's how they flow:

```
Complete chore → Parent approves → Points added to Wallet
                                          ↓
                              Child distributes to Banks
                                          ↓
                              Bank reaches target → Redeem reward
```

**Key rules:**
- Points only land in the wallet after **parent approval** — never automatically
- Points in the wallet are unallocated — children must actively distribute them to banks
- Recurring rewards can be redeemed repeatedly; goal banks complete once
- Parents can gift extra points at any time for any reason

---

## Split Care & the Fortnight Calendar

ChoreChart is built for families with **custom fortnight arrangements** — where care days vary week to week.

**How it works:**

1. The calendar runs on a fixed **14-day cycle** that repeats indefinitely
2. You set one anchor date (any date in Week 1) and the app calculates which fortnight day every real calendar date falls on
3. Mark which child is **in care** on each day — this repeats automatically each fortnight
4. Assign chores to specific children on specific days — these also repeat automatically

**Example setup — week on/week off:**
- Mark all 7 days of Week 1 for Child A
- Mark all 7 days of Week 2 for Child B
- Assign each child's chores to their respective week

**Example setup — alternating days:**
- Mark Mon/Wed/Fri of Week 1 and Tue/Thu of Week 2 for Child A
- Fill remaining days for Child B
- Mix and match however your arrangement works

Children only see today's scheduled chores in their **Schedule tab** — they don't see the full calendar.

---

## Installing on Your Phone

ChoreChart works as a **Progressive Web App (PWA)** — it installs on your home screen and behaves like a native app. No App Store needed.

### iPhone or iPad (Safari only)

1. Open your ChoreChart URL in **Safari**
2. Tap the **Share button** (the box with an arrow at the bottom of the screen)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **Add** in the top right corner

ChoreChart will appear on your home screen with its own icon.

### Android (Chrome)

1. Open your ChoreChart URL in **Chrome**
2. Tap the **three-dot menu** (top right)
3. Tap **"Add to Home Screen"**
4. Tap **Add**

---

## Deploying to Vercel

Vercel hosts ChoreChart for free and redeploys automatically every time you update a file in GitHub.

**First-time setup (~10 minutes):**

1. Create a free account at [github.com](https://github.com)
2. Create a new repository named `chorechart` (set to Public)
3. Upload the contents of the `chorechart` folder (not the zip — the folder contents)
4. Create a free account at [vercel.com](https://vercel.com)
5. Click **Add New Project** → Import your `chorechart` GitHub repo
6. Leave all settings as default → click **Deploy**
7. Vercel gives you a URL like `chorechart.vercel.app` — share this with your family

**Updating the app after changes:**

1. Download the updated `App.jsx` file
2. Go to your GitHub repo → `src/App.jsx`
3. Click the pencil ✏️ icon → paste in the new code → Commit
4. Vercel automatically redeploys in ~30 seconds
5. Refresh on your phone to see the changes

---

## Default Credentials

| Account | Type | Default PIN |
|---|---|---|
| Parent | Parent portal | `1234` |
| Alex 🦊 | Child | None (no PIN) |
| Sam 🐨 | Child | None (no PIN) |

**Change your PIN** in Settings → Edit Profile & PIN.

> **Important:** Data is stored in your browser's local storage. This means each device has its own copy of the data. Once a shared database is connected, all devices will sync in real time.

---

## Development

To run ChoreChart locally:

```bash
npm install
npm run dev
```

To build for production:

```bash
npm run build
```

Built with **React 18** + **Vite 5**. No external UI libraries — all styles are hand-written CSS-in-JS.
