# OFAC SDN Advanced Search Application

A robust, fully standalone web application for indexing, querying, and exporting OFAC SDN sanctions data from the Advanced XML schema. Zero external dependencies — runs on pure Python 3 and vanilla HTML/CSS/JavaScript.

## 🚀 Features

- **Zero-Dependency Architecture**: Built entirely with Python standard libraries and vanilla browser APIs. No `npm`, no `pip`, no frameworks.
- **Streaming XML Engine**: Parses 117MB+ `sdn_advanced.xml` files in seconds using memory-efficient `xml.etree.ElementTree.iterparse`, indexing 18,000+ profiles without RAM exhaustion.
- **Deep Reference Resolution**: Automatically resolves all `ReferenceValueSets` (70+ dictionaries including Country, FeatureType, SanctionsType, LegalBasis, etc.) into human-readable values at boot time.
- **SanctionsEntries Linking**: Performs a second parsing pass to match `SanctionsEntry.ProfileID` to `DistinctParty.FixedRef`, enriching each profile with listing dates, legal basis, sanctions programs, and measures.
- **Intelligent Name Assembly**: Uses `NamePartGroups` and `NamePartTypeID` mappings to correctly order name components (First Name → Last Name) and concatenate primary aliases.
- **Unique & Batch Search**: Query individual profiles or upload a CSV file to process thousands of checks, with comprehensive flattened CSV output.
- **Sanctions Program Filter**: Multi-select dropdown in both search tabs lets you filter results by specific sanctions programs (73 available, e.g. SDGT, TCO, CUBA). Programs are discovered automatically from the data.
- **Searchable by Program Code**: The search index includes sanctions program codes, so typing "SDGT" or "TCO" directly returns matching profiles.
- **Interactive Dataset Explorer**: Browse and search raw XML datasets (Locations, IDRegDocuments, ProfileRelationships, SanctionsEntries, ReferenceValueSets) directly in the browser with streaming query limits.
- **Dark/Light Theme Toggle**: Full theme support with `localStorage` persistence across sessions.
- **Hot-Swappable Datasets**: Upload new XML files via the UI to reload the database without restarting the server.
- **Full Database Export**: One-click download of the entire processed and flattened database via a dedicated button in the header.
- **Database Delta Comparison**: Upload a new XML to compare against your live database. Visual side-by-side diffs highlight exactly which names, attributes, or sanctions have changed across versions. Includes a CSV "Delta Report" export for auditing.

---

## 🛠️ Quick Start

No installation required beyond a Python 3 runtime.

1. Place `sdn_advanced.xml` in the project root directory.
2. Start the server:
   ```bash
   python server.py
   ```
3. Open `http://127.0.0.1:8000` in your browser.

---

## 📁 Project Structure

| File | Description |
|---|---|
| `server.py` | Backend: HTTP server, XML parsing, REST API endpoints, CSV/ZIP export |
| `index.html` | UI structure with tabs for Unique Search, Batch Search, Datasets, and Upload |
| `script.js` | Frontend logic: API interaction, dynamic rendering, CSV generation |
| `style.css` | Glassmorphic design system with dark/light theme variables |
| `CHANGELOG.md` | Version history of all changes |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/status` | Database status, profile count, feature types, sanctions programs list |
| `GET` | `/api/search/unique?q=<query>&programs=<P1,P2>` | Search profiles by name/ID, optionally filtered by programs |
| `GET` | `/api/search/dataset?type=<name>&q=<query>` | Search raw datasets (max 100 results) |
| `GET` | `/api/export/<dataset>` | Download full dataset as CSV or ZIP |
| `GET` | `/api/export/all` | Download the entire processed database as a flattened CSV |
| `GET` | `/api/template` | Download batch search CSV template |
| `GET` | `/api/export-delta` | Download a CSV report of the last database comparison |
| `POST` | `/api/search/batch` | Upload CSV for batch matching (header `X-Programs` for filtering) |
| `POST` | `/api/compare` | Upload XML for side-by-side comparison with the live database |
| `POST` | `/api/upload` | Upload new `sdn_advanced.xml` to reload database |

---

## 📊 CSV Export Columns

Both unique and batch search exports include:

| Column Group | Columns |
|---|---|
| **Core** | SearchTerm*, Matched*, OFAC_ID, PrimaryName, Type, PartyComment, Aliases |
| **Sanctions** | SanctionsList, EntryDate, LegalBasis, SanctionsPrograms |
| **Features** | One column per FeatureType (Birthdate, Gender, Nationality Country, Place of Birth, Title, etc.) |

*\* Batch export only*

---

## 🧪 Testing & Validation

- **Boot Performance**: 18,698 profiles + 18,874 sanctions entries indexed in ~5 seconds. 73 unique sanctions programs discovered.
- **Search Accuracy**: Partial text, ID, and program code queries return correct profile matches with full alias resolution.
- **Program Filtering**: Selecting SDGT for "abbas" narrows results from 44 to 18 profiles; selecting TCO narrows to 1.
- **Reference Integrity**: All `DetailReferenceID`, `LocationID`, `SanctionsTypeID`, and `LegalBasisID` values resolve to readable strings.
- **Export Completeness**: CSV exports contain all linked data: features, locations, sanctions programs, legal bases, and entry dates.
- **Theme Robustness**: All UI elements maintain proper contrast and visibility in both dark and light modes.
