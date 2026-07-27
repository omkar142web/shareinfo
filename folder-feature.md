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

Explore / Dashboard

ALL   PUBLIC   PRIVATE   FAVORITE

[Cards with tiny ● folder badges...]
```

### Folder Dropdown (click "Folder ▼ All")

```
┌──────────────────────────────┐
│  Folders                     │
│                              │
│  ✓ All                       │
│  🔵 Work (12)         ⋮     │
│  🟣 College (18)      ⋮     │
│  🟢 Recipes (5)       ⋮     │
│                              │
│  ─────────────────           │
│  📁 New Folder               │
└──────────────────────────────┘
```

### Folder Context Menu (click ⋮ on a folder)

```
┌──────────────────┐
│  Rename          │
│  Change Color    │
│  ──────────      │
│  Delete          │
└──────────────────┘
```

### Card with Folder Badge

```
NOTE / PRIVATE

● College

Java Scanner
...
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

## Phase 1: Add Folders (2-3 hours)

### 1.1 Database

**New collection: `folders`**

```javascript
{
  _id: ObjectId,
  email: String,      // owner
  name: String,       // 1-255 chars, trimmed
  color: String,      // "blue" | "purple" | "green" | "red" | "orange" | "pink"
  createdAt: Date
}
```

No `parentId`, no `path`, no `isDeleted`, no `updatedAt`, no `entryCount` (computed on demand).

**Modify `anyInformation`:** Add optional `folderId`, `folderName`, `folderColor` fields.

```javascript
// Migration (one-time)
db.anyInformation.updateMany(
  { folderId: { $exists: false } },
  { $set: { folderId: null, folderName: null, folderColor: null } }
);
```

`folderName` and `folderColor` are denormalized on the entry to avoid joins on every page load. When renaming a folder or changing its color, bulk-update all entries with that `folderId`.

**Indexes:**

```javascript
// config/mongodb.js → createIndexes()
const foldersCollection = actuallDB.collection("folders");
await Promise.all([
  foldersCollection.createIndex({ email: 1, name: 1 }, { unique: true }),
  infoCollection.createIndex({ email: 1, folderId: 1, _id: -1 }),
]);
```

### 1.2 Backend: 3 New Files

**`routes/folderRoutes.js`** (~25 lines)

```javascript
import express from "express";
import * as fc from "../controllers/folderController.js";
const router = express.Router();

router.get("/api/folders", fc.listFolders);
router.post("/api/folders", fc.createFolder);
router.patch("/api/folders/:id", fc.renameFolder);
router.patch("/api/folders/:id/color", fc.updateColor);
router.delete("/api/folders/:id", fc.deleteFolder);

export default router;
```

**`controllers/folderController.js`** (~200 lines)

Auth pattern: same as existing `authControllers.js` (check cookies, find user, validate).

```javascript
export const listFolders = async (req, res, next) => {
  // 1. Auth check
  // 2. Get folders + compute entry counts via aggregation
  // 3. Return { folders: [{ _id, name, color, entryCount }] }
};

export const createFolder = async (req, res, next) => {
  // 1. Auth check
  // 2. Validate name (1-255 chars), validate color
  // 3. Check no duplicate name for this email → 409
  // 4. insertOne
  // 5. Return { success, folder }
};

export const renameFolder = async (req, res, next) => {
  // 1. Auth check
  // 2. Validate name, check ownership, check uniqueness
  // 3. updateOne folder
  // 4. Bulk update folderName on all entries with this folderId
  // 5. Return { success, folder }
};

export const updateColor = async (req, res, next) => {
  // 1. Auth check
  // 2. Validate color
  // 3. updateOne folder
  // 4. Bulk update folderColor on all entries with this folderId
  // 5. Return { success, folder }
};

export const deleteFolder = async (req, res, next) => {
  // 1. Auth check
  // 2. Check ownership
  // 3. Set folderId/folderName/folderColor=null on all entries in this folder
  // 4. deleteOne folder
  // 5. Return { success, deletedFolderId, orphanedEntries }
};
```

**`services/folderService.js`** (~150 lines)

```javascript
import { getCollection } from "../config/mongodb.js";
import { ObjectId } from "mongodb";

const VALID_COLORS = new Set(["blue", "purple", "green", "red", "orange", "pink"]);

export const listFolders = async (email) => {
  const folders = await getCollection("folders")
    .find({ email })
    .sort({ name: 1 })
    .toArray();

  if (folders.length === 0) return [];

  // Compute entry counts per folder
  const folderIds = folders.map(f => f._id);
  const counts = await getCollection("anyInformation")
    .aggregate([
      { $match: { folderId: { $in: folderIds } } },
      { $group: { _id: "$folderId", count: { $sum: 1 } } }
    ])
    .toArray();

  const countMap = new Map(counts.map(c => [c._id.toString(), c.count]));

  return folders.map(f => ({
    _id: f._id,
    name: f.name,
    color: f.color,
    entryCount: countMap.get(f._id.toString()) || 0,
  }));
};

export const createFolder = async (email, name, color) => {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 255) throw { statusCode: 400, message: "Invalid name" };
  if (!VALID_COLORS.has(color)) throw { statusCode: 400, message: "Invalid color" };

  const existing = await getCollection("folders").findOne({ email, name: trimmed });
  if (existing) throw { statusCode: 409, message: "Folder already exists" };

  const folder = { email, name: trimmed, color, createdAt: new Date() };
  const result = await getCollection("folders").insertOne(folder);
  return { ...folder, _id: result.insertedId };
};

export const renameFolder = async (email, folderId, name) => {
  const folder = await getCollection("folders").findOne({ _id: new ObjectId(folderId), email });
  if (!folder) throw { statusCode: 404, message: "Folder not found" };

  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 255) throw { statusCode: 400, message: "Invalid name" };

  const duplicate = await getCollection("folders").findOne({
    email, name: trimmed, _id: { $ne: new ObjectId(folderId) }
  });
  if (duplicate) throw { statusCode: 409, message: "Folder name taken" };

  await getCollection("folders").updateOne(
    { _id: new ObjectId(folderId) },
    { $set: { name: trimmed } }
  );

  // Update denormalized folderName on all entries in this folder
  await getCollection("anyInformation").updateMany(
    { folderId: new ObjectId(folderId) },
    { $set: { folderName: trimmed } }
  );

  return { _id: folderId, name: trimmed, color: folder.color };
};

export const updateColor = async (email, folderId, color) => {
  if (!VALID_COLORS.has(color)) throw { statusCode: 400, message: "Invalid color" };
  const folder = await getCollection("folders").findOne({ _id: new ObjectId(folderId), email });
  if (!folder) throw { statusCode: 404, message: "Folder not found" };

  await getCollection("folders").updateOne(
    { _id: new ObjectId(folderId) },
    { $set: { color } }
  );

  // Update denormalized folderColor on all entries
  await getCollection("anyInformation").updateMany(
    { folderId: new ObjectId(folderId) },
    { $set: { folderColor: color } }
  );

  return { _id: folderId, name: folder.name, color };
};

export const deleteFolder = async (email, folderId) => {
  const folder = await getCollection("folders").findOne({ _id: new ObjectId(folderId), email });
  if (!folder) throw { statusCode: 404, message: "Folder not found" };

  const result = await getCollection("anyInformation").updateMany(
    { folderId: new ObjectId(folderId) },
    { $set: { folderId: null, folderName: null, folderColor: null } }
  );

  await getCollection("folders").deleteOne({ _id: new ObjectId(folderId) });
  return { deletedFolderId: folderId, orphanedEntries: result.modifiedCount };
};
```

**`server.js`** — add 2 lines:

```javascript
import folderRoutes from "./routes/folderRoutes.js";
app.use("/", folderRoutes);  // after existing routes
```

### 1.3 Backend: Modified Files

**`controllers/authControllers.js`**

`getHome` — accept `folderId` query param, pass to service + template:

