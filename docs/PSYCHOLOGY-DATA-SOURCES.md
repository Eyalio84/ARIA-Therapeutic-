# Psychology & Mental Health Data Sources — Comprehensive Reference

**Purpose**: External structured data, APIs, and datasets available for the Aria therapeutic game engine.
**Last Updated**: 2026-03-22

---

## Quick Reference

| Source | Type | Free? | Format | Best For |
|--------|------|-------|--------|----------|
| ICD-11 API | Classification API | Yes | JSON | Disorder taxonomy, codes |
| SNOMED CT | Clinical ontology | Free (registration) | RF2/JSON | Clinical concepts, symptoms |
| PHQ-9 / GAD-7 / PCL-5 | Assessment scales | Public domain | Text/JSON | Depression, anxiety, PTSD screening |
| WHO GHO API | Statistics API | Yes | JSON/CSV | Global mental health stats |
| NIMH Data Archive | Research datasets | Free (registration) | CSV/TSV | Clinical trial data, neuroimaging |
| Crisis Text Line (open data) | NLP dataset | Application required | CSV | Crisis conversation patterns |
| MDKG (Nature 2025) | Knowledge graph | Research access | TSV/RDF | 10M+ relations, disorder associations |
| DSM-5 / ICD-11 crosswalk | Mapping table | Published | Table | Diagnosis code mapping |
| SAMHSA NSDUH | Survey data | Public | CSV/SAS | US substance use + mental health stats |
| HuggingFace clinical NLP | Pre-trained models | Open source | PyTorch | Sentiment, entity extraction |
| LOINC | Lab/clinical codes | Free (registration) | CSV | Assessment tool coding |
| RxNorm | Medication ontology | Free | JSON API | Treatment/medication data |
| OpenICPSR mental health | Curated datasets | Free/mixed | Various | Research replication data |

---

## 1. ICD-11 API (WHO)

**What it is**: The International Classification of Diseases, 11th Revision. The global standard for diagnostic classification. Chapter 06 covers "Mental, behavioural or neurodevelopmental disorders."

**What you get**:
- Full disorder taxonomy with parent/child relationships
- Diagnostic codes (e.g., 6A70 = Generalized anxiety disorder)
- Descriptions, inclusions, exclusions
- Coding rules and guidelines
- Available in 18+ languages

**How to access**:

1. **Register** at https://icd.who.int/icdapi
2. Get your `client_id` and `client_secret`
3. Get an OAuth2 token:

```bash
curl -X POST https://icd.who.int/icdapi/token \
  -d "client_id=YOUR_ID&client_secret=YOUR_SECRET&scope=icdapi_access&grant_type=client_credentials"
```

4. Query the API:

```bash
# Get all mental health disorders (Chapter 06)
curl -H "Authorization: Bearer TOKEN" \
  -H "Accept: application/json" \
  -H "Accept-Language: en" \
  -H "API-Version: v2" \
  "https://id.who.int/icd/release/11/2024-01/mms/BlockL1-6A0"

# Search for a specific disorder
curl -H "Authorization: Bearer TOKEN" \
  "https://id.who.int/icd/release/11/2024-01/mms/search?q=depression&subtreeFilterUsesFoundationDescendants=false&includeKeywordResult=false&useFlexiSearch=false&flatResults=true"

# Get a specific entity
curl -H "Authorization: Bearer TOKEN" \
  "https://id.who.int/icd/release/11/2024-01/mms/1563440232"
```

**Response format** (JSON):
```json
{
  "@id": "http://id.who.int/icd/release/11/2024-01/mms/1563440232",
  "title": { "@language": "en", "@value": "Depressive disorders" },
  "definition": { "@language": "en", "@value": "..." },
  "child": ["url1", "url2", ...],
  "parent": ["url"],
  "codingNote": "..."
}
```

**License**: Free for non-commercial use. Commercial use requires WHO licensing agreement.

**Best for our project**: Building the disorder taxonomy in the therapy KG. Replacing hardcoded disorder lists with authoritative WHO classifications.

---

## 2. SNOMED CT (Systematized Nomenclature of Medicine)

**What it is**: The most comprehensive clinical terminology system. 350,000+ concepts covering symptoms, diagnoses, procedures, body structures, and more.

**What you get**:
- Clinical concept hierarchy (IS-A relationships)
- Symptom-to-disorder mappings
- Treatment-to-disorder associations
- Multi-axial classification

