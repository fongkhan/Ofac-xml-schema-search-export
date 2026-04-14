// Tabs handling
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.remove('hidden');
    });
});

let currentUniqueRawData = [];
let availableFeatureTypes = [];

const namePartOrder = {
    "First Name": 1,
    "Middle Name": 2,
    "Patronymic": 3,
    "Matronymic": 4,
    "Last Name": 5,
    "Entity Name": 10,
    "Nickname": 11,
    "Vessel Name": 12,
    "Aircraft Name": 13
};

function formatAliasName(aliasNode, identNode) {
    let groupMap = {};
    if (identNode && identNode.NamePartGroups && identNode.NamePartGroups[0].MasterNamePartGroup) {
        identNode.NamePartGroups[0].MasterNamePartGroup.forEach(mg => {
            if (mg.NamePartGroup && mg.NamePartGroup[0]) {
                let npg = mg.NamePartGroup[0];
                let ty = npg.NamePartTypeID ? (typeof npg.NamePartTypeID === 'object' ? npg.NamePartTypeID.value : npg.NamePartTypeID) : "Unknown";
                groupMap[npg.ID] = ty;
            }
        });
    }

    let partsList = [];
    if (aliasNode.DocumentedName && aliasNode.DocumentedName[0].DocumentedNamePart) {
        aliasNode.DocumentedName[0].DocumentedNamePart.forEach(part => {
            if (part.NamePartValue) {
                part.NamePartValue.forEach(v => {
                    let text = v.text || "";
                    let gid = v.NamePartGroupID;
                    let typeName = groupMap[gid] || "Unknown";
                    let order = namePartOrder[typeName] || 99;
                    if (text) partsList.push({ text: text, order: order });
                });
            }
        });
    }
    partsList.sort((a, b) => a.order - b.order);
    return partsList.map(x => x.text).join(' ');
}

// Theme Integration Setup
const themeBtn = document.getElementById('themeToggleBtn');
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-mode');
    themeBtn.innerText = "Dark Mode";
}

themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    if (document.body.classList.contains('light-mode')) {
        localStorage.setItem('theme', 'light');
        themeBtn.innerText = "Dark Mode";
    } else {
        localStorage.setItem('theme', 'dark');
        themeBtn.innerText = "Light Mode";
    }
});

// Check Server Status
async function checkStatus() {
    try {
        let res = await fetch('/api/status');
        let data = await res.json();
        let s = document.getElementById('dbSearchStatus');
        if (data.db_status === "Ready") {
            s.innerHTML = `<span style="color:var(--status-ready);">Ready - ${data.profile_count} Profiles Indexed</span>`;
            if (data.feature_types) {
                const fSet = new Set(Object.values(data.feature_types));
                availableFeatureTypes = Array.from(fSet).sort();
            }
            if (data.sanctions_programs) {
                populateProgramFilter('programFilterDropdown', data.sanctions_programs);
                populateProgramFilter('batchProgramFilterDropdown', data.sanctions_programs);
            }
        } else {
            s.innerHTML = `<span style="color:#f2cc60;">Reloading...</span>`;
            setTimeout(checkStatus, 3000);
        }
    } catch (e) {
        document.getElementById('dbSearchStatus').innerHTML = `<span style="color:#ff7b72;">Disconnected</span>`;
    }
}

function populateProgramFilter(containerId, programs) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    programs.forEach(prog => {
        const label = document.createElement('label');
        label.style.cssText = 'display:flex; align-items:center; gap:4px; font-size:0.85em; cursor:pointer; padding:2px 4px; border-radius:4px;';
        label.innerHTML = `<input type="checkbox" value="${prog}" class="program-cb" style="cursor:pointer;"> ${prog}`;
        container.appendChild(label);
    });
}