```javascript
const folderId = req.query.folderId || null;

// In the normal user branch:
page = await getPagedUserDataWithVisibility(
  user.email, null, DEFAULT_PAGE_SIZE, visibility, keyword, sort, folderId
);

// Also fetch folders for the dropdown
const folders = await getCollection("folders")
  .find({ email: user.email }).sort({ name: 1 }).toArray();

// Compute entry counts for dropdown
const folderIds = folders.map(f => f._id);
const counts = folderIds.length > 0
  ? await getCollection("anyInformation").aggregate([
      { $match: { folderId: { $in: folderIds } } },
      { $group: { _id: "$folderId", count: { $sum: 1 } } }
    ]).toArray()
  : [];
const countMap = new Map(counts.map(c => [c._id.toString(), c.count]));
const foldersWithCounts = folders.map(f => ({
  ...f, entryCount: countMap.get(f._id.toString()) || 0
}));

// Find active folder name/color for breadcrumb
const activeFolder = folderId
  ? folders.find(f => f._id.toString() === folderId)
  : null;

return res.render("allInfo", {
  // ...existing fields...
  activeFolderId: folderId,
  activeFolderName: activeFolder?.name || null,
  activeFolderColor: activeFolder?.color || null,
  folders: foldersWithCounts,
});
```

`getEntriesPage` — accept `folderId`, pass to service.

`createPost` — store `folderId`, `folderName`, `folderColor` in entry:

```javascript
let folderId = null, folderName = null, folderColor = null;
if (req.body.folderId && ObjectId.isValid(req.body.folderId)) {
  folderId = new ObjectId(req.body.folderId);
  // Look up folder name/color for denormalization
  const folder = await getCollection("folders").findOne({ _id: folderId });
  if (folder) { folderName = folder.name; folderColor = folder.color; }
}

const addedData = await collection.insertOne({
  name, info,
  isPublic: req.body.isPublic === true,
  isFavorite: false,
  folderId, folderName, folderColor,
  ownerName: user.name,
  createdAt: now, updatedAt: now,
  email: user.email,
});
```

`getAddPage` / `getUpdatePage` — fetch folders, pass to template:

```javascript
const folders = await getCollection("folders")
  .find({ email: user.email }).sort({ name: 1 }).toArray();

return res.render("updateInformation", {
  // ...existing...
  folders,
  activeFolderId: data?.folderId?.toString() || req.query.folderId || null,
});
```

**`services/auth.service.js`**

Add `folderId` parameter to `getPagedUserDataWithVisibility`:

```javascript
export const getPagedUserDataWithVisibility = async (
  email, cursor, limit = 20, visibility = "all", search = "", sort = "updated",
  folderId = null  // NEW
) => {
  const filter = { email };
  if (folderId && ObjectId.isValid(folderId)) {
    filter.folderId = new ObjectId(folderId);
  }
  // ...existing visibility logic...
  return getPagedCollection({ cursor, filter, limit, search, sort });
};
```

Same for `getPagedAllDataWithVisibility` (admin).

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

Insert between `</form>` (line 2161) and `<nav class="breadcrumb">` (line 2163):

```html
<% if (typeof isMaster === "undefined" || !isMaster) { %>
<div class="folder-selector" id="folderSelector">
  <button class="folder-selector-btn" id="folderSelectorBtn" type="button" aria-haspopup="menu" aria-expanded="false">
    <span class="folder-selector-label">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
      Folder
    </span>
    <span class="folder-selector-current">
      <% if (activeFolderName) { %>
        <span class="folder-dot" style="background: var(--folder-<%= activeFolderColor || 'blue' %>)"></span>
        <%= activeFolderName %>
      <% } else { %>
        All
      <% } %>
    </span>
    <svg class="folder-selector-chevron" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  </button>

  <div class="folder-dropdown" id="folderDropdown" role="menu" hidden>
    <!-- Sticky search bar -->
    <div class="folder-dropdown-search-wrap">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input type="text" class="folder-dropdown-search" id="folderSearch" placeholder="Search folders..." autocomplete="off" aria-label="Search folders" />
      <button type="button" class="folder-dropdown-clear" id="folderClear" hidden aria-label="Clear search">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <!-- Search counter (shown when searching) -->
    <div class="folder-dropdown-counter" id="folderCounter" hidden>
      <span id="folderCounterText">0 folders found</span>
    </div>

    <!-- Scrollable list area -->
    <div class="folder-dropdown-list" id="folderList" role="listbox" aria-label="Folders">

      <!-- Recently used section (hidden when searching) -->
      <div class="folder-dropdown-section" id="folderRecentSection" hidden>
        <div class="folder-dropdown-section-header">Recently Used</div>
      </div>

      <!-- Divider (shown when recent section is visible) -->
      <div class="folder-dropdown-divider" id="folderRecentDivider" hidden></div>

      <!-- "All Folders" header -->
      <div class="folder-dropdown-section-header" id="folderAllHeader">All Folders</div>

      <!-- "All" option -->
      <button class="folder-dropdown-item <%= !activeFolderId ? 'is-active' : '' %>" data-folder="" role="menuitemradio" aria-checked="<%= !activeFolderId ? 'true' : 'false' %>">
        <span class="folder-dropdown-check" aria-hidden="true">✓</span>
        <span>All</span>
      </button>

      <!-- Folder rows -->
      <% if (typeof folders !== 'undefined' && folders.length > 0) { %>
        <% folders.forEach(folder => { %>
        <div class="folder-dropdown-row">
          <button class="folder-dropdown-item <%= activeFolderId === folder._id.toString() ? 'is-active' : '' %>" data-folder="<%= folder._id %>" data-name="<%= folder.name %>" data-color="<%= folder.color %>" role="menuitemradio" aria-checked="<%= activeFolderId === folder._id.toString() ? 'true' : 'false' %>">
            <span class="folder-dropdown-check" aria-hidden="true">✓</span>
            <span class="folder-dot" style="background: var(--folder-<%= folder.color %>)"></span>
            <span class="folder-dropdown-name"><%= folder.name %></span>
            <span class="folder-dropdown-count"><%= folder.entryCount %></span>
          </button>
          <button class="folder-dropdown-menu-btn" data-folder-id="<%= folder._id %>" data-folder-name="<%= folder.name %>" data-folder-color="<%= folder.color %>" aria-label="<%= folder.name %> options" title="Folder options">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
          </button>
        </div>
        <% }) %>
      <% } %>

      <!-- Zero folders state -->
      <% if (typeof folders === 'undefined' || folders.length === 0) { %>
        <div class="folder-dropdown-zero" id="folderZero">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <span>No folders yet</span>
          <span class="folder-dropdown-zero-hint">Create your first folder</span>
        </div>
      <% } %>
    </div>

    <!-- Empty search state -->
    <div class="folder-dropdown-empty" id="folderEmpty" hidden>
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <span>No folders found</span>
    </div>

    <!-- Sticky footer: New Folder -->
    <div class="folder-dropdown-footer">
      <button class="folder-dropdown-create" id="folderDropdownCreate" role="menuitem">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span id="folderCreateText">New Folder</span>
      </button>
    </div>
  </div>
</div>

<!-- Folder Context Menu (for rename/color/delete) -->
<div class="folder-context-menu" id="folderContextMenu" hidden>
  <button class="context-item" data-action="rename">✏️ Rename</button>
  <button class="context-item" data-action="color">🎨 Change Color</button>
  <div class="context-divider"></div>
  <button class="context-item context-danger" data-action="delete">🗑️ Delete</button>
</div>
<% } %>
```

#### Folder Dropdown CSS

Add to the inline `<style>` block:

```css
/* ── Folder Selector ── */
.folder-selector {
  position: relative;
  display: inline-block;
}

.folder-selector-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: rgba(15, 25, 45, 0.4);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.folder-selector-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
  color: var(--text-primary);
}

.folder-selector-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
}

.folder-selector-current {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 500;
  color: var(--text-primary);
}

.folder-selector-chevron {
  transition: transform 0.2s;
}

.folder-selector[aria-expanded="true"] .folder-selector-chevron {
  transform: rotate(180deg);
}

/* ── Folder Dropdown (flex column layout) ── */
.folder-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 240px;
  max-width: 320px;
  background: rgba(15, 25, 45, 0.97);
  border: 1px solid var(--border);
  border-radius: 10px;
  backdrop-filter: blur(20px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  z-index: 100;
  animation: folderFadeIn 0.12s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@keyframes folderFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Sticky search bar ── */
.folder-dropdown-search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.folder-dropdown-search-wrap svg {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.folder-dropdown-search {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 0.85rem;
}

.folder-dropdown-search::placeholder {
  color: var(--text-secondary);
}

.folder-dropdown-clear {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}

.folder-dropdown-clear:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.08);
}

/* ── Search counter ── */
.folder-dropdown-counter {
  padding: 4px 12px;
  font-size: 0.7rem;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

/* ── Scrollable list (only this area scrolls) ── */
.folder-dropdown-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
  max-height: calc(9 * 36px);
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.15) transparent;
}

.folder-dropdown-list::-webkit-scrollbar { width: 5px; }
.folder-dropdown-list::-webkit-scrollbar-track { background: transparent; }
.folder-dropdown-list::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 3px;
}

/* ── Section headers ── */
.folder-dropdown-section-header {
  padding: 6px 10px 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

/* ── Divider ── */
.folder-dropdown-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 8px;
}

/* ── Option rows ── */
.folder-dropdown-row {
  display: flex;
  align-items: center;
}

.folder-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-family: var(--font-body);
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  transition: background 0.1s;
}

.folder-dropdown-item:hover,
.folder-dropdown-item.is-highlighted {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.folder-dropdown-item.is-active {
  color: var(--cyan);
}

.folder-dropdown-check {
  width: 14px;
  font-size: 0.75rem;
  color: var(--cyan);
  flex-shrink: 0;
}

.folder-dropdown-item:not(.is-active) .folder-dropdown-check {
  visibility: hidden;
}

.folder-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.folder-dropdown-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-dropdown-count {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  margin-left: 4px;
}

/* ── ⋮ menu button on each folder row ── */
.folder-dropdown-menu-btn {
  opacity: 0;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  flex-shrink: 0;
  transition: opacity 0.1s;
}

.folder-dropdown-row:hover .folder-dropdown-menu-btn {
  opacity: 1;
}

.folder-dropdown-menu-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

/* ── Search match highlight ── */
.folder-dropdown-highlight {
  background: rgba(139, 92, 246, 0.25);
  color: var(--text-primary);
  border-radius: 2px;
  padding: 0 1px;
}

/* ── Empty search state ── */
.folder-dropdown-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 16px;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

/* ── Zero folders state ── */
.folder-dropdown-zero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 20px 16px;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.folder-dropdown-zero-hint {
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* ── Sticky footer ── */
.folder-dropdown-footer {
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.folder-dropdown-create {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
}

.folder-dropdown-create:hover {
  background: rgba(139, 92, 246, 0.1);
}

/* ── Folder Context Menu ── */
.folder-context-menu {
  position: fixed;
  z-index: 200;
  background: rgba(15, 25, 45, 0.95);
  border: 1px solid var(--border);
  border-radius: 8px;
  backdrop-filter: blur(16px);
  padding: 4px;
  min-width: 160px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.context-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  border: none;
  background: none;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-family: var(--font-body);
  border-radius: 6px;
  cursor: pointer;
}

.context-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.context-danger:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
}

.context-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 8px;
}

/* ── Folder Colors ── */
:root {
  --folder-blue: #3b82f6;
  --folder-purple: #a855f7;
  --folder-green: #22c55e;
  --folder-red: #ef4444;
  --folder-orange: #f97316;
  --folder-pink: #ec4899;
}

/* ── Loading skeleton ── */
.folder-dropdown-skeleton {
  padding: 8px;
}

.folder-dropdown-skeleton .skeleton-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
}

.folder-dropdown-skeleton .skeleton-bar {
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 200% 100%;
  animation: folderSkeletonShimmer 1.5s infinite;
  flex: 1;
}

.folder-dropdown-skeleton .skeleton-bar.short {
  flex: 0 0 30px;
}

@keyframes folderSkeletonShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Mobile Bottom Sheet ── */
@media (max-width: 680px) {
  .folder-dropdown {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    min-width: unset;
    max-width: unset;
    border-radius: 16px 16px 0 0;
    max-height: 70vh;
    transform: translateY(100%);
    transition: transform 0.25s ease;
  }

  .folder-dropdown.is-open {
    transform: translateY(0);
  }

  .folder-dropdown::before {
    content: '';
    display: block;
    width: 36px;
    height: 4px;
    background: var(--text-muted);
    border-radius: 2px;
    margin: 8px auto 0;
    opacity: 0.4;
  }

  .folder-sheet-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 99;
  }

  .folder-sheet-overlay.is-visible {
    display: block;
  }
}
```

#### Folder Dropdown JavaScript