**How to access**:

1. **Register** at https://www.nlm.nih.gov/snomed/snomed_main.html (US) or your national release center
2. Download the International Release (RF2 format) or use the FHIR terminology server
3. **FHIR API** (easiest):

```bash
# Search for mental health concepts
curl "https://snowstorm.ihtsdotools.org/browser/MAIN/concepts?term=anxiety+disorder&limit=20"

# Get concept details
curl "https://snowstorm.ihtsdotools.org/browser/MAIN/concepts/197480006"

# Get relationships (what does this concept relate to?)
curl "https://snowstorm.ihtsdotools.org/browser/MAIN/concepts/197480006/relationships"
```

**License**: Free for use in IHTSDO member countries (includes US, UK, AU, etc.). Non-member countries need a license.

**Best for our project**: Mapping symptoms to disorders for NPC design. When a user's behavior in-game maps to a clinical symptom, SNOMED CT provides the authoritative link.

---

## 3. Public Domain Assessment Scales

These instruments are **public domain** — no copyright, free to use, reproduce, and adapt.

### PHQ-9 (Patient Health Questionnaire-9)
- **Measures**: Depression severity (0-27)
- **Items**: 9 questions, each 0-3
- **Cutoffs**: 5 (mild), 10 (moderate), 15 (moderately severe), 20 (severe)
- **Item 9**: Suicidal ideation screen — any score > 0 requires follow-up
- **Download**: https://www.phqscreeners.com/ (free registration)
- **Already extracted**: `backend/data/psychology/assessment_scales.json`
- **Languages**: Translated into 80+ languages
- **Citation**: Kroenke K, Spitzer RL, Williams JB. The PHQ-9. J Gen Intern Med. 2001;16(9):606-613.

### GAD-7 (Generalized Anxiety Disorder-7)
- **Measures**: Anxiety severity (0-21)
- **Items**: 7 questions, each 0-3
- **Cutoffs**: 5 (mild), 10 (moderate), 15 (severe)
- **Download**: Same site as PHQ-9
- **Already extracted**: `backend/data/psychology/assessment_scales.json`
- **Citation**: Spitzer RL, Kroenke K, Williams JB, Lowe B. A brief measure for assessing GAD. Arch Intern Med. 2006;166(10):1092-1097.

### PCL-5 (PTSD Checklist for DSM-5)
- **Measures**: PTSD symptom severity (0-80)
- **Items**: 20 questions, each 0-4
- **Cutoff**: 31-33 suggests probable PTSD
- **Download**: https://www.ptsd.va.gov/professional/assessment/adult-sr/ptsd-checklist.asp
- **License**: Public domain (developed by VA/NCPTSD)
- **Languages**: 50+ translations available

### C-SSRS (Columbia Suicide Severity Rating Scale)
- **Measures**: Suicidal ideation and behavior
- **Items**: 6 screening questions (yes/no) + intensity subscale
- **Critical for**: Safety detection in our app
- **Download**: https://cssrs.columbia.edu/the-columbia-scale-c-ssrs/
- **License**: Free for clinical/research use (registration required)
- **Languages**: 140+ translations

### ACE Questionnaire (Adverse Childhood Experiences)
- **Measures**: Childhood adversity (0-10 score)
- **Items**: 10 yes/no questions
- **Cutoff**: 4+ ACEs = significantly elevated risk
- **Download**: https://www.cdc.gov/aces/about/ace-questionnaire.html
- **License**: Public domain (CDC)

### WHO-5 Well-Being Index
- **Measures**: General psychological well-being (0-25)
- **Items**: 5 questions, each 0-5
- **Cutoff**: Score < 13 suggests depression screening
- **Download**: https://www.psykiatri-regionh.dk/who-5/
- **License**: Free to use
- **Especially useful for**: Simple session-level wellbeing tracking (alternative to our 1-5 mood scale)

### DASS-21 (Depression Anxiety Stress Scales)
- **Measures**: Depression, anxiety, and stress as 3 separate subscales
- **Items**: 21 questions (7 per subscale), each 0-3
- **Download**: http://www2.psy.unsw.edu.au/dass/
- **License**: Public domain
- **Useful for**: More nuanced than PHQ-9 + GAD-7 combined — covers stress too