function getSelectedPrograms(containerId) {
    const checkboxes = document.querySelectorAll('#' + containerId + ' .program-cb:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

function updateProgramSummary(containerId, summaryId) {
    const selected = getSelectedPrograms(containerId);
    const el = document.getElementById(summaryId);
    if (selected.length === 0) {
        el.textContent = 'No filter (all programs)';
    } else {
        el.textContent = selected.join(', ');
    }
}

// Toggle dropdowns
document.getElementById('toggleProgramFilter').addEventListener('click', () => {
    document.getElementById('programFilterDropdown').classList.toggle('hidden');
});
document.getElementById('toggleBatchProgramFilter').addEventListener('click', () => {
    document.getElementById('batchProgramFilterDropdown').classList.toggle('hidden');
});

// Update summaries on checkbox change
document.getElementById('programFilterDropdown').addEventListener('change', () => {
    updateProgramSummary('programFilterDropdown', 'programFilterSummary');
});
document.getElementById('batchProgramFilterDropdown').addEventListener('change', () => {
    updateProgramSummary('batchProgramFilterDropdown', 'batchProgramFilterSummary');
});

checkStatus();

// XML Upload
document.getElementById('uploadXmlBtn').addEventListener('click', async () => {
    const fileInst = document.getElementById('xmlFileInput').files[0];
    if (!fileInst) {
        alert("Please select an XML file to upload.");
        return;
    }

    const statusTxt = document.getElementById('xml-status');
    statusTxt.textContent = "Uploading and parsing... this may take 10-30 seconds.";

    try {
        const payload = await fileInst.arrayBuffer();
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: payload,
            headers: {
                'Content-Type': 'application/xml'
            }
        });
        const data = await res.json();
        if (data.success) {
            statusTxt.innerHTML = `<span style="color:#7ee787;">${data.message}</span>`;
            checkStatus();
        } else {
            statusTxt.textContent = "Failed to upload.";
        }
    } catch (err) {
        statusTxt.textContent = "Upload error: " + err;
    }
});

// Unique Search

document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') document.getElementById('searchBtn').click();
});

