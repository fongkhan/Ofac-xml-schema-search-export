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
