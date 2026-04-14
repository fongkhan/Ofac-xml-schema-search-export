# Changelog

All notable changes to the **OFAC SDN Advanced Search API** project will be documented in this file.

## [1.0.0] - Core Advanced Search Initialization
- **Implemented zero-dependency backend**: Created a robust Python `http.server` module utilizing `lxml`/`xml.etree` `iterparse()` streams tracking highly intensive 117MB `sdn_advanced.xml` structures seamlessly ensuring highly effective indexing without running out of RAM.
- **Created Unique Profile Search Engine**: Maps cross-reference IDs enabling searches querying exact aliases and native numerical OFAC IDs cleanly displaying mapped properties through a dedicated REST `/api`.
- **Designed Glassmorphic UX**: Constructed `index.html`, `style.css` natively structuring visual layout parameters completely absent of `TailwindCSS`/`React` configurations.

## [1.1.0] - Batch Processing Engine & Schema Resolvers
- **Added Batch File Mapping Engine**: Introduced secure CSV uploading dynamically checking query tokens sequentially returning an iterative flat multi-column CSV natively integrating multi-match aggregations per record reliably tracking `Primary=true` constraints respectively cleanly across identical name inputs.
- **Implemented Dynamic Schema Extractor**: Replaced static CSV column mappings with a dynamic discovery loop inspecting exact nested `<Location>` headers splitting complex relational datasets isolated fields like explicit `Nationality Country` references against general locations efficiently.
- **Added `PartyComment` Resolution**: Automatically parses `<Comment>` schemas uniquely from `<DistinctParty>` nodes preserving complex text mappings alongside standard `<Profile>` structures accurately globally.

## [1.2.0] - Auxiliary Dataset Export Modules
- **Introduced Dataset Pipeline Hook**: Deployed REST endpoints targeting subsets natively structured inside the deep XML architectures like `ProfileRelationships`, `SanctionsEntries`, `IDRegDocuments` streaming native CSV strings without RAM payload blockages natively handling unhandled extraction failures securely.
- **Created Multi-CSV ZIP Architectures**: Implemented native `zipfile` memory buffers extracting over 70 `ReferenceValueSets` arrays recursively routing dynamic configurations into an interconnected file structure correctly on the fly natively avoiding massive monolithic formats cleanly natively.

## [1.3.0] - Advanced Array Extractions & Display Adjustments
- **Updated DOM Extractors**: Deployed native `DetailReferenceID` parsers dynamically searching inside array blocks like `<VersionDetail>` directly pulling properties natively like `Gender`, `Vessel Type` resolving raw strings perfectly instead of relying on default `N/A` structures flawlessly inside Both CSV batch formats and Javascript Display Grid rendering.
- **Refined Name Concatenation**: Established `NamePartTypeID` recursive hierarchy sorting ensuring `Primary Alias` outputs securely order components logically prioritizing strings dynamically natively isolating grammatical rules tracking `First Name` structurally before `Last Name` chunks replacing blind layout concatenations successfully naturally.

## [1.4.0] - Raw Dataset DB Explorer
- **Designed Interactive Explorer Grid Viewer**: Upgraded the auxiliary raw datastreams strictly from isolated download links seamlessly transitioning interfaces towards an interactive Javascript Sidebar mapping dynamic XML subset routing perfectly correctly on the fly seamlessly without generating overhead.
- **Added Streaming Search Filters**: Connected queries across 117MB files natively bounded strictly via 100 chunk query limits seamlessly formatting JSON payload arrays instantly generating dynamic CSV Tables resolving structures successfully safely.

## [1.4.1] - UX Quality of Life Adjustments
- **Added Native Theme Toggling**: Integrated a real-time DOM structural CSS override button allowing users to shift the application from its standard dark-mode glassmorphic default into a complete Light-Mode matrix. Securely binds settings into browser `localStorage` to preserve interface configurations permanently across reloads entirely natively.
- **Enabled 'Enter' Key Subscriptions**: Integrated `keypress` event listeners tracking specifically for `Enter` commands binding execution flows seamlessly over the Unique query input loops and Dataset structural viewers without requiring rigid localized mouse actions manually.