document.getElementById('searchBtn').addEventListener('click', async () => {
    const q = document.getElementById('searchInput').value.trim();
    if (!q) return;

    const resEl = document.getElementById('u-results');
    const metaEl = document.getElementById('u-meta');
    const expBtn = document.getElementById('exportCsvBtn');

    resEl.innerHTML = "Searching...";
    metaEl.innerHTML = "";
    expBtn.classList.add('hidden');

    try {
        let searchUrl = '/api/search/unique?q=' + encodeURIComponent(q);
        const selectedPrograms = getSelectedPrograms('programFilterDropdown');
        if (selectedPrograms.length > 0) {
            searchUrl += '&programs=' + encodeURIComponent(selectedPrograms.join(','));
        }
        const res = await fetch(searchUrl);
        const data = await res.json();
        currentUniqueRawData = data;

        metaEl.textContent = `Found ${data.length} profiles matching query.`;
        if (data.length > 0) {
            expBtn.classList.remove('hidden');
        }

        resEl.innerHTML = "";
        data.forEach(p => {
            const card = document.createElement('div');
            card.className = 'profile-card';

            // Try extract prime names
            let primaryNameStrs = [];
            const aliases = [];

            if (p.Identity) {
                p.Identity.forEach(ident => {
                    if (ident.Alias) {
                        ident.Alias.forEach(al => {
                            let nameText = formatAliasName(al, ident);
                            if (al.Primary === "true") {
                                if (nameText) primaryNameStrs.push(nameText);
                            } else {
                                if (nameText) aliases.push(nameText);
                            }
                        });
                    }
                });
            }
            let primaryName = primaryNameStrs.length > 0 ? primaryNameStrs.join('; ') : "Unknown Entity";

            // Extract partyType
            let pType = p.PartySubTypeID ? (p.PartySubTypeID.value || p.PartySubTypeID) : "Unknown";
            let pPartyType = p._partyType || "";

            let html = `
                <div class="profile-header">
                    <div style="display:flex; flex-direction:column; gap:6px;">
                        <span class="profile-title">${primaryName}</span>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <span class="profile-badge">${pType}</span>
                            ${pPartyType ? `<span class="profile-badge party-type">${pPartyType}</span>` : ''}
                        </div>
                    </div>
                    <span class="profile-id">ID: ${p.ID}</span>
                </div>
                <div class="data-grid">
                    <div class="data-section">
                        <h3>Identities & Aliases</h3>
                        <ul class="data-list">
                            ${aliases.map(a => `<li class="data-item">${a}</li>`).join('') || '<li class="data-item">No records</li>'}
                        </ul>
                    </div>
                    <div class="data-section">
                        <h3>Features (Linked Attributes)</h3>
                        <ul class="data-list">`;

            if (p.Feature) {
                p.Feature.forEach(f => {
                    const fType = f.FeatureTypeID ? (f.FeatureTypeID.value || f.FeatureTypeID) : "Unknown";
                    let details = "";
                    if (f.FeatureVersion) {
                        f.FeatureVersion.forEach(v => {
                            if (v.VersionLocation && v.VersionLocation[0].LocationID) {
                                let locObj = v.VersionLocation[0].LocationID;
                                let locStr = (typeof locObj === 'object') ? (locObj.value || locObj.id || JSON.stringify(locObj)) : locObj;
                                if (locStr) details += `<span class="ref">${locStr}</span> `;
                            }
                            if (v.Comment) {
                                v.Comment.forEach(c => {
                                    if (c.text) details += "[" + c.text + "] ";
                                });
                            }
                            if (v.VersionDetail) {
                                v.VersionDetail.forEach(vd => {
                                    if (vd.text) details += vd.text + " ";
                                    if (vd.DetailReferenceID) {
                                        let drObj = vd.DetailReferenceID;
                                        let drStr = (typeof drObj === 'object') ? (drObj.value || drObj.id) : drObj;
                                        if (drStr) details += drStr + " ";
                                    }
                                });
                            }
                            if (v.DatePeriod) {
                                v.DatePeriod.forEach(dp => {
                                    if (dp.Start && dp.Start[0].From && dp.Start[0].From[0]) {
                                        let from = dp.Start[0].From[0];
                                        let y = from.Year && from.Year[0].text ? from.Year[0].text : '';
                                        let m = from.Month && from.Month[0].text ? from.Month[0].text : '';
                                        let d = from.Day && from.Day[0].text ? from.Day[0].text : '';
                                        let dateStr = [y, m, d].filter(x => x).join('-');
                                        if (dateStr) details += `[${dateStr}] `;
                                    }
                                });
                            }
                        });
                    }
                    html += `<li class="data-item"><strong>${fType}:</strong> ${details.trim() || 'N/A'}</li>`;
                });
            } else {
                html += `<li class="data-item">No features</li>`;
            }

            html += `</ul></div></div>`;

            // Sanctions Information Section
            if (p.SanctionsEntries && p.SanctionsEntries.length > 0) {
                html += `<div style="margin-top:15px;">
                    <h3 style="font-size:0.9em; text-transform:uppercase; color:var(--text-muted); margin-bottom:10px;">Sanctions Information</h3>
                    <ul class="data-list">`;
                p.SanctionsEntries.forEach(se => {
                    if (se.ListName) html += `<li class="data-item"><strong>List:</strong> ${se.ListName}</li>`;
                    if (se.EntryDate) html += `<li class="data-item"><strong>Entry Date:</strong> ${se.EntryDate}</li>`;
                    if (se.EntryEventType) html += `<li class="data-item"><strong>Event:</strong> ${se.EntryEventType}</li>`;
                    if (se.LegalBasis) html += `<li class="data-item"><strong>Legal Basis:</strong> ${se.LegalBasis}</li>`;

                    if (se.SanctionsMeasures && se.SanctionsMeasures.length > 0) {
                        se.SanctionsMeasures.forEach(sm => {
                            let label = `<strong>${sm.SanctionsType}</strong>`;
                            if (sm.Comment) label += `: <span class="ref">${sm.Comment}</span>`;
                            html += `<li class="data-item">${label}</li>`;
                        });
                    }
                });
                html += `</ul></div>`;
            }

            html += `
            <details style="margin-top:15px; cursor:pointer;" class="btn secondary">
                <summary>View Complete JSON</summary>
                <pre>${JSON.stringify(p, null, 2)}</pre>
            </details>
            `;

            card.innerHTML = html;
            resEl.appendChild(card);
        });

    } catch (err) {
        resEl.innerHTML = `<span style="color:red">Error: ${err}</span>`;
    }
});