```javascript
// ── Folder Dropdown ──
(() => {
  const btn = document.getElementById('folderSelectorBtn');
  const dropdown = document.getElementById('folderDropdown');
  const search = document.getElementById('folderSearch');
  const clearBtn = document.getElementById('folderClear');
  const counter = document.getElementById('folderCounter');
  const counterText = document.getElementById('folderCounterText');
  const list = document.getElementById('folderList');
  const empty = document.getElementById('folderEmpty');
  const recentSection = document.getElementById('folderRecentSection');
  const recentDivider = document.getElementById('folderRecentDivider');
  const allHeader = document.getElementById('folderAllHeader');
  const createBtn = document.getElementById('folderDropdownCreate');
  const createText = document.getElementById('folderCreateText');
  const allItems = list.querySelectorAll('.folder-dropdown-item[data-folder]');
  let highlighted = -1;
  let savedScrollTop = 0;
  const RECENT_KEY = 'shareinfo_recent_folders';
  const MAX_RECENT_DASHBOARD = 3;

  // ── Recently Used ──
  function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
    catch { return []; }
  }

  function saveRecent(folderId) {
    if (!folderId) return;
    let recent = getRecent().filter(id => id !== folderId);
    recent.unshift(folderId);
    if (recent.length > MAX_RECENT_DASHBOARD) recent = recent.slice(0, MAX_RECENT_DASHBOARD);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  }

  function renderRecent() {
    const recent = getRecent();
    if (recent.length === 0) {
      recentSection.hidden = true;
      recentDivider.hidden = true;
      return;
    }
    recentSection.hidden = false;
    recentDivider.hidden = false;
    recentSection.querySelectorAll('.folder-dropdown-item').forEach(o => o.remove());
    recent.forEach(id => {
      const match = list.querySelector(`.folder-dropdown-item[data-folder="${id}"]`);
      if (match) recentSection.appendChild(match.cloneNode(true));
    });
  }

  // ── Open / Close ──
  function open() {
    dropdown.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    search.value = '';
    clearBtn.hidden = true;
    counter.hidden = true;
    renderRecent();
    filterOptions();
    list.scrollTop = savedScrollTop;
    highlighted = Array.from(list.querySelectorAll('.folder-dropdown-item:not([hidden])'))
      .findIndex(o => o.classList.contains('is-active'));
    if (highlighted < 0) highlighted = 0;
    highlightOption();
    if (window.innerWidth <= 680) {
      let overlay = document.querySelector('.folder-sheet-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'folder-sheet-overlay';
        document.body.appendChild(overlay);
      }
      overlay.classList.add('is-visible');
      overlay.onclick = () => { close(); overlay.classList.remove('is-visible'); };
      dropdown.classList.add('is-open');
    }
    search.focus();
  }

  function close() {
    savedScrollTop = list.scrollTop;
    dropdown.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    btn.focus();
    const overlay = document.querySelector('.folder-sheet-overlay');
    if (overlay) overlay.classList.remove('is-visible');
    dropdown.classList.remove('is-open');
  }

  function toggle() { dropdown.hidden ? open() : close(); }

  btn?.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.folder-selector')) close();
  });

  // ── Search / Filter ──
  function filterOptions() {
    const q = search.value.toLowerCase();
    const searching = q.length > 0;
    clearBtn.hidden = !searching;
    recentSection.hidden = searching;
    recentDivider.hidden = searching;

    let visible = 0;
    allItems.forEach(opt => {
      const name = (opt.dataset.name || 'All').toLowerCase();
      const match = name.includes(q);
      opt.hidden = !match;
      if (match) visible++;
    });

    // Highlight matching text
    list.querySelectorAll('.folder-dropdown-name').forEach(el => {
      if (searching) {
        const original = el.closest('[data-name]')?.dataset.name || el.textContent;
        el.innerHTML = highlightMatch(original, q);
      } else {
        el.innerHTML = el.textContent;
      }
    });

    empty.hidden = visible > 0;
    allHeader.hidden = visible === 0;

    if (searching) {
      counter.hidden = false;
      counterText.textContent = `${visible} folder${visible !== 1 ? 's' : ''} found`;
    } else {
      counter.hidden = true;
    }
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return `${text.slice(0, idx)}<mark class="folder-dropdown-highlight">${text.slice(idx, idx + query.length)}</mark>${text.slice(idx + query.length)}`;
  }

  search?.addEventListener('input', () => {
    filterOptions();
    highlighted = 0;
    highlightOption();
  });

  clearBtn?.addEventListener('click', () => {
    search.value = '';
    filterOptions();
    highlighted = 0;
    highlightOption();
    search.focus();
  });

  // ── Keyboard Navigation ──
  function highlightOption() {
    const visible = Array.from(list.querySelectorAll('.folder-dropdown-item:not([hidden])'));
    visible.forEach((o, i) => {
      const isActive = i === highlighted;
      o.classList.toggle('is-highlighted', isActive);
    });
    if (visible[highlighted]) visible[highlighted].scrollIntoView({ block: 'nearest' });
  }

  function selectItem(item) {
    const folderId = item.dataset.folder;
    saveRecent(folderId);
    const url = new URL(window.location);
    if (folderId) {
      url.searchParams.set('folderId', folderId);
    } else {
      url.searchParams.delete('folderId');
    }
    window.location.href = url.toString();
  }

  // List click (handles both recent clones and main list)
  list.addEventListener('click', e => {
    const item = e.target.closest('.folder-dropdown-item');
    if (item && !e.target.closest('.folder-dropdown-menu-btn')) {
      selectItem(item);
    }
  });

  // Keyboard on trigger button
  btn?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && dropdown.hidden) { e.preventDefault(); open(); return; }
    if (dropdown.hidden) return;
    const visible = Array.from(list.querySelectorAll('.folder-dropdown-item:not([hidden])'));
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); highlighted = Math.min(highlighted + 1, visible.length - 1); highlightOption(); break;
      case 'ArrowUp': e.preventDefault(); highlighted = Math.max(highlighted - 1, 0); highlightOption(); break;
      case 'Home': e.preventDefault(); highlighted = 0; highlightOption(); break;
      case 'End': e.preventDefault(); highlighted = visible.length - 1; highlightOption(); break;
      case 'Enter': e.preventDefault(); if (visible[highlighted]) selectItem(visible[highlighted]); break;
      case 'Escape': close(); break;
      case 'Tab': close(); break;
    }
  });

  // Keyboard on search input
  search?.addEventListener('keydown', e => {
    const visible = Array.from(list.querySelectorAll('.folder-dropdown-item:not([hidden])'));
    switch (e.key) {
      case 'Escape':
        e.stopPropagation();
        if (search.value.length > 0) {
          search.value = '';
          filterOptions();
          highlighted = 0;
          highlightOption();
        } else { close(); }
        break;
      case 'ArrowDown': e.preventDefault(); highlighted = Math.min(highlighted + 1, visible.length - 1); highlightOption(); break;
      case 'ArrowUp': e.preventDefault(); highlighted = Math.max(highlighted - 1, 0); highlightOption(); break;
      case 'Home': e.preventDefault(); highlighted = 0; highlightOption(); break;
      case 'End': e.preventDefault(); highlighted = visible.length - 1; highlightOption(); break;
      case 'Enter': e.preventDefault(); if (visible[highlighted]) selectItem(visible[highlighted]); break;
      case 'Tab': close(); break;
    }
  });

  // ── Folder Context Menu (⋮) ──
  let contextMenuFolderId = null;

  document.querySelectorAll('.folder-dropdown-menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      contextMenuFolderId = btn.dataset.folderId;
      const menu = document.getElementById('folderContextMenu');
      const rect = btn.getBoundingClientRect();
      menu.style.top = rect.top + 'px';
      menu.style.left = rect.right + 4 + 'px';
      menu.hidden = false;
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.folder-context-menu')) {
      document.getElementById('folderContextMenu').hidden = true;
    }
  });

  document.querySelectorAll('#folderContextMenu .context-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      if (action === 'rename') openFolderRenameModal(contextMenuFolderId, btn.dataset.folderName);
      else if (action === 'color') openFolderColorPicker(contextMenuFolderId);
      else if (action === 'delete') openFolderDeleteConfirm(contextMenuFolderId, btn.dataset.folderName);
      document.getElementById('folderContextMenu').hidden = true;
    });
  });

  // ── Create Folder (from dropdown footer) ──
  createBtn?.addEventListener('click', () => {
    close();
    document.getElementById('folderModal').hidden = false;
    document.getElementById('folderNameInput').value = '';
    document.getElementById('folderNameInput').focus();
  });
})();

// ── Create Folder Modal ──
let selectedFolderColor = 'blue';

document.querySelectorAll('#folderModal .color-swatch').forEach(swatch => {
  swatch.addEventListener('click', () => {
    document.querySelectorAll('#folderModal .color-swatch').forEach(s => s.classList.remove('is-selected'));
    swatch.classList.add('is-selected');
    selectedFolderColor = swatch.dataset.color;
  });
});

document.getElementById('createFolderConfirmBtn')?.addEventListener('click', async () => {
  const name = document.getElementById('folderNameInput').value.trim();
  if (!name) return;
  try {
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color: selectedFolderColor }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.message || 'Failed', 'error'); return; }
    document.getElementById('folderModal').hidden = true;
    showToast('Folder created');
    window.location.reload();
  } catch (err) { showToast('Network error', 'error'); }
});

function closeFolderModal() {
  document.getElementById('folderModal').hidden = true;
}

// ── Rename Folder Modal ──
function openFolderRenameModal(folderId, currentName) {
  const modal = document.getElementById('renameFolderModal');
  const input = document.getElementById('renameFolderInput');
  input.value = currentName;
  modal.dataset.folderId = folderId;
  modal.hidden = false;
  input.focus();
  input.select();
}

document.getElementById('renameFolderConfirmBtn')?.addEventListener('click', async () => {
  const modal = document.getElementById('renameFolderModal');
  const folderId = modal.dataset.folderId;
  const name = document.getElementById('renameFolderInput').value.trim();
  if (!name) return;
  try {
    const res = await fetch(`/api/folders/${folderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.message || 'Failed', 'error'); return; }
    modal.hidden = true;
    showToast('Folder renamed');
    window.location.reload();
  } catch (err) { showToast('Network error', 'error'); }
});

// ── Folder Delete Confirm ──
function openFolderDeleteConfirm(folderId, folderName) {
  const modal = document.getElementById('folderDeleteModal');
  modal.dataset.folderId = folderId;
  document.getElementById('folderDeleteName').textContent = folderName;
  modal.hidden = false;
}

