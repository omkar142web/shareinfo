# Folder Feature — Implementation Plan

> **Project:** SHARE_INFO
> **Stack:** Express 5.2.1 · MongoDB (native driver) · EJS SSR · Vanilla JS · Cookie Auth · Socket.IO
> **Date:** 2026-07-25
> **Goal:** Add flat, color-coded folders to the existing centered dashboard. No sidebar. No layout change. Folders are metadata and filters — not a new page.

---

## Design Principles

- **Centered layout stays.** No sidebar in V1. No redesign.
- **Folders are a dropdown.** Not pills. Scales to any number of folders.
- **Cards get a tiny badge.** Colored dot + name. No icon. Like GitHub labels.
- **⋮ menu gets "Move to Folder."** Google Drive pattern.
- **Add/Edit form gets a folder combobox.** Custom searchable dropdown (Notion/VS Code style).
- **Flat folders only.** No nesting, no tree, no recursive queries.
- **Folder counts visible.** "College (18)" — people instantly know where notes live.
- **Ship fast, iterate later.** Sidebar comes only when users have 10+ folders and ask for it.

---

## What the Dashboard Looks Like

### Current

```
Header (Logo · Explore · Logout · + Add Data)

Search _________________________ Sort

Explore / Dashboard

ALL   PUBLIC   PRIVATE   FAVORITE

[Cards...]
```

### After Folders

```
Header (Logo · Explore · Logout · 📁 New Folder · + Add Data)

Search _________________________

Folder ▼ All                          Sort

Explore / Dashboard /{folder-name}

ALL   PUBLIC   PRIVATE   FAVORITE

```

### Folder Dropdown (click "Folder ▼ All")


### Folder Context Menu (click ⋮ on a folder)

```
┌──────────────────┐
│  Rename          │
│                  │
│  Delete          │
└──────────────────┘
```

### Card ⋮ Menu (Phase 2)

```
┌──────────────────────┐
│  📋 Copy             │
│  ⭐ Favorite         │
│  ──────────          │
│  📁 Move to Folder ▸ │
│  ──────────          │
│  🗑️ Delete           │
└──────────────────────┘
```

Move to Folder submenu:

```
┌──────────────────────┐
│  No folder           │
│  🔵 Work             │
│  🟣 College          │
│  🟢 Recipes          │
│  ──────────          │
│  📁 New Folder       │
└──────────────────────┘
```

### Empty Folder State

```
┌──────────────────────────────────┐
│                                  │
│  📁 College                      │
│                                  │
│  No notes yet.                   │
│                                  │
│  + Create Note                   │
│                                  │
└──────────────────────────────────┘
```

### Add/Edit Entry Form

```
Title
_____________

Folder
▼ College

Visibility   [Private toggle]

Content
_____________

[Save Entry]  [See All]
```

### Mobile: Folder Bottom Sheet

```
┌──────────────────────────┐
│  ── (handle)             │
│                          │
│  Folders                 │
│                          │
│  ✓ All                   │
│  🔵 Work (12)            │
│  🟣 College (18)         │
│  🟢 Recipes (5)          │
│                          │
│  ─────────────           │
│  📁 New Folder           │
└──────────────────────────┘
```

---


### 1.4 Frontend: Dashboard (`views/allInfo.ejs`)

#### Folder Dropdown Layout

```
┌──────────────────────────────────────┐
│ 🔍 Search folders...          ×      │  ← sticky
├──────────────────────────────────────┤
│ Recently Used                        │  ← section header (only if any)
│ ● College                    ✓       │
│ ● Work                               │
├──────────────────────────────────────┤  ← divider
│ All Folders                          │
│ ✓ All                                │
│ ● Work (12)                   ⋮     │
│ ● College (18)                 ⋮     │
│ ● Recipes (5)                  ⋮     │
│ ● Projects (3)                 ⋮     │
│ ● Archive (2)                  ⋮     │
│ ...                                  │
├──────────────────────────────────────┤
│ 📁 New Folder                        │ ← sticky footer
└──────────────────────────────────────┘
        ↑ only this area scrolls
```

#### Feature Checklist

**Search & Filter**
- Sticky search bar at top of dropdown
- Instant client-side filter while typing
- Case-insensitive
- Clear button (×) appears while typing
- ESC clears search first, then closes dropdown
- Matching text highlighted in folder names (`<mark>`)
- Search result counter: "4 folders found"
- Recently used section hidden while searching
- Zero folders: "No folders found" empty state