// Download Unique Search CSV
document.getElementById('exportCsvBtn').addEventListener('click', () => {
    if (!currentUniqueRawData.length) return;

    let fNames = availableFeatureTypes;

    const rows = [
        ["OFAC_ID", "PrimaryName", "Type", "PartyType", "PartyComment", "Aliases", "SanctionsList", "EntryDate", "LegalBasis", "SanctionsPrograms", "SubsidiaryBody", "AreaCode_Text", "AreaCode_Description", "AreaCode_Country", ...fNames]
    ];

    currentUniqueRawData.forEach(p => {
        let primaryNameStrs = [];
        let aliases = [];
        if (p.Identity) {
            p.Identity.forEach(ident => {
                if (ident.Alias) {
                    ident.Alias.forEach(al => {
                        let nameText = formatAliasName(al, ident);
                        if (al.Primary === "true") {
                            if (nameText) primaryNameStrs.push(nameText);
                        } else {
                            if (nameText) aliases.push(nameText);
                        }
                    });
                }
            });
        }
        let primaryName = primaryNameStrs.length > 0 ? primaryNameStrs.join('; ') : "Unknown";
        let pType = p.PartySubTypeID ? (p.PartySubTypeID.value || p.PartySubTypeID) : "Unknown";

        let featureMap = {};
        fNames.forEach(fn => featureMap[fn] = []);

        if (p.Feature) {
            p.Feature.forEach(f => {
                const fType = f.FeatureTypeID ? (f.FeatureTypeID.value || f.FeatureTypeID) : "Unknown";
                if (f.FeatureVersion) {
                    f.FeatureVersion.forEach(v => {
                        let detail = "";
                        if (v.VersionLocation && v.VersionLocation[0].LocationID) {
                            let locObj = v.VersionLocation[0].LocationID;
                            let locStr = (typeof locObj === 'object') ? (locObj.value || locObj.id || JSON.stringify(locObj)) : locObj;
                            if (locStr) detail += locStr + " ";
                        }
                        if (v.Comment) {
                            v.Comment.forEach(c => {
                                if (c.text) detail += c.text + " ";
                            });
                        }
                        if (v.VersionDetail) {
                            v.VersionDetail.forEach(vd => {
                                if (vd.text) detail += vd.text + " ";
                                if (vd.DetailReferenceID) {
                                    let drObj = vd.DetailReferenceID;
                                    let drStr = (typeof drObj === 'object') ? (drObj.value || drObj.id) : drObj;
                                    if (drStr) detail += drStr + " ";
                                }
                            });
                        }
                        if (v.DatePeriod) {
                            v.DatePeriod.forEach(dp => {
                                if (dp.Start && dp.Start[0].From && dp.Start[0].From[0]) {
                                    let from = dp.Start[0].From[0];
                                    let y = from.Year && from.Year[0].text ? from.Year[0].text : '';
                                    let m = from.Month && from.Month[0].text ? from.Month[0].text : '';
                                    let d = from.Day && from.Day[0].text ? from.Day[0].text : '';
                                    let dateStr = [y, m, d].filter(x => x).join('-');
                                    detail += dateStr + " ";
                                }
                            });
                        }
                        if (detail.trim() && featureMap[fType]) {
                            featureMap[fType].push(detail.trim());
                        }
                    });
                }
            });
        }

        // Extract sanctions data
        let seLists = [], seDates = [], seLegal = [], sePrograms = [];
        if (p.SanctionsEntries) {
            p.SanctionsEntries.forEach(se => {
                if (se.ListName) seLists.push(se.ListName);
                if (se.EntryDate) seDates.push(se.EntryDate);
                if (se.LegalBasis) seLegal.push(se.LegalBasis);
                if (se.SanctionsMeasures) {
                    se.SanctionsMeasures.forEach(sm => {
                        if (sm.Comment) sePrograms.push(sm.Comment);
                    });
                }
            });
        }

        const clean = (str) => typeof str === 'string' ? `"${str.replace(/"/g, '""')}"` : '""';

        let pComment = p.DistinctPartyComment || "";
        let pPartyType = p._partyType || "";

        let rowData = [
            clean(p.ID),
            clean(primaryName),
            clean(pType),
            clean(pPartyType),
            clean(pComment),
            clean(aliases.join("; ")),
            clean(seLists.join("; ")),
            clean(seDates.join("; ")),
            clean(seLegal.join("; ")),
            clean(sePrograms.join("; ")),
            clean(""),
            clean(""),
            clean(""),
            clean("")
        ];

        fNames.forEach(fn => {
            rowData.push(clean(featureMap[fn].join("; ")));
        });

        rows.push(rowData);
    });

    const csvContent = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "unique_search_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Batch Search Upload
document.getElementById('uploadBatchBtn').addEventListener('click', async () => {
    const fileInst = document.getElementById('batchFileInput').files[0];
    if (!fileInst) {
        alert("Please select a completed CSV template to upload.");
        return;
    }

    const statusTxt = document.getElementById('batch-status');
    statusTxt.textContent = "Processing batch... this will download automatically when done.";

    try {
        const payload = await fileInst.arrayBuffer();
        const batchPrograms = getSelectedPrograms('batchProgramFilterDropdown');
        const fetchHeaders = { 'Content-Type': 'text/csv' };
        if (batchPrograms.length > 0) {
            fetchHeaders['X-Programs'] = batchPrograms.join(',');
        }
        const res = await fetch('/api/search/batch', {
            method: 'POST',
            body: payload,
            headers: fetchHeaders
        });

        if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "batch_results.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            statusTxt.innerHTML = `<span style="color:#7ee787;">Batch exported successfully!</span>`;
        } else {
            statusTxt.textContent = "Failed to process batch query.";
        }
    } catch (err) {
        statusTxt.textContent = "Batch error: " + err;
    }
});

// --- Dataset Explorer Logic ---
let currentDatasetTab = "ReferenceValueSets";

document.querySelectorAll('.d-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.d-tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentDatasetTab = e.target.getAttribute('data-dataset');

        document.getElementById('d-title').innerText = currentDatasetTab + " Viewer";
        document.getElementById('d-thead').innerHTML = '';
        document.getElementById('d-tbody').innerHTML = '';
        document.getElementById('d-status').innerText = 'Ready. Please enter a query...';
        document.getElementById('d-search').value = "";
    });
});

