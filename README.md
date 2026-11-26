# cricket-stats-manager

Create a web app called **Cricket Players Statistics Manager**.

Purpose:
To allow an Admin to fully control player and team statistics — including adding, editing, or deleting player data, uploading DPs, and managing announcements — while users can only view stats.

---

### 🧩 Priority 1: Admin Control Panel

**Admin Dashboard Features (highest priority):**
1. Admin login (simple password-based access, e.g., "admin123").
2. Sections under Admin Panel:
   - **Player Management**
     - Add new player with fields:
       - Name
       - Role (Batsman, Bowler, All-Rounder)
       - Matches Played
       - Profile Photo (upload DP with local image storage)
     - Edit existing player stats (batting + bowling).
     - Delete players with confirmation alert.
   - **Team Management**
     - Create new teams and assign players.
     - Set Captain & Vice-Captain.
     - Remove or update players from team.
   - **Announcement Management**
     - Add new announcements (Title, Description, Date).
     - Edit or remove announcements.

**Upload System:**
- Admin can upload Player Profile Images (DPs) from local device.
- Show preview before saving.
- Images stored locally or in Lovable’s default storage.

---

### 🏏 Player Statistics Management (Editable Only by Admin)

**Batting Stats**
- Fields: Innings, Runs, Not Outs, Average, Highest Score, Fours, Sixes.
- Auto-calculate Average = Runs ÷ (Innings - Not Outs).
- Editable from Admin Dashboard only.

**Bowling Stats**
- Fields: Matches, Innings, Wickets, Runs Conceded, Economy Rate, Best Bowling (BBF), 3W, 4W.
- Auto-calculate Economy = Runs Conceded ÷ Overs Bowled.
- Editable only by Admin.

---

### 🧢 Team & Squad Management
- Create teams and squads.
- Assign players to a specific team.
- Mark **Captain** and **Vice-Captain** (badges visible on player cards).
- Option to edit or remove players from team.

---

### 🏆 Leaderboards (View Only)
- Top 10 Batsmen sorted by Runs or Average.
- Top 10 Bowlers sorted by Wickets or Economy.
- Leaderboards update automatically when Admin edits stats.
- Captains & Vice-Captains highlighted.

---

### ⚖️ Player vs Player Comparison (View Only)
- Select any two players.
- Show side-by-side comparison:
  - Batting: Runs, Average, HS, Fours, Sixes.
  - Bowling: Wickets, Economy, BBF.
- Highlight best performer per category.

---

### 📢 Announcements (Admin Only for Updates)
- Admin can post, edit, or delete announcements.
- Shown on main dashboard as newsfeed cards.

---

### 🎨 UI/UX Requirements
- Prioritize **Admin Panel visibility** — Admin can access all edit/delete options easily.
- Tabs: **Admin | Players | Teams | Batting | Bowling | Leaderboards | Compare | Announcements**
- Simple, clean, and responsive UI inspired by **CricHeroes**.
- Color Palette:
  - Green (#2ECC71)
  - Navy Blue (#2C3E50)
  - Yellow (#F1C40F)
  - White (#F8F9FA)
- Fonts:
  - Headings: Montserrat Bold
  - Body Text: Poppins Regular

---

### 📁 Data Source
- Connect to a Google Sheet (or local database) with tables:
  - Players
  - Batting Stats
  - Bowling Stats
  - Teams
  - Announcements

Use preloaded sample stats if available.

---

### 🚀 Output
Generate a web app that:
- Opens directly to **Admin Dashboard** (if logged in as Admin).
- Allows Admin to manage all players, stats, and announcements.
- Updates reflect instantly across all sections (leaderboards, comparisons, teams).
- Provides read-only access for public users.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://cricket-stats-manager.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e738ce38-25da-477c-af08-019fa4de1a56).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