document.getElementById('folderDeleteConfirmBtn')?.addEventListener('click', async () => {
  const modal = document.getElementById('folderDeleteModal');
  const folderId = modal.dataset.folderId;
  try {
    const res = await fetch(`/api/folders/${folderId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) { showToast(data.message || 'Failed', 'error'); return; }
    modal.hidden = true;
    showToast(`Folder deleted (${data.orphanedEntries} entries unlinked)`);
    if (window.location.search.includes(`folderId=${folderId}`)) {
      window.location.href = '/';
    } else {
      window.location.reload();
    }
  } catch (err) { showToast('Network error', 'error'); }
});

// ── Color Picker Modal ──
function openFolderColorPicker(folderId) {
  const modal = document.getElementById('colorPickerModal');
  modal.dataset.folderId = folderId;
  modal.hidden = false;
}

document.querySelectorAll('#colorPickerModal .color-swatch').forEach(swatch => {
  swatch.addEventListener('click', async () => {
    const modal = document.getElementById('colorPickerModal');
    const folderId = modal.dataset.folderId;
    const color = swatch.dataset.color;
    try {
      const res = await fetch(`/api/folders/${folderId}/color`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      });
      if (!res.ok) { showToast('Failed', 'error'); return; }
      modal.hidden = true;
      showToast('Color updated');
      window.location.reload();
    } catch (err) { showToast('Network error', 'error'); }
  });
});
```

#### Folder Modals HTML

Add before `</body>`:

```html
<!-- Create Folder Modal -->
<div class="modal-overlay" id="folderModal" role="dialog" aria-modal="true" hidden>
  <div class="modal-glass" style="max-width: 360px;">
    <div class="modal-header">
      <h3 class="modal-name">New Folder</h3>
      <button class="modal-close" onclick="closeFolderModal()" aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="modal-divider"></div>
    <div class="modal-body">
      <div class="field-group">
        <label for="folderNameInput">Folder Name</label>
        <input type="text" id="folderNameInput" placeholder="e.g. Work, College, Recipes" maxlength="255" autocomplete="off" />
      </div>
      <div class="field-group" style="margin-top: 12px;">
        <label>Color</label>
        <div class="color-picker" id="colorPicker" style="display: flex; gap: 8px; margin-top: 6px;">
          <button class="color-swatch is-selected" data-color="blue" style="width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;background:var(--folder-blue)"></button>
          <button class="color-swatch" data-color="purple" style="width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;background:var(--folder-purple)"></button>
          <button class="color-swatch" data-color="green" style="width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;background:var(--folder-green)"></button>
          <button class="color-swatch" data-color="red" style="width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;background:var(--folder-red)"></button>
          <button class="color-swatch" data-color="orange" style="width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;background:var(--folder-orange)"></button>
          <button class="color-swatch" data-color="pink" style="width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;background:var(--folder-pink)"></button>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost" onclick="closeFolderModal()">Cancel</button>
      <button class="btn-primary" id="createFolderConfirmBtn">Create</button>
    </div>
  </div>
</div>

<!-- Rename Folder Modal -->
<div class="modal-overlay" id="renameFolderModal" role="dialog" aria-modal="true" hidden>
  <div class="modal-glass" style="max-width: 360px;">
    <div class="modal-header">
      <h3 class="modal-name">Rename Folder</h3>
      <button class="modal-close" onclick="document.getElementById('renameFolderModal').hidden=true" aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="modal-divider"></div>
    <div class="modal-body">
      <div class="field-group">
        <label for="renameFolderInput">Folder Name</label>
        <input type="text" id="renameFolderInput" maxlength="255" autocomplete="off" />
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost" onclick="document.getElementById('renameFolderModal').hidden=true">Cancel</button>
      <button class="btn-primary" id="renameFolderConfirmBtn">Save</button>
    </div>
  </div>
</div>

<!-- Delete Folder Confirm -->
<div class="confirm-overlay" id="folderDeleteModal" role="dialog" aria-modal="true" hidden>
  <div class="confirm-modal">
    <div class="confirm-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>
    <h2 class="confirm-title">Delete "<span id="folderDeleteName"></span>"?</h2>
    <p class="confirm-desc">Entries in this folder will be unlinked but not deleted. They'll remain in "All Entries".</p>
    <div class="confirm-btns">
      <button class="btn-ghost" onclick="document.getElementById('folderDeleteModal').hidden=true">Cancel</button>
      <button class="btn-primary btn-confirm-delete" id="folderDeleteConfirmBtn"><span>Delete</span></button>
    </div>
  </div>
</div>

<!-- Color Picker Modal -->
<div class="modal-overlay" id="colorPickerModal" role="dialog" aria-modal="true" hidden>
  <div class="modal-glass" style="max-width: 280px;">
    <div class="modal-header">
      <h3 class="modal-name">Change Color</h3>
      <button class="modal-close" onclick="document.getElementById('colorPickerModal').hidden=true" aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="modal-divider"></div>
    <div class="modal-body" style="display:flex;gap:10px;justify-content:center;padding:16px;">
      <button class="color-swatch" data-color="blue" style="width:32px;height:32px;border-radius:50%;border:2px solid transparent;cursor:pointer;background:var(--folder-blue)"></button>
      <button class="color-swatch" data-color="purple" style="width:32px;height:32px;border-radius:50%;border:2px solid transparent;cursor:pointer;background:var(--folder-purple)"></button>
      <button class="color-swatch" data-color="green" style="width:32px;height:32px;border-radius:50%;border:2px solid transparent;cursor:pointer;background:var(--folder-green)"></button>
      <button class="color-swatch" data-color="red" style="width:32px;height:32px;border-radius:50%;border:2px solid transparent;cursor:pointer;background:var(--folder-red)"></button>
      <button class="color-swatch" data-color="orange" style="width:32px;height:32px;border-radius:50%;border:2px solid transparent;cursor:pointer;background:var(--folder-orange)"></button>
      <button class="color-swatch" data-color="pink" style="width:32px;height:32px;border-radius:50%;border:2px solid transparent;cursor:pointer;background:var(--folder-pink)"></button>
    </div>
  </div>
</div>
```

#### Breadcrumb Update

```html
<nav class="breadcrumb" aria-label="Breadcrumb">
  <a href="/explore#public-notes">
    <svg ...>...</svg>
    Explore
  </a>
  <span class="sep">/</span>
  <a href="/" class="current">Dashboard</a>
  <% if (activeFolderName) { %>
    <span class="sep">/</span>
    <span class="current">
      <span class="folder-dot" style="background: var(--folder-<%= activeFolderColor || 'blue' %>)"></span>
      <%= activeFolderName %>
    </span>
  <% } %>
</nav>
```

#### Card Folder Badge

After the `.card-type-strip` div in each card, add:

```html
<% if (person.folderId && person.folderName) { %>
<span class="card-folder-badge" style="--badge-color: var(--folder-<%= person.folderColor || 'blue' %>)">
  <span class="badge-dot" style="background: var(--badge-color)"></span>
  <%= person.folderName %>
</span>
<% } %>
```

**CSS (tiny, subtle):**

```css
.card-folder-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6rem;
  font-weight: 500;
  color: var(--badge-color);
  margin-top: 2px;
  opacity: 0.8;
}

.card-folder-badge .badge-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}
```

No pill background. No padding. Just a colored dot + name. Like GitHub labels at their most minimal.

#### Update `buildCard()` Function

```javascript
// After building typeStrip
if (data.folderId && data.folderName) {
  const badge = document.createElement('span');
  badge.className = 'card-folder-badge';
  badge.style.setProperty('--badge-color', `var(--folder-${data.folderColor || 'blue'})`);
  badge.innerHTML = `<span class="badge-dot" style="background:var(--badge-color)"></span>${escapeHTML(data.folderName)}`;
  typeStrip.after(badge);
}
```

#### Update `shouldShowInCurrentFilter()`

```javascript
function shouldShowInCurrentFilter(data) {
  // ...existing logic...
  const folderMatch = !activeFolderId || data.folderId === activeFolderId;
  return visibilityMatch && folderMatch;
}
```

#### Update `loadMore()`

```javascript
if (activeFolderId) params.set('folderId', activeFolderId);
```

#### Empty Folder State

Update the empty state HTML to handle folder-specific empty state:

```html
<div class="empty-state" id="emptyState" style="<%= (typeof data !== 'undefined' && data.length > 0) ? 'display: none;' : '' %>">
  <% if (activeFolderId && activeFolderName) { %>
    <!-- Empty folder state -->
    <div class="empty-glyph" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    </div>
    <h2 class="empty-title"><%= activeFolderName %></h2>
    <p class="empty-desc">No notes yet.</p>
    <div class="empty-action-wrap">
      <button class="btn-primary" type="button" onclick="window.location.href='/add?folderId=<%= activeFolderId %>'">
        <i class="ti ti-plus" aria-hidden="true"></i> Create Note
      </button>
    </div>
  <% } else { %>
    <!-- ...existing empty state... -->
  <% } %>
</div>
```

### 1.5 Frontend: Add/Edit Form (`views/updateInformation.ejs`)

**No native `<select>`.** Custom searchable combobox — a mini command palette, not a form control. Behaves like Notion / VS Code / Linear. Users should feel the same muscle memory across all three.

Shows **9 visible rows** before scrolling. Thin custom scrollbar. No virtualization needed (flat folders, 100-200 max).

#### Layout

```
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

```html
<div class="field-group field-folder">
  <label>
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
    Folder
  </label>

  <!-- Hidden input for form submission -->
  <input type="hidden" id="folderIdInput" name="folderId" value="<%= typeof activeFolderId !== 'undefined' ? activeFolderId : '' %>">

  <!-- Custom combobox trigger -->
  <div class="folder-combobox" id="folderCombobox" tabindex="0" role="combobox" aria-expanded="false" aria-haspopup="listbox" aria-label="Select folder">
    <div class="folder-combobox-trigger" id="comboboxTrigger">
      <% if (typeof activeFolderName !== 'undefined' && activeFolderName) { %>
        <span class="folder-combobox-selected">
          <span class="folder-dot" style="background:<%= activeFolderColor || 'var(--accent)' %>"></span>
          <span class="folder-combobox-selected-name"><%= activeFolderName %></span>
        </span>
      <% } else { %>
        <span class="folder-combobox-placeholder">No folder</span>
      <% } %>
      <svg class="folder-combobox-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>

    <!-- Dropdown panel -->
    <div class="folder-combobox-dropdown" id="comboboxDropdown" hidden>
      <!-- Sticky search bar -->
      <div class="folder-combobox-search-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" class="folder-combobox-search" id="comboboxSearch" placeholder="Search folders..." autocomplete="off" aria-label="Search folders" />
        <button type="button" class="folder-combobox-clear" id="comboboxClear" hidden aria-label="Clear search">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <!-- Search result counter (shown only when searching) -->
      <div class="folder-combobox-counter" id="comboboxCounter" hidden>
        <span id="counterText">0 folders found</span>
      </div>

      <!-- Loading skeleton (shown while folders load) -->
      <div class="folder-combobox-skeleton" id="comboboxSkeleton" hidden>
        <div class="skeleton-row"><div class="skeleton-bar"></div><div class="skeleton-bar short"></div></div>
        <div class="skeleton-row"><div class="skeleton-bar"></div><div class="skeleton-bar short"></div></div>
        <div class="skeleton-row"><div class="skeleton-bar"></div><div class="skeleton-bar short"></div></div>
        <div class="skeleton-row"><div class="skeleton-bar"></div><div class="skeleton-bar short"></div></div>
        <div class="skeleton-row"><div class="skeleton-bar"></div><div class="skeleton-bar short"></div></div>
      </div>

      <!-- Scrollable list area -->
      <div class="folder-combobox-list" id="comboboxList" role="listbox" aria-label="Folders">

        <!-- Recently used section (hidden when searching) -->
        <div class="folder-combobox-section" id="recentSection" hidden>
          <div class="folder-combobox-section-header">Recently Used</div>
        </div>

        <!-- Divider (shown when recent section is visible) -->
        <div class="folder-combobox-divider" id="recentDivider" hidden></div>

        <!-- "No Folder" option (in all folders section) -->
        <div class="folder-combobox-section-header" id="allFoldersHeader">All Folders</div>
        <div class="folder-combobox-option<%= (typeof activeFolderId === 'undefined' || !activeFolderId) ? ' is-selected' : '' %>" data-value="" role="option" aria-selected="<%= (typeof activeFolderId === 'undefined' || !activeFolderId) ? 'true' : 'false' %>">
          <span class="folder-combobox-option-left">
            <span class="folder-dot" style="background: var(--text-secondary)"></span>
            <span class="folder-combobox-option-name">No folder</span>
          </span>
          <svg class="folder-combobox-check" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        <!-- All folder rows (EJS loop) -->
        <% if (typeof folders !== 'undefined' && folders.length > 0) { %>
          <% folders.forEach(folder => { %>
            <div class="folder-combobox-option<%= (typeof activeFolderId !== 'undefined' && activeFolderId === folder._id.toString()) ? ' is-selected' : '' %>"
                 data-value="<%= folder._id %>"
                 data-name="<%= folder.name %>"
                 data-color="<%= folder.color || 'var(--accent)' %>"
                 data-count="<%= folder.entryCount || 0 %>"
                 role="option"
                 aria-selected="<%= (typeof activeFolderId !== 'undefined' && activeFolderId === folder._id.toString()) ? 'true' : 'false' %>"
                 title="<%= folder.name %>">
              <span class="folder-combobox-option-left">
                <span class="folder-dot" style="background:<%= folder.color || 'var(--accent)' %>"></span>
                <span class="folder-combobox-option-name"><%= folder.name %></span>
              </span>
              <span class="folder-combobox-option-right">
                <span class="folder-combobox-count"><%= folder.entryCount || 0 %></span>
                <svg class="folder-combobox-check" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </span>
            </div>
          <% }) %>
        <% } %>

        <!-- Zero folders empty state -->
        <% if (typeof folders === 'undefined' || folders.length === 0) { %>
          <div class="folder-combobox-zero" id="comboboxZero">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <span>No folders yet</span>
            <span class="folder-combobox-zero-hint">Create your first folder</span>
          </div>
        <% } %>
      </div>

      <!-- Empty search state (shown when search matches nothing) -->
      <div class="folder-combobox-empty" id="comboboxEmpty" hidden>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span id="emptyText">No folders found</span>
        <button type="button" class="folder-combobox-create-suggestion" id="comboboxCreateSuggestion" hidden>
          Create "<span id="suggestionName"></span>"
        </button>
      </div>

      <!-- Duplicate name warning (shown when typing a name that exists) -->
      <div class="folder-combobox-duplicate" id="comboboxDuplicate" hidden>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span id="duplicateText">Already exists</span>
      </div>

      <!-- Create folder (sticky bottom) -->
      <div class="folder-combobox-footer">
        <button type="button" class="folder-combobox-create" id="comboboxCreateBtn">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span id="createBtnText">Create Folder</span>
        </button>
      </div>
    </div>
  </div>
</div>
```

#### Combobox JavaScript

Add to the `<script>` section at the bottom of `updateInformation.ejs`:

```javascript
(() => {
  const trigger = document.getElementById('comboboxTrigger');
  const dropdown = document.getElementById('comboboxDropdown');
  const search = document.getElementById('comboboxSearch');
  const clearBtn = document.getElementById('comboboxClear');
  const counter = document.getElementById('comboboxCounter');
  const counterText = document.getElementById('counterText');
  const list = document.getElementById('comboboxList');
  const empty = document.getElementById('comboboxEmpty');
  const emptyText = document.getElementById('emptyText');
  const createSuggestion = document.getElementById('comboboxCreateSuggestion');
  const suggestionName = document.getElementById('suggestionName');
  const duplicate = document.getElementById('comboboxDuplicate');
  const duplicateText = document.getElementById('duplicateText');
  const hidden = document.getElementById('folderIdInput');
  const createBtn = document.getElementById('comboboxCreateBtn');
  const createBtnText = document.getElementById('createBtnText');
  const combobox = document.getElementById('folderCombobox');
  const recentSection = document.getElementById('recentSection');
  const recentDivider = document.getElementById('recentDivider');
  const allFoldersHeader = document.getElementById('allFoldersHeader');
  const skeleton = document.getElementById('comboboxSkeleton');
  const allOptions = list.querySelectorAll('.folder-combobox-option[data-value]');
  let highlighted = -1;
  let savedScrollTop = 0;
  const RECENT_KEY = 'shareinfo_recent_folders';
  const MAX_RECENT = 5;

  // ── Recently Used ──
  function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
    catch { return []; }
  }

  function saveRecent(folderId) {
    if (!folderId) return;
    let recent = getRecent().filter(id => id !== folderId);
    recent.unshift(folderId);
    if (recent.length > MAX_RECENT) recent = recent.slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  }

  function renderRecent() {
    const recent = getRecent();
    if (recent.length === 0) {
      recentSection.hidden = true;
      recentDivider.hidden = true;
      return;
    }
    recentSection.hidden = false;
    recentDivider.hidden = false;
    // Clear existing recent options (keep header)
    recentSection.querySelectorAll('.folder-combobox-option').forEach(o => o.remove());
    recent.forEach(id => {
      const match = list.querySelector(`.folder-combobox-option[data-value="${id}"]`);
      if (match) recentSection.appendChild(match.cloneNode(true));
    });
  }

  // ── Open / Close ──
  function open() {
    dropdown.hidden = false;
    combobox.setAttribute('aria-expanded', 'true');
    search.value = '';
    clearBtn.hidden = true;
    counter.hidden = true;
    duplicate.hidden = true;
    renderRecent();
    filterOptions();
    // Restore scroll position
    list.scrollTop = savedScrollTop;
    // Highlight current selection, scroll it into view
    highlighted = Array.from(list.querySelectorAll('.folder-combobox-option:not([hidden])'))
      .findIndex(o => o.classList.contains('is-selected'));
    if (highlighted < 0) highlighted = 0;
    highlightOption();
    search.focus();
  }

  function close() {
    savedScrollTop = list.scrollTop;
    dropdown.hidden = true;
    combobox.setAttribute('aria-expanded', 'false');
    combobox.focus();
  }

  function toggle() { dropdown.hidden ? open() : close(); }

  // ── Search / Filter ──
  function filterOptions() {
    const q = search.value.toLowerCase();
    const searching = q.length > 0;

    // Show/hide clear button
    clearBtn.hidden = !searching;

    // Hide recent section when searching
    recentSection.hidden = searching;
    recentDivider.hidden = searching;

    // Filter options
    let visible = 0;
    allOptions.forEach(opt => {
      const name = (opt.dataset.name || 'No folder').toLowerCase();
      const match = name.includes(q);
      opt.hidden = !match;
      if (match) visible++;
    });

    // Highlight matching text in visible options
    list.querySelectorAll('.folder-combobox-option-name').forEach(el => {
      if (searching) {
        const original = el.closest('[data-name]')?.dataset.name || el.textContent;
        el.innerHTML = highlightMatch(original, q);
      } else {
        el.innerHTML = el.textContent;
      }
    });

    // Show/hide empty state
    empty.hidden = visible > 0;
    allFoldersHeader.hidden = visible === 0;

    // Show "Create [query]" suggestion
    const exactMatch = Array.from(allOptions).some(o => (o.dataset.name || '').toLowerCase() === q);
    if (searching && q.length > 0 && !exactMatch) {
      createSuggestion.hidden = false;
      suggestionName.textContent = search.value;
      emptyText.textContent = 'No folders found';
      // Update create button text
      createBtnText.textContent = `Create "${search.value}"`;
      duplicate.hidden = true;
    } else {
      createSuggestion.hidden = true;
      createBtnText.textContent = 'Create Folder';
      // Check for duplicate name (exact match exists)
      if (searching && exactMatch) {
        duplicate.hidden = false;
        duplicateText.textContent = `"${search.value}" already exists`;
      } else {
        duplicate.hidden = true;
      }
    }

    // Update counter
    if (searching) {
      counter.hidden = false;
      counterText.textContent = `${visible} folder${visible !== 1 ? 's' : ''} found`;
    } else {
      counter.hidden = true;
    }
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);
    return `${before}<mark class="folder-combobox-highlight">${match}</mark>${after}`;
  }

  // ── Keyboard Navigation ──
  function highlightOption() {
    const visible = Array.from(list.querySelectorAll('.folder-combobox-option:not([hidden])'));
    visible.forEach((o, i) => {
      const isActive = i === highlighted;
      o.classList.toggle('is-highlighted', isActive);
      o.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    if (visible[highlighted]) visible[highlighted].scrollIntoView({ block: 'nearest' });
  }

  function selectOption(opt) {
    const val = opt.dataset.value || '';
    const name = opt.dataset.name || '';
    const color = opt.dataset.color || 'var(--text-secondary)';
    hidden.value = val;

    // Update all option selection states (both recent clones and main list)
    list.querySelectorAll('.folder-combobox-option').forEach(o => {
      o.classList.remove('is-selected');
      o.setAttribute('aria-selected', 'false');
    });
    list.querySelectorAll(`.folder-combobox-option[data-value="${val}"]`).forEach(o => {
      o.classList.add('is-selected');
      o.setAttribute('aria-selected', 'true');
    });

    if (val) {
      saveRecent(val);
      trigger.innerHTML = `
        <span class="folder-combobox-selected">
          <span class="folder-dot" style="background:${color}"></span>
          <span class="folder-combobox-selected-name">${name}</span>
        </span>
        <svg class="folder-combobox-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>`;
    } else {
      trigger.innerHTML = `
        <span class="folder-combobox-placeholder">No folder</span>
        <svg class="folder-combobox-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>`;
    }
    close();
  }

  // ── Event Listeners ──

  trigger.addEventListener('click', toggle);

  // List click (handles both recent clones and main list)
  list.addEventListener('click', e => {
    const opt = e.target.closest('.folder-combobox-option');
    if (opt) {
      const val = opt.dataset.value;
      const mainOpt = val ? list.querySelector(`.folder-combobox-option[data-value="${val}"]`) : null;
      selectOption(mainOpt || opt);
    }
  });

  // Search input
  search.addEventListener('input', () => {
    filterOptions();
    highlighted = 0;
    highlightOption();
  });

  // Clear button
  clearBtn.addEventListener('click', () => {
    search.value = '';
    filterOptions();
    highlighted = 0;
    highlightOption();
    search.focus();
  });

  // Keyboard on combobox trigger
  combobox.addEventListener('keydown', e => {
    if (e.key === 'Enter' && dropdown.hidden) { e.preventDefault(); open(); return; }
    if (dropdown.hidden) return;
    const visible = Array.from(list.querySelectorAll('.folder-combobox-option:not([hidden])'));
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); highlighted = Math.min(highlighted + 1, visible.length - 1); highlightOption(); break;
      case 'ArrowUp': e.preventDefault(); highlighted = Math.max(highlighted - 1, 0); highlightOption(); break;
      case 'Home': e.preventDefault(); highlighted = 0; highlightOption(); break;
      case 'End': e.preventDefault(); highlighted = visible.length - 1; highlightOption(); break;
      case 'Enter': e.preventDefault(); if (visible[highlighted]) selectOption(visible[highlighted]); break;
      case 'Escape': close(); break;
      case 'Tab': close(); break;
    }
  });

  // Keyboard on search input
  search.addEventListener('keydown', e => {
    const visible = Array.from(list.querySelectorAll('.folder-combobox-option:not([hidden])'));
    switch (e.key) {
      case 'Escape':
        e.stopPropagation();
        if (search.value.length > 0) {
          search.value = '';
          filterOptions();
          highlighted = 0;
          highlightOption();
        } else {
          close();
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        highlighted = Math.min(highlighted + 1, visible.length - 1);
        highlightOption();
        break;
      case 'ArrowUp':
        e.preventDefault();
        highlighted = Math.max(highlighted - 1, 0);
        highlightOption();
        break;
      case 'Home':
        e.preventDefault();
        highlighted = 0;
        highlightOption();
        break;
      case 'End':
        e.preventDefault();
        highlighted = visible.length - 1;
        highlightOption();
        break;
      case 'Enter':
        e.preventDefault();
        if (visible[highlighted]) selectOption(visible[highlighted]);
        break;
      case 'Tab':
        close();
        break;
    }
  });

  // "Create Folder" in footer (or "Create [query]" when searching)
  createBtn.addEventListener('click', () => {
    const query = search.value.trim();
    close();
    openFolderModal('create', query);
  });

  // "Create [query]" suggestion in empty state
  createSuggestion.addEventListener('click', () => {
    const query = search.value.trim();
    close();
    openFolderModal('create', query);
  });

  // Click outside closes
  document.addEventListener('click', e => {
    if (!combobox.contains(e.target)) close();
  });
})();
```

#### Combobox CSS

Add to `views/updateInformation.ejs` `<style>`:

```css
/* -- Folder Combobox -- */
.field-folder { position: relative; }

.folder-combobox {
  position: relative;
  width: 100%;
  outline: none;
}

.folder-combobox-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 14px;
  background: rgba(15, 25, 45, 0.6);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.folder-combobox-trigger:hover {
  border-color: rgba(139, 92, 246, 0.3);
}

.folder-combobox:focus .folder-combobox-trigger {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15);
}

.folder-combobox-selected {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.folder-combobox-selected-name,
.folder-combobox-option-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-combobox-placeholder {
  color: var(--text-secondary);
}

.folder-combobox-chevron {
  color: var(--text-secondary);
  transition: transform 0.2s;
  flex-shrink: 0;
}

.folder-combobox[aria-expanded="true"] .folder-combobox-chevron {
  transform: rotate(180deg);
}

.folder-combobox-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  width: 100%;
  background: rgba(15, 25, 45, 0.97);
  border: 1px solid var(--border);
  border-radius: 10px;
  backdrop-filter: blur(20px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  z-index: 50;
  animation: comboFadeIn 0.12s ease;
  display: flex;
  flex-direction: column;
}

@keyframes comboFadeIn {
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* -- Sticky search bar -- */
.folder-combobox-search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.folder-combobox-search-wrap svg {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.folder-combobox-search {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 0.85rem;
}

.folder-combobox-search::placeholder {
  color: var(--text-secondary);
}

.folder-combobox-clear {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, background 0.15s;
}

.folder-combobox-clear:hover {
  color: var(--text-primary);
  background: rgba(255, 255, 255, 0.08);
}

/* -- Search counter -- */
.folder-combobox-counter {
  padding: 4px 12px;
  font-size: 0.7rem;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

/* -- Loading skeleton -- */
.folder-combobox-skeleton {
  padding: 8px;
}

.skeleton-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
}

.skeleton-bar {
  height: 12px;
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 200% 100%;
  animation: skeletonShimmer 1.5s infinite;
  flex: 1;
}

.skeleton-bar.short {
  flex: 0 0 30px;
}

@keyframes skeletonShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* -- Scrollable list (only this area scrolls) -- */
.folder-combobox-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.15) transparent;
  max-height: calc(9 * 36px);
}

.folder-combobox-list::-webkit-scrollbar { width: 5px; }
.folder-combobox-list::-webkit-scrollbar-track { background: transparent; }
.folder-combobox-list::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
  border-radius: 3px;
}

/* -- Section headers -- */
.folder-combobox-section-header {
  padding: 6px 10px 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* -- Divider -- */
.folder-combobox-divider {
  height: 1px;
  background: var(--border);
  margin: 4px 8px;
}

/* -- Option rows -- */
.folder-combobox-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.folder-combobox-option:hover,
.folder-combobox-option.is-highlighted {
  background: rgba(139, 92, 246, 0.12);
}

.folder-combobox-option.is-selected .folder-combobox-option-name {
  color: var(--accent);
}

.folder-combobox-option-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.folder-combobox-option-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.folder-combobox-count {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.folder-combobox-check {
  display: none;
  color: var(--accent);
}

.folder-combobox-option.is-selected .folder-combobox-check {
  display: block;
}

/* -- Search match highlight -- */
.folder-combobox-highlight {
  background: rgba(139, 92, 246, 0.25);
  color: var(--text-primary);
  border-radius: 2px;
  padding: 0 1px;
}

/* -- Empty search state -- */
.folder-combobox-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 16px;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.folder-combobox-create-suggestion {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 14px;
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.folder-combobox-create-suggestion:hover {
  background: rgba(139, 92, 246, 0.1);
  border-color: var(--accent);
}

/* -- Duplicate warning -- */
.folder-combobox-duplicate {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 0.75rem;
  color: var(--warning, #f59e0b);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

/* -- Zero folders state -- */
.folder-combobox-zero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 20px 16px;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.folder-combobox-zero-hint {
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* -- Sticky footer -- */
.folder-combobox-footer {
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.folder-combobox-create {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  color: var(--accent);
  font-family: var(--font-body);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
}

.folder-combobox-create:hover {
  background: rgba(139, 92, 246, 0.1);
}
```

#### Mobile (screens <=648px)

On mobile, the combobox opens as a **bottom sheet** with search auto-focused and software keyboard opens automatically. Swipe down closes.

```css
@media (max-width: 648px) {
  .folder-combobox-dropdown {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100%;
    border-radius: 16px 16px 0 0;
    max-height: 70vh;
    animation: sheetSlideUp 0.25s ease;
  }

  @keyframes sheetSlideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
}
```

#### Form submission

Hidden `<input id="folderIdInput" name="folderId">` is already in the form. Its value updates when a folder is selected. No additional JS needed.

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

Add once at the bottom of the page:

```html
<div class="card-context-menu" id="cardContextMenu" hidden>
  <button class="context-item" data-action="copy">📋 Copy</button>
  <button class="context-item" data-action="favorite">⭐ Favorite</button>
  <div class="context-divider"></div>
  <div class="context-submenu" id="moveSubmenu">
    <button class="context-item context-submenu-trigger">📁 Move to Folder ▸</button>
    <div class="context-submenu-panel" id="moveFolderPanel">
      <!-- Populated dynamically -->
    </div>
  </div>
  <div class="context-divider"></div>
  <button class="context-item context-danger" data-action="delete">🗑️ Delete</button>
</div>
```

### 2.4 Card Context Menu CSS

```css
.card-context-menu {
  position: fixed;
  z-index: 200;
  background: rgba(15, 25, 45, 0.95);
  border: 1px solid var(--border);
  border-radius: 8px;
  backdrop-filter: blur(16px);
  padding: 4px;
  min-width: 180px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.context-submenu {
  position: relative;
}

.context-submenu-panel {
  display: none;
  position: absolute;
  left: 100%;
  top: -4px;
  background: rgba(15, 25, 45, 0.95);
  border: 1px solid var(--border);
  border-radius: 8px;
  backdrop-filter: blur(16px);
  padding: 4px;
  min-width: 160px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.context-submenu:hover .context-submenu-panel {
  display: block;
}
```

### 2.5 Card Context Menu JavaScript

```javascript
// ── Card Context Menu ──
let activeCardId = null;
let userFolders = [];

async function loadFoldersForMove() {
  try {
    const res = await fetch('/api/folders');
    const data = await res.json();
    userFolders = data.folders || [];
  } catch (err) {}
}

document.addEventListener('click', (e) => {
  const menuBtn = e.target.closest('.card-menu-icon');
  if (menuBtn) {
    e.preventDefault();
    e.stopPropagation();
    activeCardId = menuBtn.dataset.cardId;
    showCardContextMenu(menuBtn);
    return;
  }

  const contextItem = e.target.closest('.context-item');
  if (contextItem && !contextItem.classList.contains('context-submenu-trigger')) {
    handleCardContextAction(contextItem.dataset.action, contextItem.dataset.folderId);
    hideCardContextMenu();
    return;
  }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.card-context-menu')) hideCardContextMenu();
});

function showCardContextMenu(anchor) {
  const menu = document.getElementById('cardContextMenu');
  const panel = document.getElementById('moveFolderPanel');
  if (panel) {
    panel.innerHTML = `
      <button class="context-item" data-folder-id="">No folder</button>
      ${userFolders.map(f => `
        <button class="context-item" data-folder-id="${f._id}">
          <span class="folder-dot" style="background:var(--folder-${f.color})"></span>
          ${escapeHTML(f.name)}
        </button>
      `).join('')}
      <div class="context-divider"></div>
      <button class="context-item" data-action="new-folder">📁 New Folder</button>
    `;
  }
  const rect = anchor.getBoundingClientRect();
  menu.style.top = rect.bottom + 4 + 'px';
  menu.style.left = Math.min(rect.left, window.innerWidth - 200) + 'px';
  menu.hidden = false;
}

function hideCardContextMenu() {
  document.getElementById('cardContextMenu').hidden = true;
}

async function handleCardContextAction(action, folderId) {
  if (action === 'copy') { /* existing */ }
  else if (action === 'favorite') { /* existing */ }
  else if (action === 'delete') { /* existing */ }
  else if (folderId !== undefined) {
    await moveEntryToFolder(activeCardId, folderId);
  }
}

async function moveEntryToFolder(entryId, folderId) {
  try {
    const res = await fetch(`/api/entries/${entryId}/move-folder`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId: folderId || null }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.message || 'Failed', 'error'); return; }

    const card = document.getElementById(entryId);
    if (card) {
      card.dataset.folderId = data.entry.folderId || '';
      let badge = card.querySelector('.card-folder-badge');
      if (data.entry.folderId && data.entry.folderName) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'card-folder-badge';
          card.querySelector('.card-type-strip').after(badge);
        }
        badge.style.setProperty('--badge-color', `var(--folder-${data.entry.folderColor || 'blue'})`);
        badge.innerHTML = `<span class="badge-dot" style="background:var(--badge-color)"></span>${data.entry.folderName}`;
      } else if (badge) {
        badge.remove();
      }
    }
    showToast(data.entry.folderId ? `Moved to ${data.entry.folderName}` : 'Removed from folder');
  } catch (err) { showToast('Network error', 'error'); }
}

loadFoldersForMove();
```

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
│  Cards ──→ tiny ● badge + ⋮ menu → Move to Folder   │
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