### K10 / K6 (Kessler Psychological Distress Scale)
- **Measures**: Non-specific psychological distress
- **Items**: 10 (K10) or 6 (K6), each 1-5
- **Download**: https://www.hcp.med.harvard.edu/ncs/k6_scales.php
- **License**: Public domain
- **Used by**: Australian Bureau of Statistics, US NSDUH

---

## 4. WHO Global Health Observatory (GHO) API

**What it is**: Aggregated health statistics from 194 WHO member states.

**Mental health data available**:
- Mental health workforce per 100,000 (by country)
- Mental health legislation status
- Treatment gap percentages
- Suicide mortality rates (age-standardized)
- Government mental health spending

**How to access**:

```bash
# Mental health indicators
curl "https://ghoapi.azureedge.net/api/Indicator?$filter=contains(IndicatorName,'mental')"

# Suicide rate data
curl "https://ghoapi.azureedge.net/api/MH_12"

# Mental health workers
curl "https://ghoapi.azureedge.net/api/MH_1"

# Filter by country (Israel = ISR)
curl "https://ghoapi.azureedge.net/api/MH_1?$filter=SpatialDim eq 'ISR'"
```

**Format**: JSON (OData standard)
**License**: Open data, free to use with attribution

**Best for our project**: Contextualizing the therapist dashboard with population-level data. "Your patient's depression score is moderate — in Israel, 23% of adults report mental illness."

---

## 5. NIMH Data Archive (NDA)

**What it is**: The largest repository of mental health research data in the world. Contains data from NIMH-funded clinical trials, longitudinal studies, and neuroimaging.

**What you get**:
- Clinical trial outcome data (depression, anxiety, PTSD, etc.)
- Neuroimaging data (fMRI, structural MRI)
- Genomic data
- Demographic + clinical assessment scores
- Longitudinal follow-up data

**How to access**:

1. **Register** at https://nda.nih.gov/
2. Browse collections at https://nda.nih.gov/general-query.html
3. Request data access (usually approved for legitimate research)

**Key collections**:
- **ABCD Study**: 11,800+ children, brain development + mental health
- **HCP** (Human Connectome Project): Brain connectivity data
- **PGC** (Psychiatric Genomics Consortium): Genetic associations

**Format**: CSV, TSV, NIfTI (neuroimaging)
**License**: Free for approved researchers (data use agreement)

**Best for our project**: If building evidence-based content about treatment effectiveness, NDA has the trial data. Not for direct app integration, but for validating our clinical claims.

---

## 6. Crisis Text Line (Open Data)

**What it is**: De-identified conversation data from the Crisis Text Line service (largest crisis intervention text platform).

**What you get**:
- Message-level conversation data
- Crisis counselor techniques used
- Outcome measures
- Texter demographics (anonymized)

**How to access**:

1. Apply at https://www.crisistextline.org/open-data/
2. Requires institutional affiliation and IRB approval
3. Data provided via secure platform

**Format**: CSV
**License**: Research use only, strict data use agreement

**Best for our project**: Training safety detection models. Understanding real crisis conversation patterns to improve our auto-flagging system.

---

## 7. MDKG — Mental Disorders Knowledge Graph (Nature 2025)

**What it is**: A large-scale knowledge graph built from biomedical literature, containing 10M+ relations across mental disorders. Published in Nature Communications 2025.

**What you get**:
- Relations between disorders, symptoms, treatments, genes, brain regions
- Novel associations not found in curated databases
- Contextual features (demographic, comorbidity)
- Applied to UK Biobank with prediction gains

**How to access**:

- **Paper**: "MDKG: A Mental Disorder Knowledge Graph" (Nature Communications, 2025)
- **Data**: Check paper supplementary materials for download links
- **GitHub**: Usually published alongside the paper

**Format**: TSV, RDF triples
**License**: Research use (check paper)

**Best for our project**: The gold standard for mental health KG structure. Could import subsets into our therapy KG for enriched disorder-symptom-treatment mappings.

---

## 8. RxNorm API (NIH/NLM)

**What it is**: Standardized nomenclature for clinical drugs and medication.

**What you get**:
- Drug names (brand + generic)
- Ingredient relationships
- Drug class hierarchies
- NDC codes

**How to access**:

