import sys
import os
import json
import csv
import io
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
import xml.etree.ElementTree as ET

DATA_FILE = "sdn_advanced.xml"
HOST = "0.0.0.0"
PORT = 8000

print("Initializing OFAC Data Server...")

class OFACDatabase:
    def __init__(self):
        self.references = {}
        self.profiles = {}
        self.search_index = []
        self.locations = {}
    
    def load(self, file_path):
        print(f"Loading data from {file_path}")
        context = ET.iterparse(file_path, events=('start', 'end'))
        self.references = {}
        self.profiles = {}
        self.search_index = []
        self.locations = {}
        
        in_ref = False
        in_locs = False
        count = 0
        
        for event, elem in context:
            tag = elem.tag.split('}')[-1]
            
            if event == 'start' and tag == 'ReferenceValueSets':
                in_ref = True
            
            if event == 'start' and tag == 'Locations':
                in_locs = True

            if event == 'end' and in_ref and tag == 'ReferenceValueSets':
                for value_set in list(elem):
                    vs_tag = value_set.tag.split('}')[-1]
                    base_tag = vs_tag.replace('Values', '')
                    if base_tag not in self.references:
                        self.references[base_tag] = {}
                    for child in list(value_set):
                        if 'ID' in child.attrib:
                            id_val = child.attrib['ID']
                            if child.text and child.text.strip():
                                val = child.text.strip()
                            elif 'Description' in child.attrib:
                                val = child.attrib['Description']
                            else:
                                val = str(child.attrib)
                            self.references[base_tag][id_val] = val
                elem.clear()
                in_ref = False

            if event == 'end' and in_locs and tag == 'Location':
                if 'ID' in elem.attrib:
                    id_val = elem.attrib['ID']
                    # Extract location details
                    loc_parts = []
                    ns = elem.tag.split('}')[0] + '}'
                    for p in elem.iter(f"{ns}Value"):
                        if p.text:
                            loc_parts.append(p.text.strip())
                    for p in elem.iter(f"{ns}LocationCountry"):
                        cid = p.attrib.get('CountryID')
                        if cid and cid in self.references.get('Country', {}):
                            loc_parts.append(self.references['Country'][cid])
                    self.locations[id_val] = ", ".join(loc_parts)
                elem.clear()

            if event == 'end' and in_locs and tag == 'Locations':
                in_locs = False
                self.references['Location'] = self.locations
                
            if event == 'end' and tag == 'DistinctParty':
                ns = elem.tag.split('}')[0] + '}'
                prof_elem = elem.find(f'{ns}Profile')
                if prof_elem is None:
                    elem.clear()
                    continue
                    
                pid = prof_elem.attrib.get('ID')
                if not pid:
                    elem.clear()
                    continue
                
                # Extract names for index
                names = []
                for np_val in prof_elem.iter(f"{ns}NamePartValue"):
                    if np_val.text:
                        names.append(np_val.text.strip())
                
                search_text = (" ".join(names) + " " + pid).lower()
                self.search_index.append((search_text, pid))
                
                prof_dict = self._elem_to_dict(prof_elem)
                
                # Extract Comment
                comment_elem = elem.find(f'{ns}Comment')
                if comment_elem is not None and comment_elem.text:
                    prof_dict['DistinctPartyComment'] = comment_elem.text.strip()
                
                self.profiles[pid] = prof_dict
                
                elem.clear()
                count += 1
                if count % 10000 == 0:
                    print(f"Loaded {count} profiles...")
                    
        print(f"Loaded total {count} profiles into memory.")

    def _elem_to_dict(self, elem):
        d = {}
        if elem.text and elem.text.strip():
            d['text'] = elem.text.strip()
        for k, v in elem.attrib.items():
            if k.endswith('ID') and not k == 'ID':
                ref_type = k[:-2]
                if ref_type in self.references and v in self.references[ref_type]:
                    d[k] = {"id": v, "value": self.references[ref_type][v]}
                else:
                    d[k] = v
            else:
                d[k] = v
                
        for child in elem:
            tag = child.tag.split('}')[-1]
            child_dict = self._elem_to_dict(child)
            if tag not in d:
                d[tag] = []
            d[tag].append(child_dict)
        return d

    def search_unique(self, query):
        q = query.lower()
        results = []
        for text, pid in self.search_index:
            if q in text:
                results.append(self.profiles[pid])
                if len(results) >= 50: # Limit results
                    break
        return results

    def get_profile_primary_name(self, profile):
        primary_names = []
        try:
            for identity in profile.get('Identity', []):
                for alias in identity.get('Alias', []):
                    if alias.get('Primary') == 'true':
                        parts = []
                        if alias.get('DocumentedName') and alias['DocumentedName'][0].get('DocumentedNamePart'):
                            for p in alias['DocumentedName'][0]['DocumentedNamePart'][0].get('NamePartValue', []):
                                if 'text' in p:
                                    parts.append(p['text'])
                        if parts:
                            primary_names.append(" ".join(parts))
        except Exception:
            pass
        return "; ".join(primary_names) if primary_names else "Unknown Name"

