# MetaV2 Project Context Document

> Quick background for LLMs to understand the MetaV2 codebase  
> Last updated: 2025-12-03

---

## Project Basics

**Name**: MetaV2 (Metadata Management System)  
**Path**: `/Users/shenshunan/projects/MetaV2`  
**Type**: Full-stack app (FastAPI + React/Vite)  
**Back-end entry**: `backend/app.py` (FastAPI with CORS enabled)  
**Front-end entry**: `frontend/src/main.jsx` / `frontend/src/App.jsx`

**Core Capabilities**
- Cross-source metadata management (Oracle/Elasticsearch/MongoDB).
- Import/export metadata via Excel/JSON.
- Table- and column-level lineage modeling and visualization.
- Data source CRUD, table/column CRUD, lineage CRUD/query, config management.

**Tech Stack**
- Backend: Python 3.12, FastAPI, SQLAlchemy, Pydantic v2, NetworkX, Uvicorn.
- Storage: SQLite (`metadata.db` by default; configurable via settings).
- Connectors: cx_Oracle, elasticsearch-py, pymongo.
- Frontend: React 18, Vite, Ant Design 5, React Router 6, ECharts, Axios.

---

## Architecture Overview

```
Data Sources (Oracle / ES / Mongo)
        ↓
ConnectionFactory (shared connectors)
        ↓
MetadataExtractor (per-source metadata pull)
        ↓
MetadataImportService (upsert & prune into SQLite)
        ↓
FastAPI services/routers (CRUD, lineage, upload, config)
        ↓
React UI (tables/data sources/import/lineage/settings)
```

### Why SQLite by default?
- Zero-setup for development; file lives at repo root (`metadata.db`).
- Can be swapped by updating `backend/config/settings.py:metadata_db_url`.

### Lineage Model Highlights
- Table lineage supports *multiple* upstream tables per target via `LineageRelation.source_table_ids` (JSON).
- Column lineage links source/target columns under a table lineage (`ColumnLineageRelation`).
- Graph/DFS utilities produce `nodes`/`edges` payloads for visualization and upstream/downstream traversal.

---

## Directory Structure

```
MetaV2/
├── backend/
│   ├── api/                  # FastAPI routers (data sources, tables, columns, lineage, upload, config)
│   ├── core/                 # Connection factory & metadata extraction
│   ├── services/             # Business logic (CRUD, lineage graph, import)
│   ├── models/               # SQLAlchemy models + Pydantic schemas
│   ├── config/               # Settings (Pydantic BaseSettings)
│   ├── utils/                # Helpers/logging
│   ├── app.py                # FastAPI entrypoint
│   ├── app.db / metadata.db  # Default SQLite databases
│   └── reset_database.py     # Utility to reset DB
│
├── frontend/
│   ├── src/
│   │   ├── pages/            # Data sources, tables, lineage, import, settings
│   │   ├── components/       # Shared UI components
│   │   ├── services/         # Axios API client
│   │   ├── App.jsx           # Layout & routing
│   │   └── main.jsx          # React entry
│   ├── public/               # Static assets
│   ├── package.json          # Frontend deps/scripts
│   └── vite.config.js        # Vite config
│
├── API_DOCUMENTATION.md      # HTTP endpoint reference
├── README.md                 # Basic overview & setup
├── sample_new_tables.json    # Sample import payload
├── metadata_example.json     # Example metadata
├── generate_sample_excel.py  # Utility for Excel sample
└── tests/                    # Backend pytest cases
```

---

## Core Backend Modules

- **Configuration**: `backend/config/settings.py` (app name, debug, API prefix, CORS, email alert placeholders, `metadata_db_url`).
- **Models**: `backend/models/__init__.py` defines `DataSource`, `TableMetadata`, `ColumnMetadata`, `LineageRelation` (multi-source), `ColumnLineageRelation`, and `get_db/init_db`.
- **Schemas**: `backend/models/schemas.py` Pydantic models for create/update/response plus lineage graph DTOs.
- **Connectors**: `backend/core/connection_factory.py` builds Oracle/ES/Mongo connections with basic validation/caching.
- **Metadata Extraction**: `backend/core/metadata_extractor.py` pulls metadata per source type (Oracle tables/columns/pk, ES index mappings, Mongo collections).
- **Services**:
  - `data_source_service.py`: uniqueness checks, cascade delete of tables/lineage when requested.
  - `table_metadata_service.py` / `column_metadata_service.py`: CRUD and pagination.
  - `lineage_service.py`: validates source/target tables, persists lineage, DFS upstream/downstream traversal, graph construction using NetworkX.
  - `metadata_import_service.py`: orchestrates extraction → upsert/delete of tables/columns per data source.
  - `config_service.py`: config persistence helpers.
- **Routers** (`backend/api`): exposes `/api/data-sources`, `/api/tables`, `/api/columns`, `/api/lineage`, `/api/upload`, `/api/config`; `/api/health` for health check.

---

## Core Frontend Modules

- **Shell**: `frontend/src/App.jsx` (Ant Design layout, sider menu, routes).
- **Pages**:
  - `TableBrowsePage.jsx`: search/sort/paginate tables, column toggles, quick nav to detail.
  - `TableDetailPage.jsx`: table info + column list.
  - `TableCreatePage.jsx`: create table schema.
  - `DataSourcePage.jsx`: connector CRUD.
  - `ImportPage.jsx`: Excel/JSON upload and lineage setup handoff.
  - `LineagePage.jsx`: visualize lineage graph.
  - `SettingsPage.jsx`: general/database/alerts settings.
- **Services**: `frontend/src/services/api.js` wraps Axios for backend endpoints.
- **Styling**: `App.css`, `TablePages.css`, `index.css`; Ant Design theme defaults.

---

## Typical API Surface (selected)

- **Data Sources**: `POST/GET/PUT/DELETE /api/data-sources` (cascade delete option).
- **Tables/Columns**: `/api/tables`, `/api/columns` CRUD; supports pagination/sorting params.
- **Lineage**: `/api/lineage` CRUD; graph/upstream/downstream traversal endpoints returning `nodes`/`edges`.
- **Uploads**: `/api/upload/excel`, `/api/upload/json` for batch import.
- **Config**: `/api/config` plus `/general`, `/database`, `/alerts` sub-routes.
- **Health**: `/api/health`.

---

## Run & Develop

Backend:
```bash
cd backend
python app.py            # Starts FastAPI on http://localhost:8000 (Swagger at /docs)
```

Frontend:
```bash
cd frontend
npm install
npm run dev              # Vite dev server on http://localhost:3000
```

Tests:
```bash
pytest                   # Runs backend pytest suite
```

---

## Notes & Gotchas

- Default DB is SQLite at repo root (`metadata.db`); update `metadata_db_url` when switching to another RDBMS.
- Lineage APIs expect IDs (not names); `source_table_ids` stores multiple upstream tables as JSON.
- Connectors require real credentials/reachable hosts for Oracle/ES/Mongo; NetworkX used only in-process for graph shaping.
- CORS is open (`allow_origins=["*"]`); lock down in production.

---

**Document Version**: v1.0  
**Maintainer**: Shen Shunan