```bash
# Search for a medication
curl "https://rxnav.nlm.nih.gov/REST/drugs.json?name=sertraline"

# Get drug properties
curl "https://rxnav.nlm.nih.gov/REST/rxcui/36567/properties.json"

# Get drug class
curl "https://rxnav.nlm.nih.gov/REST/rxclass/class/byDrugName.json?drugName=fluoxetine&relaSource=ATC"
```

**Format**: JSON
**License**: Free, no registration required
**Docs**: https://rxnav.nlm.nih.gov/RxNormAPIs.html

**Best for our project**: If the therapist dashboard ever includes medication tracking or psychoeducation about medications.

---

## 9. LOINC (Logical Observation Identifiers Names and Codes)

**What it is**: Universal codes for laboratory and clinical observations, including mental health assessment instruments.

**What you get**:
- Standardized codes for PHQ-9, GAD-7, PCL-5, etc.
- Allows interoperability with EHR systems
- Panel definitions (which questions belong to which scale)

**How to access**:

1. **Register** (free) at https://loinc.org/get-started/
2. Download the LOINC table (CSV, 185K+ codes)
3. Or use the FHIR API

**Key codes**:
- PHQ-9: LOINC 44249-1
- GAD-7: LOINC 69737-5
- PCL-5: LOINC 77582-5

**Format**: CSV, FHIR JSON
**License**: Free with attribution

---

## 10. SAMHSA NSDUH (National Survey on Drug Use and Health)

**What it is**: Annual US survey of 70,000+ people on substance use and mental health.

**What you get**:
- Prevalence of mental illness by age, gender, race, state
- Treatment utilization rates
- Co-occurring substance use + mental health
- Suicidal ideation and attempts

**How to access**:

1. Public use data files: https://www.samhsa.gov/data/data-we-collect/nsduh-national-survey-drug-use-and-health
2. Interactive tables: https://pdas.samhsa.gov/saes/
3. No registration needed for public use files

**Format**: SAS, SPSS, Stata, CSV
**License**: Public domain (US government)

---

## 11. HuggingFace Clinical NLP Models

**What it is**: Pre-trained models for clinical text processing.

**Key models for mental health**:

| Model | Task | Size |
|-------|------|------|
| `bhadresh-savani/distilbert-base-uncased-emotion` | Emotion detection (6 classes) | 250MB |
| `cardiffnlp/twitter-roberta-base-sentiment-latest` | Sentiment analysis | 500MB |
| `nlptown/bert-base-multilingual-uncased-sentiment` | Multilingual sentiment (1-5 stars) | 700MB |
| `j-hartmann/emotion-english-distilroberta-base` | 7-emotion classification | 330MB |
| `SamLowe/roberta-base-go_emotions` | 28-emotion GoEmotions | 500MB |

**How to access**:

```python
from transformers import pipeline

# Emotion detection
classifier = pipeline("text-classification", model="j-hartmann/emotion-english-distilroberta-base")
result = classifier("I feel like nobody understands me")
# [{'label': 'sadness', 'score': 0.89}]
```

**License**: Varies per model (most are Apache 2.0 or MIT)

**Best for our project**: Could run on-device for real-time emotion detection from game text input. The Aria voice system could adapt based on detected emotion.

**Note**: These are large models. For our Android/Termux setup, consider:
- DistilBERT variants (smaller)
- ONNX Runtime conversion for speed
- Or use as a server-side component

---

## 12. CBT / DBT / ACT Technique Databases

These aren't formal APIs but structured resources:

### CBT Thought Records
- **Burns' 15 Cognitive Distortions**: Already extracted to `cognitive_distortions.json`
- **Behavioral Activation activity schedules**: Template in NICE guidelines
- **Thought record template**: Situation -> Automatic Thought -> Emotion -> Evidence For -> Evidence Against -> Balanced Thought

### DBT Skills
Structured as 4 modules:
1. **Mindfulness** (What + How skills)
2. **Distress Tolerance** (TIPP, STOP, Pros/Cons, Radical Acceptance)
3. **Emotion Regulation** (ABC PLEASE, Opposite Action, Check the Facts)
4. **Interpersonal Effectiveness** (DEAR MAN, GIVE, FAST)

**Source**: Linehan, M. (2015). DBT Skills Training Manual. (Not public domain — structure is common knowledge, specific worksheets are copyrighted)

### ACT (Acceptance and Commitment Therapy)
6 core processes:
1. Acceptance
2. Cognitive Defusion
3. Being Present
4. Self-as-Context
5. Values
6. Committed Action

