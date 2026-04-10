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
            if(mg.NamePartGroup && mg.NamePartGroup[0]) {
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
                    if(text) partsList.push({text: text, order: order});
                });
            }
        });
    }
    partsList.sort((a,b) => a.order - b.order);
    return partsList.map(x=>x.text).join(' ');
}

// Check Server Status
async function checkStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        const statEl = document.getElementById('dbSearchStatus');
        if (data.loaded) {
            statEl.textContent = `Online (${data.profile_count} profiles active)`;
            statEl.style.color = '#7ee787';
            if (data.feature_types) {
                const fSet = new Set(Object.values(data.feature_types));
                availableFeatureTypes = Array.from(fSet).sort();
            }
        } else {
            statEl.textContent = 'Awaiting XML Load';
            statEl.style.color = '#f85149';
        }
    } catch (err) {
        document.getElementById('dbSearchStatus').textContent = 'Offline (Server down)';
        document.getElementById('dbSearchStatus').style.color = '#f85149';
    }
}
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
    } catch(err) {
        statusTxt.textContent = "Upload error: " + err;
    }
});

// Unique Search

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
        const res = await fetch('/api/search/unique?q=' + encodeURIComponent(q));
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
                                if(nameText) aliases.push(nameText);
                            }
                        });
                    }
                });
            }
            let primaryName = primaryNameStrs.length > 0 ? primaryNameStrs.join('; ') : "Unknown Entity";
            
            // Extract partyType
            let pType = p.PartySubTypeID ? (p.PartySubTypeID.value || p.PartySubTypeID) : "Unknown";
            
            let html = `
                <div class="profile-header">
                    <span class="profile-title">${primaryName} <small style="color:var(--text-muted)">(${pType})</small></span>
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
                                        let dateStr = [y, m, d].filter(x=>x).join('-');
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
            
            html += `</ul></div></div>
            <details style="margin-top:15px; cursor:pointer;" class="btn secondary">
                <summary>View Complete JSON</summary>
                <pre>${JSON.stringify(p, null, 2)}</pre>
            </details>
            `;
            
            card.innerHTML = html;
            resEl.appendChild(card);
        });
        
    } catch(err) {
        resEl.innerHTML = `<span style="color:red">Error: ${err}</span>`;
    }
});

// Download Unique Search CSV
document.getElementById('exportCsvBtn').addEventListener('click', () => {
    if(!currentUniqueRawData.length) return;
    
    let fNames = availableFeatureTypes;
    
    const rows = [
        ["ID", "Primary_Name", "Type", "PartyComment", "Aliases", ...fNames]
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
                            if(nameText) aliases.push(nameText);
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
                                    let dateStr = [y, m, d].filter(x=>x).join('-');
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
        
        const clean = (str) => typeof str === 'string' ? `"${str.replace(/"/g, '""')}"` : '""';
        
        let pComment = p.DistinctPartyComment || "";
        
        let rowData = [
            clean(p.ID),
            clean(primaryName),
            clean(pType),
            clean(pComment),
            clean(aliases.join("; "))
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
        const res = await fetch('/api/search/batch', {
            method: 'POST',
            body: payload,
            headers: {
                'Content-Type': 'text/csv'
            }
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
    } catch(err) {
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
        
    } catch(err) {
        status.innerText = "Error executing query constraint block.";
        console.error(err);
    }
});
