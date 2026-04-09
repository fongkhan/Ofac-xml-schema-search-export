// Tabs handling
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.remove('hidden');
    });
});

// Check Server Status
async function checkStatus() {
    try {
        const res = await fetch('/api/status');
        const data = await res.json();
        const statEl = document.getElementById('dbSearchStatus');
        if (data.loaded) {
            statEl.textContent = `Online (${data.profile_count} profiles active)`;
            statEl.style.color = '#7ee787';
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
let currentUniqueRawData = [];

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
            let primaryName = "Unknown Entity";
            const aliases = [];
            
            if (p.Identity) {
                p.Identity.forEach(ident => {
                    if (ident.Alias) {
                        ident.Alias.forEach(al => {
                            let nameText = "";
                            if (al.DocumentedName && al.DocumentedName[0].DocumentedNamePart) {
                                nameText = al.DocumentedName[0].DocumentedNamePart.map(part => {
                                    return part.NamePartValue ? part.NamePartValue.map(v => v.text).join(' ') : "";
                                }).join(' ');
                            }
                            if (al.Primary === "true") {
                                primaryName = nameText;
                            } else {
                                if(nameText) aliases.push(nameText);
                            }
                        });
                    }
                });
            }
            
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
                    const fType = f.FeatureTypeID ? f.FeatureTypeID.value : "Unknown";
                    // Extract version locations or dates
                    let details = "";
                    if (f.FeatureVersion) {
                        f.FeatureVersion.forEach(v => {
                            if (v.VersionLocation && v.VersionLocation[0].LocationID) {
                                let locObj = v.VersionLocation[0].LocationID;
                                let locStr = (typeof locObj === 'object') ? (locObj.value || locObj.id || JSON.stringify(locObj)) : locObj;
                                details += ` Loc: <span class="ref">${locStr}</span>`;
                            }
                            if (v.DatePeriod) {
                                details += " (Has Date Details)";
                            }
                        });
                    }
                    html += `<li class="data-item"><strong>${fType}:</strong> ${details || 'N/A'}</li>`;
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
    
    const rows = [
        ["ID", "Primary_Name", "Type", "Aliases", "Locations", "Features"]
    ];
    
    currentUniqueRawData.forEach(p => {
        let primaryName = "Unknown";
        let aliases = [];
        if (p.Identity) {
            p.Identity.forEach(ident => {
                if (ident.Alias) {
                    ident.Alias.forEach(al => {
                        let nameText = "";
                        if (al.DocumentedName && al.DocumentedName[0].DocumentedNamePart) {
                            nameText = al.DocumentedName[0].DocumentedNamePart.map(part => {
                                return part.NamePartValue ? part.NamePartValue.map(v => v.text).join(' ') : "";
                            }).join(' ');
                        }
                        if (al.Primary === "true") {
                            primaryName = nameText;
                        } else {
                            if(nameText) aliases.push(nameText);
                        }
                    });
                }
            });
        }
        let pType = p.PartySubTypeID ? (p.PartySubTypeID.value || p.PartySubTypeID) : "Unknown";
        
        let locations = [];
        let features = [];
        if (p.Feature) {
            p.Feature.forEach(f => {
                const fType = f.FeatureTypeID ? (f.FeatureTypeID.value || f.FeatureTypeID) : "Unknown";
                if (f.FeatureVersion) {
                    f.FeatureVersion.forEach(v => {
                        let detail = "";
                        if (v.VersionLocation && v.VersionLocation[0].LocationID) {
                            let locObj = v.VersionLocation[0].LocationID;
                            locations.push((typeof locObj === 'object') ? (locObj.value || locObj.id || JSON.stringify(locObj)) : locObj);
                        }
                        if (v.VersionDetail) {
                            v.VersionDetail.forEach(vd => {
                                if (vd.text) detail += vd.text + " ";
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
                        if (detail.trim()) {
                            features.push(`${fType}: ${detail.trim()}`);
                        }
                    });
                }
            });
        }
        
        const clean = (str) => typeof str === 'string' ? `"${str.replace(/"/g, '""')}"` : '""';
        
        rows.push([
            clean(p.ID),
            clean(primaryName),
            clean(pType),
            clean(aliases.join("; ")),
            clean(locations.join("; ")),
            clean(features.join("; "))
        ]);
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
