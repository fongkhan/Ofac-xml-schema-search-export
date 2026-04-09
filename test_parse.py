import xml.etree.ElementTree as ET
import sys
import json

def elem_to_dict(elem, references):
    d = {}
    if elem.text and elem.text.strip():
        d['text'] = elem.text.strip()
    for k, v in elem.attrib.items():
        if k.endswith('ID') and not k == 'ID':
            ref_type = k[:-2]
            # Some attributes like 'EntryEventTypeID' map to 'EntryEventType'
            if ref_type in references and v in references[ref_type]:
                d[k] = {"id": v, "value": references[ref_type][v]}
            else:
                # fallbacks
                found = False
                for r_type, r_dict in references.items():
                    if v in r_dict:
                        d[k] = {"id": v, "value": f"[{r_type}] {r_dict[v]}"}
                        found = True
                        break
                if not found:
                    d[k] = v
        else:
            d[k] = v
            
    for child in elem:
        tag = child.tag.split('}')[-1]
        child_dict = elem_to_dict(child, references)
        if tag not in d:
            d[tag] = []
        d[tag].append(child_dict)
    return d

def test_load():
    context = ET.iterparse('sdn_advanced.xml', events=('start', 'end'))
    references = {}
    in_ref = False
    
    for event, elem in context:
        tag = elem.tag.split('}')[-1]
        
        if event == 'start' and tag == 'ReferenceValueSets':
            in_ref = True
            
        if event == 'end' and in_ref and tag == 'ReferenceValueSets':
            for value_set in list(elem):
                vs_tag = value_set.tag.split('}')[-1]
                # Sometimes it's something like EntryEventTypeValues -> EntryEventType
                base_tag = vs_tag.replace('Values', '')
                if base_tag not in references:
                    references[base_tag] = {}
                for child in list(value_set):
                    if 'ID' in child.attrib:
                        id_val = child.attrib['ID']
                        if child.text and child.text.strip():
                            val = child.text.strip()
                        elif 'Description' in child.attrib:
                            val = child.attrib['Description']
                        else:
                            val = str(child.attrib)
                        references[base_tag][id_val] = val
            elem.clear()
            in_ref = False
            
        if event == 'end' and tag == 'Profile':
            pid = elem.attrib.get('ID')
            print("Found profile", pid)
            d = elem_to_dict(elem, references)
            print(json.dumps(d, indent=2))
            break
            
test_load()