**Recently Used**
- Stored in `localStorage` (key: `shareinfo_recent_folders`, shared with combobox)
- Shows top 3 recently selected folders (5 in combobox, 3 here — less space)
- Selecting a folder moves it to top
- Section hidden when searching or when empty
- Divider separates recent from all folders

**Folder List**
- 9 visible rows before scrolling (`max-height: calc(9 * 36px)`)
- Thin custom scrollbar (6px, rounded, transparent track)
- Scrollable only in middle section (sticky search + sticky footer)
- Preserve scroll position between opens
- Selected folder scrolled into view on open

**Keyboard Support**
- ↑ ↓ navigate visible options
- Enter selects highlighted option
- Escape: clear search first → close dropdown second
- Tab closes dropdown
- Home jumps to first option
- End jumps to last option
- Auto-scrolls while navigating with arrow keys

**Animations**
- Dropdown open: fade + slight downward slide, 120ms ease
- Hover: smooth 100ms background transition
- Mobile: slide-up bottom sheet, 250ms ease

**Accessibility**
- `role="menu"`, `role="menuitemradio"`, `aria-checked`
- `aria-expanded` on trigger button
- Screen reader friendly (announces folder count, active state)

**Mobile** (screens ≤680px)
- Dropdown becomes bottom sheet (`position: fixed`, `border-radius: 16px 16px 0 0`)
- Dark overlay behind sheet, tap to close
- Search bar auto-focused, software keyboard opens
- Max height: `70vh`
- Handle bar at top

#### Folder Dropdown HTML

#### Folder Dropdown CSS


#### Folder Dropdown JavaScript

```javascript
// ── Folder Dropdown ──

#### Layout

<!-- ``` -->
┌────────────────────────────────────┐
│ 🔍 Search folders...          ×    │  ← sticky
├────────────────────────────────────┤
│ Recently Used                      │  ← section header (only if any)
│ ● College                    ✓     │
│ ● Work                              │
├────────────────────────────────────┤  ← divider
│ All Folders                        │
│ ○ No Folder                        │
│ ● Personal                  12     │
│ ● Java                      34     │
│ ● Recipes                    8     │
│ ● Projects                  15     │
│ ● Notes                      5     │
│ ● Archive                    2     │
│ ...                                │
├────────────────────────────────────┤
│ + Create Folder                    │ ← sticky footer
└────────────────────────────────────┘
        ↑ only this area scrolls