## [1.4.2] - Bug Fixes & API Consolidation
- **Fixed Persistent Status Bug**: Resolved an issue where the frontend was stuck in the "Reloading..." state due to duplicate `/api/status` endpoint definitions in the backend. Consolidated redundant routes into a single, comprehensive status provider that correctly supplies the `db_status`, `profile_count`, and `feature_types` required for UI synchronization.
- **Server Runtime Optimization**: Restarted background processing to ensure all structural changes to the search index and reference maps are correctly reflected in the live search environment.

## [1.4.3] - UI/UX & Light Mode Refinement
- **Enhanced Light Mode Contrast**: Overhauled the color system to eliminate hardcoded white text, replacing it with theme-aware variables. Improved visibility of headers, input fields, and search result cards in high-brightness environments.
- **Revised Aesthetic Tokens**: Introduced more subtle active states for tabs and sidebars, replacing high-saturation blue blocks with refined, low-opacity highlights for a more premium enterprise feel.
- **Status Indicator Visibility**: Implemented a dual-state green status indicator that automatically adjusts its hue and saturation to maintain optimal legibility against both dark and light backgrounds.
- **Fixed Profile Card Layout**: Resolved a CSS bug where search result containers became invisible in light mode, reinstating borders and themed background planes for clearly defined entity data visualization.

## [1.5.0] - SanctionsEntries Integration
- **Linked SanctionsEntries to Profiles**: Implemented a second XML parsing pass over the `<SanctionsEntries>` section, matching each `SanctionsEntry.ProfileID` to its corresponding `DistinctParty.FixedRef` / `Profile.ID`. All 18,874 sanctions entries are now attached directly to their profile records at load time.
- **Resolved Reference Values**: `ListID`, `EntryEventTypeID`, `LegalBasisID`, and `SanctionsTypeID` attributes are automatically mapped to human-readable values (e.g., "SDN List", "Executive Order 13224 (Terrorism)") via the pre-loaded `ReferenceValueSets`.
- **Frontend Sanctions Panel**: Added a dedicated "Sanctions Information" section to each profile card in the UI, displaying list name, entry date, event type, legal basis, and individual sanctions measures with program comments.
- **CSV Export Enrichment**: Added 4 new columns (`SanctionsList`, `EntryDate`, `LegalBasis`, `SanctionsPrograms`) to both the unique search and batch search CSV exports.

## [1.5.1] - Sanctions Display & Searchable Programs
- **Individual Sanctions Blocks**: Redesigned the Sanctions Information panel so each field (List, Entry Date, Event, Legal Basis, each Measure) renders as its own independent block, matching the alias display style for better readability.
- **Program-Indexed Search**: Rebuilt the search index after loading SanctionsEntries to include sanctions program codes (SDGT, TCO, CUBA, etc.) in the searchable text. Users can now search directly by program code in both unique and batch searches.

## [1.6.0] - Sanctions Program Filter
- **Multi-Select Program Filter**: Added an interactive filter dropdown to both the Unique Search and Batch Search tabs. Users can select one or more sanctions programs (73 available) to narrow search results to only profiles tagged with those programs.
- **Server-Side Filtering**: Search results are filtered server-side via query parameters (unique search) or HTTP headers (batch search), ensuring only matching profiles are returned.
- **Dynamic Program Discovery**: All unique program names are collected during database loading and exposed via the `/api/status` endpoint for automatic UI population.

## [1.7.0] - Full Database Export
- **Streamed Full Database Export**: Implemented a memory-efficient backend endpoint `/api/export/all` that flattens and streams the entire 18,698 profile database directly into a single CSV file.
- **Header Export Button**: Added a primary action button in the application header for one-click access to the full dataset export.
- **Memory Optimized CSV Generation**: Utilized chunked writing to handle large datasets natively without exceeding server RAM limits.

## [1.8.0] - Database Delta Comparison
- **XML Comparison Engine**: New tool to compare the currently loaded live database against an external `sdn_advanced.xml` file.
- **Side-by-Side Diff View**: Visual comparison of profiles with amber-colored highlighting for modified fields (Primary Name, Alias list, features, and sanctions).
- **Delta Reporting**: Summary dashboard showing Added, Removed, and Modified profile counts.
- **CSV Delta Export**: Ability to download the "Delta Report" in CSV format for audit trails and version tracking.
- **Performance Optimized**: Comparison of 117MB files completes in ~5-8 seconds using streaming `iterparse` without memory exhaustion.
- **Fixed Syntax Error**: Resolved an orphaned `else` block in backend export logic blocking certain CSV downloads.