document.getElementById('d-export-btn').addEventListener('click', () => {
    window.location.href = `/api/export/${currentDatasetTab}`;
});

document.getElementById('d-search').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') document.getElementById('d-search-btn').click();
});

document.getElementById('d-search-btn').addEventListener('click', async () => {
    const q = document.getElementById('d-search').value;
    const tbody = document.getElementById('d-tbody');
    const thead = document.getElementById('d-thead');
    const status = document.getElementById('d-status');

    tbody.innerHTML = '';
    thead.innerHTML = '';
    status.innerText = 'Searching stream...';

    try {
        let res = await fetch(`/api/search/dataset?type=${currentDatasetTab}&q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error('Query error');
        let data = await res.json();

        if (!data.columns || data.columns.length === 0) {
            status.innerText = "No data mapping found. Dataset might not exist.";
            return;
        }

        status.innerText = `Showing ${data.rows.length} matches (Max 100 limit enforced)`;

        // Build Headers
        let headerRow = '<tr>';
        data.columns.forEach(col => {
            headerRow += `<th>${col}</th>`;
        });
        headerRow += '</tr>';
        thead.innerHTML = headerRow;

        // Build Rows
        let bodyHtml = '';
        data.rows.forEach(row => {
            bodyHtml += '<tr>';
            data.columns.forEach(col => {
                let cellData = row[col] !== undefined ? row[col] : '';
                bodyHtml += `<td>${cellData}</td>`;
            });
            bodyHtml += '</tr>';
        });
        tbody.innerHTML = bodyHtml;

    } catch (err) {
        status.innerText = "Error executing query constraint block.";
        console.error(err);
    }
});

// Database Comparison Logic
document.getElementById('runCompareBtn').addEventListener('click', async () => {
    const fileInst = document.getElementById('compareFileInput').files[0];
    if (!fileInst) {
        alert("Please select a second XML file to compare.");
        return;
    }

    const statusTxt = document.getElementById('compare-status');
    const summaryDiv = document.getElementById('compare-summary');
    const detailsDiv = document.getElementById('compare-details');
    const headerDiv = document.getElementById('compare-results-header');

    statusTxt.innerHTML = "Comparing databases... this may take a few seconds for large files.";
    detailsDiv.innerHTML = "";
    headerDiv.classList.add('hidden');

    try {
        const payload = await fileInst.arrayBuffer();
        const res = await fetch('/api/compare', {
            method: 'POST',
            body: payload
        });
        
        const data = await res.json();
        const results = data.details;
        
        statusTxt.innerHTML = `<span style="color:var(--status-ready);">Comparison complete!</span>`;
        headerDiv.classList.remove('hidden');
        
        // Render Summary
        summaryDiv.innerHTML = `
            <div class="compare-summary-item"><span class="status-badge added">Added</span> <strong>${data.summary.added}</strong></div>
            <div class="compare-summary-item"><span class="status-badge removed">Removed</span> <strong>${data.summary.removed}</strong></div>
            <div class="compare-summary-item"><span class="status-badge modified">Modified</span> <strong>${data.summary.modified}</strong></div>
        `;

        // Render Details
        let detailsHtml = '';

        // Added
        results.added.forEach(p => {
            detailsHtml += `
                <div class="profile-card">
                    <div class="profile-header">
                        <span class="status-badge added">Added</span>
                        <span class="profile-title">${assembleNameFromDict(p)}</span>
                        <span class="profile-id">ID: ${p.ID}</span>
                    </div>
                </div>
            `;
        });

        // Removed
        results.removed.forEach(p => {
            detailsHtml += `
                <div class="profile-card">
                    <div class="profile-header">
                        <span class="status-badge removed">Removed</span>
                        <span class="profile-title">${p.PrimaryName}</span>
                        <span class="profile-id">ID: ${p.ID}</span>
                    </div>
                </div>
            `;
        });

        // Modified
        results.modified.forEach(m => {
            const before = m.Before;
            const after = m.After;
            
            detailsHtml += `
                <div class="profile-card">
                    <div class="profile-header">
                        <span class="status-badge modified">Modified</span>
                        <span class="profile-title">${m.PrimaryName}</span>
                        <span class="profile-id">ID: ${m.ID}</span>
                    </div>
                    <div class="diff-container">
                        <div class="diff-box diff-box-left">
                            <h4>Current Database (Old)</h4>
                            ${renderDiffBoxContent(before, after)}
                        </div>
                        <div class="diff-box diff-box-right">
                            <h4>New File (Compared)</h4>
                            ${renderDiffBoxContent(after, before)}
                        </div>
                    </div>
                </div>
            `;
        });

        detailsDiv.innerHTML = detailsHtml || "<p>No differences found. The files are identical.</p>";

    } catch (err) {
        statusTxt.innerHTML = `<span style="color:var(--warning-color);">Error comparing: ${err}</span>`;
        console.error(err);
    }
});

function renderDiffBoxContent(p, other = null) {
    const isChanged = (field, val1, val2) => {
        if (!other) return false;
        return JSON.stringify(val1) !== JSON.stringify(val2);
    };

    const pName = assembleNameFromDict(p);
    const oName = other ? assembleNameFromDict(other) : pName;
    
    const pType = p.PartySubTypeID?.value || 'N/A';
    const oType = other?.PartySubTypeID?.value || 'N/A';
    
    const pPartyType = p._partyType || 'N/A';
    const oPartyType = other?._partyType || 'N/A';
    
    const pComment = p.DistinctPartyComment || '-';
    const oComment = other?.DistinctPartyComment || '-';

    let html = `
        <div class="diff-field ${isChanged('name', pName, oName) ? 'changed' : ''}"><span class="diff-label">Primary Name:</span> ${pName}</div>
        <div class="diff-field ${isChanged('type', pType, oType) ? 'changed' : ''}"><span class="diff-label">Sub Type:</span> ${pType}</div>
        <div class="diff-field ${isChanged('partytype', pPartyType, oPartyType) ? 'changed' : ''}"><span class="diff-label">Party Type:</span> ${pPartyType}</div>
        <div class="diff-field ${isChanged('comment', pComment, oComment) ? 'changed' : ''}"><span class="diff-label">Comment:</span> ${pComment}</div>
    `;
    
    // Aliases
    const getAliases = (prof) => {
        const alts = [];
        (prof.Identity || []).forEach(id => {
            (id.Alias || []).forEach(al => {
                if (al.Primary === 'true') return;
                let nameText = formatAliasName(al, id);
                if (nameText) alts.push(nameText);
            });
        });
        return alts.sort();
    };

    const pAliases = getAliases(p);
    const oAliases = other ? getAliases(other) : pAliases;

    if (pAliases.length || oAliases.length) {
        html += `<div class="diff-field ${isChanged('aliases', pAliases, oAliases) ? 'changed' : ''}">
            <span class="diff-label">Aliases:</span>
            <div style="font-size:0.85em; color:var(--text-muted); padding-left:10px;">
                ${pAliases.slice(0, 5).join(', ')}${pAliases.length > 5 ? '...' : ''}
            </div>
        </div>`;
    }

    // Features
    const getFeaturesMap = (prof) => {
        const fMap = {};
        (prof.Feature || []).forEach(f => {
            let ftypeName = f.FeatureTypeID?.value || "Unknown";
            let fValues = [];
            (f.FeatureVersion || []).forEach(fv => {
                let detail = "";
                (fv.VersionLocation || []).forEach(loc => { detail += (loc.LocationID?.value || loc.LocationID || '') + " "; });
                (fv.VersionDetail || []).forEach(vd => {
                    if (vd.text) detail += vd.text + " ";
                    if (vd.DetailReferenceID) detail += (vd.DetailReferenceID.value || vd.DetailReferenceID) + " ";
                });
                (fv.DatePeriod || []).forEach(dp => {
                    let start = dp.Start?.[0]?.From?.[0];
                    if (start) {
                        let dateStr = [start.Year?.[0]?.text, start.Month?.[0]?.text, start.Day?.[0]?.text].filter(x => x).join('-');
                        if (dateStr) detail += dateStr + " ";
                    }
                });
                if (detail.trim()) fValues.push(detail.trim());
            });
            if (fValues.length) fMap[ftypeName] = fValues.sort().join('; ');
        });
        return fMap;
    };

    const pFeatures = getFeaturesMap(p);
    const oFeatures = other ? getFeaturesMap(other) : pFeatures;
    
    // Combine all feature types present in either
    const allFeatureTypes = Array.from(new Set([...Object.keys(pFeatures), ...Object.keys(oFeatures)])).sort();

    allFeatureTypes.forEach(ft => {
        const pVal = pFeatures[ft] || null;
        const oVal = oFeatures[ft] || null;
        if (pVal !== null) {
            html += `<div class="diff-field ${isChanged('f-' + ft, pVal, oVal) ? 'changed' : ''}"><span class="diff-label">${ft}:</span> ${pVal}</div>`;
        }
    });

    // Sanctions
    const getSanctionsSummary = (prof) => {
        return (prof.SanctionsEntries || []).map(se => ({
            List: se.ListName,
            Date: se.EntryDate,
            Programs: (se.SanctionsMeasures || []).map(sm => sm.Comment).filter(x => x).sort()
        })).sort((a,b) => (a.List + a.Date).localeCompare(b.List + b.Date));
    };

    const pSanc = getSanctionsSummary(p);
    const oSanc = other ? getSanctionsSummary(other) : pSanc;

    if (pSanc.length || oSanc.length) {
        (p.SanctionsEntries || []).forEach((se, idx) => {
            // Find if this specific sanction entry exists in the other/is changed
            // For simplicity, we compare based on list/date
            const otherMatch = oSanc.find(os => os.List === se.ListName && os.Date === se.EntryDate);
            const mySanc = { List: se.ListName, Date: se.EntryDate, Programs: (se.SanctionsMeasures || []).map(sm => sm.Comment).filter(x => x).sort() };
            
            html += `
                <div class="diff-field ${isChanged('s-' + idx, mySanc, otherMatch) ? 'changed' : ''}" style="border-top:1px dashed var(--glass-border); padding-top:10px;">
                    <span class="diff-label">Sanctions List:</span> ${se.ListName || 'N/A'} <br/>
                    <span class="diff-label">Entry Date:</span> ${se.EntryDate || 'N/A'} <br/>
                    <span class="diff-label">Programs:</span> ${(se.SanctionsMeasures || []).map(sm => sm.Comment).filter(x => x).join(', ') || 'N/A'}
                </div>
            `;
        });
    }

    return html;
}

function assembleNameFromDict(p) {
    let names = [];
    (p.Identity || []).forEach(id => {
        (id.Alias || []).forEach(al => {
            if (al.Primary === "true") {
                let nameText = formatAliasName(al, id);
                if (nameText) names.push(nameText);
            }
        });
    });
    return names.length > 0 ? names.join('; ') : "Unknown Entity";
}

