# 🔷 **Soft Border Card Specification (for implementation)**

### 1. Card Visual Style

```
background: #FFFFFF
border: 1px solid #E5E7EB
border-radius: 8px
padding: 16px 20px
no box-shadow
```

### 2. When to use Cards

Use a Card for every *logical section*:

- Search Area
- Filter Area
- Table List
- Metadata Info
- Schema Table
- Lineage Graph Container
- Field Drawer Contents

**Everything except the sidebar and global page background should sit inside cards.**

------

## 3. Card Header Layout

```
display: flex;
justify-content: space-between;
align-items: center;
margin-bottom: 12px;
```

Header style:

- Title: 16px / weight 600 / `#1F2937`
- Secondary text: 13–14px / `#6B7280`

------

## 4. Card Spacing Rules

```
Top padding: 16px
Bottom padding: 16–20px
Internal spacing: 12px
Section separators: 8px or 12px
```

Spacing must follow **8px grid**.

------

## 5. How cards affect the overall layout

### ❌ Before

(search and table are “floating” on the white page, no depth)

### ✔ After

(search card + table card = clear visual grouping)

```
Page
│
├─ [Card] Search & Filters
│
└─ [Card] Table List
```

This provides:

- cleaner hierarchy
- natural readability
- consistent structure across pages

------

# 🔷 Updated Page Layout Blueprint (English)

Use this exact structure for all main list/detail pages:

```
<PageLayout>
  <PageHeader>
    <Title>Data Tables</Title>
    <Actions>[New][Refresh]</Actions>
  </PageHeader>

  <Card>
    <SearchBar />
    <FilterBar />
  </Card>

  <Card>
    <DataTable />
  </Card>
</PageLayout>
```

------

# 🧩 Critical UI Elements to Update

Claude Code must update:

### ✔ Search bar placement → moved into a card

### ✔ Table list → wrapped in a card

### ✔ Badge component → modern pill style

### ✔ Components must inherit theme variables

### ✔ Use consistent padding & spacing across cards

------

# 🎯 Pill Badge Style (to replace the “unknown” tag)

```
background: rgba(107,114,128,0.10)
color: #374151
font-size: 12px
border-radius: 6px
padding: 2px 6px
```

OR for colored ones:

```
background: rgba(37, 99, 235, 0.08)
color: #2563EB
```

# 📦 **Claude Code Instruction Prompt (copy-paste)**

```
Please refactor the UI to adopt the “Soft Border Minimalist Card” design
system. Use the following rules:

1. Every logical content area must be wrapped in a card:
   - search area
   - filter area
   - table list
   - metadata overview
   - schema table
   - lineage container

2. Card style:
   - background: #FFFFFF
   - border: 1px solid #E5E7EB
   - border-radius: 8px
   - padding: 16px 20px
   - no box-shadow

3. Page layout:
   - PageHeader (title + actions)
   - Card (search/filter)
   - Card (table list)

4. Replace existing badges with pill-style tags (soft background).

5. Ensure consistent spacing using an 8px grid.

Do not change any business logic or API calls.
Apply this style system across all list and detail pages.
```