**The ACT Matrix** (free tool): https://thehappinesstrap.com/act-made-simple/

### IFS Parts Model
- Already extracted to `ifs_model.json`
- Source: Schwartz, R. Internal Family Systems Therapy

---

## 13. Open Clinical Datasets (Curated List)

| Dataset | Description | Access |
|---------|-------------|--------|
| **DAIC-WOZ** | Depression detection from clinical interviews (video, audio, text) | https://dcapswoz.ict.usc.edu/ |
| **eRisk** | Early risk detection for depression + anorexia from social media | http://erisk.irlab.org/ |
| **CLPsych Shared Tasks** | NLP for mental health (Reddit, ReachOut, etc.) | https://clpsych.org/ |
| **PRISM** | Psychiatric diagnosis from notes | Contact authors |
| **Reddit Mental Health** | Subreddit posts labeled by condition | Multiple HuggingFace datasets |
| **Koko** | Crisis conversation data | https://www.koko.ai/research |
| **PHQ-UKB** | PHQ-9 data from UK Biobank (500K participants) | https://www.ukbiobank.ac.uk/ |

---

## 14. FHIR (Fast Healthcare Interoperability Resources)

**What it is**: The modern healthcare data exchange standard. If you ever integrate with clinical systems (EHRs), FHIR is the protocol.

**Mental health resources in FHIR**:
- `Condition` (disorders)
- `Observation` (assessment scores)
- `CarePlan` (treatment plans)
- `QuestionnaireResponse` (PHQ-9/GAD-7 responses)
- `RiskAssessment` (suicide risk)

**Public FHIR servers for testing**:

```bash
# HAPI FHIR test server
curl "https://hapi.fhir.org/baseR4/Condition?code=http://snomed.info/sct|35489007&_format=json"

# SmartHealthIT sandbox
# Register at https://launch.smarthealthit.org/
```

**Best for our project**: Future integration with clinical EHR systems. The therapist dashboard could eventually push/pull from the patient's medical record.

---

## 15. Practical Recommendations for Aria

### Immediate (can integrate now)

1. **ICD-11 API** — Replace hardcoded disorder lists with WHO taxonomy. One-time bulk import of Chapter 06 into therapy KG.

2. **PCL-5 + C-SSRS** — Add to `assessment_scales.json`. PCL-5 for PTSD-focused cartridges, C-SSRS for safety screening.

3. **WHO-5** — Add as an alternative to our 1-5 mood scale. More validated, 5 items, public domain.

4. **DASS-21** — More nuanced than PHQ-9 + GAD-7 separately. Covers depression + anxiety + stress in one instrument.

### Medium-term (Week 3+)

5. **SNOMED CT via Snowstorm** — Enrich NPC design with clinical symptom mappings. Query symptom hierarchies to inform which NPC archetype fits.

6. **HuggingFace emotion model** — Server-side emotion detection from user's free text input. Feed detected emotions to KG bridge.

7. **RxNorm** — If therapist dashboard adds medication tracking.

### Long-term (post-MVP)

8. **FHIR integration** — Allow therapists to push dashboard data to their EHR.

9. **MDKG import** — Import disorder-symptom-treatment triples into unified KG.

10. **Crisis Text Line data** — Train a custom safety detection model on real crisis conversations.

---

## API Key / Registration Summary

| Source | Registration | API Key? | Approval Time |
|--------|-------------|----------|---------------|
| ICD-11 | https://icd.who.int/icdapi | OAuth2 client credentials | Instant |
| SNOMED CT | https://www.nlm.nih.gov/snomed/ | UMLS account | 1-3 days |
| LOINC | https://loinc.org/get-started/ | None (download) | Instant |
| RxNorm | None needed | None | Instant |
| WHO GHO | None needed | None | Instant |
| NDA | https://nda.nih.gov/ | Data use agreement | 1-2 weeks |
| Crisis Text Line | Application | IRB required | Weeks-months |
| HAPI FHIR | None needed | None | Instant |
| HuggingFace | https://huggingface.co/ | API token (free) | Instant |
| PHQ screeners | https://www.phqscreeners.com/ | None | Instant |
| C-SSRS | https://cssrs.columbia.edu/ | Registration | Instant |

---

*This document should be updated as new sources are discovered or access methods change.*