```

#### Feature Checklist

**Selection & Display**
- Hidden input stores `folderId`
- Placeholder: "No Folder" (treated as a normal option, not special)
- Selected folder shown with colored dot + name
- Chevron rotates 180° when opened
- Selected item always has checkmark
- Trigger updates instantly after selection
- Long folder names auto-truncated with `...` and `title` tooltip on hover

**Search**
- Sticky search bar at top
- Instant filter while typing (client-side, no backend)
- Case-insensitive
- Auto-focus search on open
- Clear button (×) appears while typing
- ESC clears search if text exists, ESC again closes dropdown
- Matching text highlighted in folder names (bold or accent color)
- Search result counter: "4 folders found"
- Recently used section hidden while searching
- Search results sorted: exact match first, then alphabetical

**Folder List**
- 9 visible rows before scrolling (calculated: `max-height: calc(9 * 36px)`)
- Thin custom scrollbar (6px, rounded, transparent track)
- Smooth scrolling
- Scrollable only in middle section (sticky search + sticky footer)
- Selected folder automatically scrolled into view on open
- Preserve scroll position when reopened after closing

**Recently Used**
- Stored in `localStorage` (key: `shareinfo_recent_folders`)
- Shows last 5 recently selected folders
- Selecting a folder moves it to top
- Section hidden when searching or when empty
- Divider separates recent from all folders

**Keyboard Support** (feels like VS Code command palette)
- ↑ ↓ navigate visible options
- Enter selects highlighted option
- Escape: clear search first → close dropdown second
- Tab closes dropdown
- Home jumps to first option
- End jumps to last option
- Auto-scrolls while navigating with arrow keys

**Mouse UX**
- Hover: background slightly brighter, cursor: pointer
- Click outside closes
- Double-click unnecessary (single click selects)

**Empty States**
- Search matches nothing: "🔍 No folders found" + `Create "query"` button
- Zero folders total: "📁 No folders yet. Create your first folder."
- "Create Folder" button in sticky footer always visible

**Loading**
- While folders load from server: skeleton rows (animated placeholder bars)
- Replaced by real content once loaded

**Animations**
- Dropdown open: fade + slight upward slide, 120ms ease
- Chevron rotation: smooth 200ms
- Selection: instant (no delay)
- Hover: smooth 100ms background transition

**Accessibility**
- `role="combobox"`, `role="listbox"`, `role="option"`
- `aria-expanded` on trigger
- `aria-selected` on highlighted option
- `aria-checked` on selected option
- Screen reader friendly (announces folder count, selected state)

**Validation (client-side)**
- Duplicate folder name: show "✓ Already exists" inline instead of waiting for server
- Prevents double-submit on create

**Performance**
- No virtualization needed (flat folders)
- Handles 100-200 folders smoothly with search + scrollable list

#### Combobox Structure

Add after the visibility row (after line 157). Hidden input holds the actual `folderId` value for form submission.

#### Selection behavior

1. Selecting a folder closes the dropdown immediately.
2. Trigger updates to show the selected folder's dot + name.
3. Hidden input value updates.
4. Selected folder ID saved to `localStorage` for "Recently Used."
5. Next open: selected option scrolled into view, scroll position preserved.

#### Remember Last Choice (optional future)

If user repeatedly creates notes in "College", auto-preselect "College" next time. Store last selected folder ID in `localStorage` separately from recent list.

---

### 1.6 Dashboard Folder Dropdown — Summary

The dashboard dropdown in section 1.4 already includes all polished UX features: search, recently used, keyboard navigation, scrollable list, loading skeleton, and mobile bottom sheet. The only difference from the combobox in section 1.5: clicking a folder navigates to `?folderId=X` (filter), not updating a form input (selector). All other behavior — search, recently used, keyboard, animations, accessibility — is identical.

---

## Phase 2: Move to Folder (1-2 hours)

### 2.1 New API Endpoint

**`PATCH /api/entries/:id/move-folder`**

Add to `routes/folderRoutes.js`:

```javascript
router.patch("/api/entries/:id/move-folder", fc.moveEntryToFolder);
```

Controller:

```javascript
export const moveEntryToFolder = async (req, res, next) => {
  // 1. Auth check
  // 2. Validate entry exists, belongs to user
  // 3. If folderId provided, validate folder exists, belongs to user
  // 4. Update entry: set folderId, folderName, folderColor
  // 5. Return { success, entry: { _id, folderId, folderName, folderColor } }
};
```

### 2.2 Card⋮ Menu HTML

Add to each card's `.card-quick-actions` div:

```html
<button class="card-quick-action card-menu-icon" type="button" data-card-id="<%= person._id %>" aria-label="More options">
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
  </svg>