db = OFACDatabase()
if os.path.exists(DATA_FILE):
    db.load(DATA_FILE)

class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        
        if path == "/api/status":
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "loaded": len(db.profiles) > 0,
                "profile_count": len(db.profiles),
                "feature_types": db.references.get('FeatureType', {})
            }).encode('utf-8'))
            
        elif path == "/api/template":
            self.send_response(200)
            self.send_header('Content-type', 'text/csv')
            self.send_header('Content-Disposition', 'attachment; filename="batch_template.csv"')
            self.end_headers()
            self.wfile.write(b"SearchTerm\n")
            
        elif path == "/api/search/unique":
            query = urllib.parse.parse_qs(parsed_path.query).get('q', [''])[0]
            if query:
                results = db.search_unique(query)
            else:
                results = []
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(results).encode('utf-8'))
            
        elif path == "/":
            self._serve_file("index.html", "text/html")
        elif path == "/style.css":
            self._serve_file("style.css", "text/css")
        elif path == "/script.js":
            self._serve_file("script.js", "application/javascript")
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        
        if path == "/api/search/batch":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            
            # Read CSV
            reader = csv.DictReader(io.StringIO(post_data))
            
            output = io.StringIO()
            writer = csv.writer(output)
            
            feature_schema = db.references.get('FeatureType', {})
            f_names = sorted(list(set(feature_schema.values())))
            
            headers = ["SearchTerm", "Matched", "OFAC_ID", "PrimaryName", "Type", "PartyComment", "Aliases"] + f_names
            writer.writerow(headers)
            
            for row in reader:
                term = row.get("SearchTerm", "").strip()
                if not term:
                    continue
                results = db.search_unique(term)
                if results:
                    for p in results:
                        primary_name = db.get_profile_primary_name(p)
                        
                        pType = p.get("PartySubTypeID", {}).get("value", "") if isinstance(p.get("PartySubTypeID"), dict) else str(p.get("PartySubTypeID", ""))
                        
                        aliases = []
                        for ident in p.get('Identity', []):
                            for alias in ident.get('Alias', []):
                                if alias.get('Primary') != 'true':
                                    parts = []
                                    for part in alias.get('DocumentedName', [])[0].get('DocumentedNamePart', [])[0].get('NamePartValue', []):
                                        if 'text' in part:
                                            parts.append(part['text'])
                                    if parts:
                                        aliases.append(" ".join(parts))
                                        
                        feature_map = {n: [] for n in f_names}
                        
                        for f in p.get('Feature', []):
                            ftype = f.get('FeatureTypeID', {}).get('value', '') if isinstance(f.get('FeatureTypeID'), dict) else str(f.get('FeatureTypeID', ''))
                            
                            for fv in f.get('FeatureVersion', []):
                                detail = ""
                                for loc in fv.get('VersionLocation', []):
                                    locid = loc.get('LocationID', {})
                                    loc_str = locid.get('value') or locid.get('id') if isinstance(locid, dict) else str(locid)
                                    if loc_str:
                                        detail += loc_str + " "
                                for vd in fv.get('VersionDetail', []):
                                    if 'text' in vd:
                                        detail += vd['text'] + " "
                                for dp in fv.get('DatePeriod', []):
                                    start = dp.get('Start', [])
                                    if start and 'From' in start[0]:
                                        from_date = start[0]['From'][0]
                                        y = from_date.get('Year', [{}])[0].get('text', '')
                                        m = from_date.get('Month', [{}])[0].get('text', '')
                                        d = from_date.get('Day', [{}])[0].get('text', '')
                                        date_str = "-".join([x for x in [y, m, d] if x])
                                        detail += date_str + " "
                                
                                if detail.strip() and ftype in feature_map:
                                    feature_map[ftype].append(detail.strip())

                        pComment = p.get('DistinctPartyComment', '')
                        row_data = [
                            term, "Yes", p.get("ID", ""), primary_name, pType, pComment, "; ".join(aliases)
                        ]
                        for fn in f_names:
                            row_data.append("; ".join(feature_map[fn]))

                        writer.writerow(row_data)
                else:
                    null_row = [term, "No", "", "", "", "", ""] + [""] * len(f_names)
                    writer.writerow(null_row)
                    
            self.send_response(200)
            self.send_header('Content-type', 'text/csv')
            self.send_header('Content-Disposition', 'attachment; filename="batch_results.csv"')
            self.end_headers()
            self.wfile.write(output.getvalue().encode('utf-8'))

        elif path == "/api/upload":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            # Simple direct overwrite for the demo.
            with open(DATA_FILE, "wb") as f:
                f.write(post_data)
                
            db.load(DATA_FILE)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "message": "XML Uploaded and database restarted!"}).encode('utf-8'))

        else:
            self.send_response(404)
            self.end_headers()

    def _serve_file(self, filename, content_type):
        if os.path.exists(filename):
            self.send_response(200)
            self.send_header('Content-type', content_type)
            self.end_headers()
            with open(filename, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == "__main__":
    server = HTTPServer((HOST, PORT), RequestHandler)
    print(f"HTTP Server running at http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    server.server_close()