</button>
```

### 2.3 Card Context Menu HTML
---

## Phase 3: Sidebar (future, only if needed)

**Only implement when users report difficulty finding folders with 10+.**

Replace the dropdown with a collapsible left sidebar. Copy the sidebar design from earlier plan iterations.

**Trigger:** User feedback indicates 10+ folders make the dropdown hard to navigate.

---

## Socket.IO (V1 — minimal)

No folder-specific Socket.IO events in V1. Folder CRUD operations don't need real-time sync across tabs. A page reload handles it. Add Socket.IO folder events in Phase 3 if multi-tab sync becomes a priority.

---

## API Summary

| Method | Endpoint | Purpose | Phase |
|--------|----------|---------|-------|
| GET | `/api/folders` | List user's folders (with entry counts) | 1 |
| POST | `/api/folders` | Create folder | 1 |
| PATCH | `/api/folders/:id` | Rename folder | 1 |
| PATCH | `/api/folders/:id/color` | Change folder color | 1 |
| DELETE | `/api/folders/:id` | Delete folder (orphan entries) | 1 |
| PATCH | `/api/entries/:id/move-folder` | Move entry to/from folder | 2 |

All endpoints require auth (same cookie pattern as existing).

---

## Files Summary

### Files to Create

| File | Lines (est.) | Purpose |
|------|-------------|---------|
| `routes/folderRoutes.js` | ~25 | Express router |
| `controllers/folderController.js` | ~220 | HTTP handlers (list, create, rename, color, delete, move-entry) |
| `services/folderService.js` | ~150 | Business logic + entry count aggregation |

### Files to Modify

| File | Changes | Lines (est.) |
|------|---------|-------------|
| `server.js` | Import + mount folderRoutes | ~2 |
| `config/mongodb.js` | Add folder indexes | ~5 |
| `controllers/authControllers.js` | Add `folderId` to getHome, getEntriesPage, createPost, getAddPage, getUpdatePage; fetch folders with counts for dropdown; pass activeFolderName/Color to template | ~50 |
| `services/auth.service.js` | Add `folderId` param to getPagedUserDataWithVisibility, getPagedAllDataWithVisibility | ~10 |
| `views/allInfo.ejs` | Folder dropdown HTML (~120 lines), folder dropdown CSS (~250 lines), folder dropdown JS (~200 lines), folder modals HTML (~100 lines), card folder badge (~15 lines), update buildCard/updateEmptyState/loadMore (~20 lines), empty folder state (~20 lines) | ~725 |
| `views/updateInformation.ejs` | Folder dropdown HTML (~20 lines), form submission update (~5 lines) | ~25 |

### Database

| Change | Type |
|--------|------|
| Create `folders` collection | New |
| Unique index `{email, name}` on `folders` | New |
| Compound index `{email, folderId, _id}` on `anyInformation` | New |
| Add `folderId`, `folderName`, `folderColor` to existing entries | Migration |

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────┐
│              Browser (EJS + Vanilla JS)                │
│                                                       │
│  Header (📁 New Folder button)                        │
│  Search                                               │
│  Folder Dropdown ──→ fetch /api/folders               │
│  Filters (ALL/PUBLIC/PRIVATE/FAVORITE)                │
│                                                       │
└───────────────────────┬──────────────────────────────┘
                        │ Fetch API
┌───────────────────────┴──────────────────────────────┐
│                 Express Server                         │
│                                                       │
│  folderRoutes          authRoutes                      │
│  /api/folders          /, /add, /api/entries           │
│  /api/entries/:id/move-folder                         │
│       │                    │                           │
│  folderController      authController                  │
│  folderService         authService (+folderId filter)  │
│       │                    │                           │
│       └────────┬───────────┘                           │
│                │                                       │
│         getCollection()                                │
└───────────────────────┬──────────────────────────────┘
                        │
┌───────────────────────┴──────────────────────────────┐
│                 MongoDB Atlas                          │
│                                                       │
│  folders (new)    anyInformation (+folderId)    users  │
└──────────────────────────────────────────────────────┘
```

---

## Edge Cases

| Case | Handling |
|------|----------|
| Duplicate folder name per user | Unique index → 409 error |
| Delete folder with entries | Entries get `folderId/folderName/folderColor=null`, stay in "All Entries" |
| Move entry to non-existent folder | 404 on folder lookup |
| Move entry to another user's folder | 404 (ownership check) |
| Empty folder | Shows dedicated empty state: "No notes yet. + Create Note" |
| No folders yet | Dropdown shows just "All" + "New Folder" |
| Search within folder | `folderId` filter + search combined |
| Folder rename | Bulk update `folderName` on all entries with that folderId |
| Folder color change | Bulk update `folderColor` on all entries with that folderId |
| Master/admin user | Folders per-user. Admin sees entries from all, folders scoped to owner |
| Mobile | Dropdown becomes bottom sheet with overlay |

---

## What Ships in Each Phase

### Phase 1 (2-3 hours)
- Folder CRUD API (list with counts, create, rename, color, delete)
- Folder dropdown on dashboard with polished UX (search, recently used, keyboard nav, scroll, mobile bottom sheet)
- Create folder modal (name + 6 color swatches)
- Rename folder modal
- Change color modal
- Delete folder confirmation
- Folder badge on cards (tiny dot + name)
- Custom searchable combobox in Add/Edit form (section 1.5)
- Folder filtering (select folder → filter cards)
- Breadcrumb shows current folder name
- Empty folder state ("No notes yet. + Create Note")
- Mobile bottom sheet for folder picker (both dashboard and form)
- Header gets "📁 New Folder" ghost button
- Recently Used folders (localStorage, shared between dashboard and form)
- Loading skeleton while folders load

### Phase 2 (1-2 hours)
- Card ⋮ context menu
- "Move to Folder" submenu with folder list
- Move entry API endpoint
- Real-time card badge update on move
- Toast notifications for folder operations

### Phase 3 (future)
- Collapsible sidebar (replaces dropdown)
- Socket.IO folder events
- Folder drag-and-drop reordering
- Nested folders (add `parentId` to schema)
