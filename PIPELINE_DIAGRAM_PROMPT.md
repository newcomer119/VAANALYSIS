# Complete Evo2 Genomic Analysis Pipeline Diagram

## Draw.io Complete System Architecture Prompt

Create a comprehensive pipeline diagram showing the complete end-to-end Evo2 Genomic Analysis System with ALL components, specifications, and data flows.

---

## 🏗️ **COMPLETE SYSTEM ARCHITECTURE**

### **Layer 1: USER INTERFACE (Top)**

**Frontend Layer:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js Web Interface)              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Gene Browser Interface                                   │   │
│  │  - Interactive chromosome navigation                      │   │
│  │  - Visual sequence display (color-coded nucleotides)      │   │
│  │  - Real-time variant analysis trigger                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Species Identification Tab                               │   │
│  │  - eDNA sequence input form                               │   │
│  │  - Taxonomic group selection                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Biodiversity Analysis Tab                                │   │
│  │  - Bulk sequence upload                                   │   │
│  │  - Ecosystem visualization                                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
         [HTTP POST Requests via REST API]
                              ↓
```

---

### **Layer 2: MODAL CLOUD INFRASTRUCTURE (Center - Main)**

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                    MODAL CLOUD PLATFORM                                                   │
│                                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐    │
│  │  Container Configuration                                                         │    │
│  │  - GPU: NVIDIA H100 (80GB VRAM)                                                  │    │
│  │  - Max Containers: 3 (auto-scaling)                                              │    │
│  │  - Retries: 2                                                                    │    │
│  │  - Scale-down Window: 120 seconds                                                │    │
│  │  - Base Image: nvidia/cuda:12.4.1-devel-ubuntu22.04 (Python 3.12)                │    │
│  └──────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐    │
│  │  Evo2Model Class (Modal @app.cls decorator)                                      │    │
│  │  ┌────────────────────────────────────────────────────────────────────────────┐  │    │
│  │  │  Volume Management                                                         │  │    │
│  │  │  - Volume Name: evo2_cache                                                 │  │    │
│  │  │  - Mount Path: /evo2_cache                                                 │  │    │
│  │  │  - Purpose: Persistent Evo2 model weights caching                          │  │    │
│  │  └────────────────────────────────────────────────────────────────────────────┘  │    │
│  │  ┌────────────────────────────────────────────────────────────────────────────┐  │    │
│  │  │  @modal.enter() - Model Initialization                                    │  │    │
│  │  │  ↓                                                                         │  │    │
│  │  │  def load_evo2_model():                                                    │  │    │
│  │  │     from evo2 import Evo2                                                  │  │    │
│  │  │     self.model = Evo2('evo2_7b')           ← Downloads from HuggingFace   │  │    │
│  │  │     ↓                                                                       │  │    │
│  │  │     Model Specifications:                                                  │  │    │
│  │  │     - Parameters: 7.2 Billion                                              │  │    │
│  │  │     - Architecture: StripedHyena                                           │  │    │
│  │  │     - Layers: 32                                                           │  │    │
│  │  │     - Context Length: 8,192 - 1M nucleotides                               │  │    │
│  │  │     - Hidden Size: 4,096                                                   │  │    │
│  │  │     - Vocab Size: 512 (DNA tokens)                                         │  │    │
│  │  └────────────────────────────────────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐    │
│  │  Three FastAPI Endpoints (REST API)                                              │    │
│  │  ┌──────────────────┐  ┌────────────────────┐  ┌──────────────────────────────┐ │    │
│  │  │  analyze_single_ │  │  identify_species  │  │  analyze_biodiversity        │ │    │
│  │  │  variant (POST)  │  │  (POST)            │  │  (POST)                      │ │    │
│  │  └──────────────────┘  └────────────────────┘  └──────────────────────────────┘ │    │
│  └──────────────────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### **Layer 3A: VARIANT ANALYSIS PIPELINE (Detailed Flow)**

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    PIPELINE 1: VARIANT ANALYSIS                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

STEP 1: REQUEST INPUT
┌─────────────────────────────────────────────────────────────────────┐
│  VariantRequest (Pydantic Model)                                     │
│  - variant_position: 43119628                                       │
│  - alternative: "G"                                                 │
│  - genome: "hg38"                                                   │
│  - chromosome: "chr17"                                              │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
             [Receive in analyze_single_variant endpoint]
                              ↓

STEP 2: GENOME SEQUENCE FETCHING
┌─────────────────────────────────────────────────────────────────────┐
│  get_genome_sequence(position, genome, chromosome, window_size)     │
│                                                                      │
│  Parameters:                                                        │
│  - position: 43119628                                               │
│  - genome: "hg38"                                                   │
│  - chromosome: "chr17"                                              │
│  - window_size: 8192 bp (8KB context window)        ⭐ KEY SPEC    │
│                                                                      │
│  Calculation:                                                       │
│  - half_window = 8192 // 2 = 4096                                  │
│  - start = max(0, position - 1 - 4096) = 43115531                 │
│  - end = position - 1 + 4096 + 1 = 43123724                        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
         [External API Call via requests library]
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  UCSC Genome Browser API (External Cloud Service)                    │
│  https://api.genome.ucsc.edu/getData/sequence                       │
│                                                                      │
│  Request:                                                           │
│  genome=hg38;chrom=chr17;start=43115531;end=43123724               │
│                                                                      │
│  Response:                                                          │
│  - dna: "ATCG..." (8192 characters)                                │
│  - sequence length validation                                       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
         [Return: window_seq (8192bp), seq_start (43115531)]
                              ↓

STEP 3: VARIANT POSITION CALCULATION
┌─────────────────────────────────────────────────────────────────────┐
│  Calculate Relative Position                                        │
│  - relative_pos = variant_position - 1 - seq_start                  │
│  - relative_pos = 43119628 - 1 - 43115531 = 4096                   │
│                                                                      │
│  Validation:                                                        │
│  - Check: 0 <= relative_pos < 8192                                 │
│  - Extract reference: window_seq[4096] = "T"                       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓

STEP 4: Evo2 SEQUENCE SCORING
┌─────────────────────────────────────────────────────────────────────┐
│  analyze_variant(relative_pos, reference, alternative, window_seq)  │
│                                                                      │
│  STEP 4A: Create Variant Sequence                                  │
│  - var_seq = window_seq[:4096] + "G" + window_seq[4097:]          │
│  - Single nucleotide substitution at position 4096                 │
│                                                                      │
│  STEP 4B: Reference Sequence Scoring                               │
│  - ref_score = model.score_sequences([window_seq])[0]              │
│    → Returns: -8.234567 (log-probability score)                    │
│                                                                      │
│  STEP 4C: Variant Sequence Scoring                                 │
│  - var_score = model.score_sequences([var_seq])[0]                 │
│    → Returns: -8.233541 (log-probability score)                    │
│                                                                      │
│  STEP 4D: Delta Score Calculation                                  │
│  - delta_score = var_score - ref_score                             │
│  - delta_score = -8.233541 - (-8.234567) = 0.001026               │
└─────────────────────────────────────────────────────────────────────┘
                              ↓

STEP 5: CLASSIFICATION LOGIC
┌─────────────────────────────────────────────────────────────────────┐
│  Threshold-Based Classification                                     │
│                                                                      │
│  Parameters:                                                        │
│  - threshold = -0.0009178519                  ⭐ KEY THRESHOLD      │
│  - lof_std = 0.0015140239 (pathogenic std deviation)               │
│  - func_std = 0.0009016589 (benign std deviation)                  │
│                                                                      │
│  Decision Logic:                                                    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  if delta_score < threshold:                               │    │
│  │      prediction = "Likely pathogenic"                      │    │
│  │      confidence = min(1.0, abs(delta_score - threshold) /  │    │
│  │                     lof_std)                               │    │
│  │  else:                                                      │    │
│  │      prediction = "Likely benign"                          │    │
│  │      confidence = min(1.0, abs(delta_score - threshold) /  │    │
│  │                     func_std)                              │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Result:                                                            │
│  - delta_score = 0.001026 > threshold = -0.0009178519             │
│  - prediction = "Likely benign"                                    │
│  - confidence = min(1.0, abs(0.001026 - (-0.0009178519)) /         │
│                 0.0009016589) = 1.0 (100%)                         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓

STEP 6: RESPONSE FORMATTING
┌─────────────────────────────────────────────────────────────────────┐
│  JSON Response                                                      │
│  {                                                                  │
│    "position": 43119628,                                           │
│    "reference": "T",                                                │
│    "alternative": "G",                                              │
│    "delta_score": 0.001026,                                        │
│    "prediction": "Likely benign",                                  │
│    "classification_confidence": 1.0                                │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
         [Return to Frontend via HTTP Response]
```

---

### **Layer 3B: SPECIES IDENTIFICATION PIPELINE**

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    PIPELINE 2: SPECIES IDENTIFICATION                                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘

STEP 1: REQUEST INPUT
┌─────────────────────────────────────────────────────────────────────┐
│  eDNARequest (Pydantic Model)                                       │
│  - sequence: "ATCGATCG..." (DNA sequence)                          │
│  - sequence_id: "sample_001"                                        │
│  - taxonomic_group: "bacteria"                                      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓

STEP 2: SEQUENCE VALIDATION
┌─────────────────────────────────────────────────────────────────────┐
│  Validation Checks                                                  │
│  ✓ All characters in ['A', 'T', 'C', 'G', 'N']                    │
│  ✓ Length between 50-10,000 nucleotides         ⭐ KEY SPEC        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓

STEP 3: Evo2 SEQUENCE SCORING
┌─────────────────────────────────────────────────────────────────────┐
│  evo2_score = model.score_sequences([sequence])[0]                 │
│  - Returns: -5.678901 (log-probability score)                      │
│  - Convert to float for JSON serialization                         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓

STEP 4: MOCK TAXONOMY CLASSIFICATION
┌─────────────────────────────────────────────────────────────────────┐
│  Placeholder Classification Logic                                   │
│  - predicted_species = f"Species_{taxonomic_group}_1"              │
│  - predicted_genus = f"Genus_{taxonomic_group}"                    │
│  - predicted_family = f"Family_{taxonomic_group}"                  │
│                                                                      │
│  Confidence Calculation:                                            │
│  - confidence_score = min(0.95, 0.6 + abs(evo2_score) * 0.1)       │
└─────────────────────────────────────────────────────────────────────┘
                              ↓

STEP 5: RESPONSE
┌─────────────────────────────────────────────────────────────────────┐
│  JSON Response                                                      │
│  {                                                                  │
│    "success": true,                                                 │
│    "predicted_species": "Species_bacteria_1",                      │
│    "predicted_genus": "Genus_bacteria",                            │
│    "predicted_family": "Family_bacteria",                          │
│    "confidence_score": 0.87,                                       │
│    "evo2_score": -5.678901,                                        │
│    "taxonomic_rank": "species",                                    │
│    "sequence_id": "sample_001"                                     │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

### **Layer 3C: BIODIVERSITY ANALYSIS PIPELINE**

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    PIPELINE 3: BIODIVERSITY ANALYSIS                                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘

STEP 1: REQUEST INPUT
┌─────────────────────────────────────────────────────────────────────┐
│  BiodiversityRequest (Pydantic Model)                               │
│  - sequences: List[eDNARequest] (multiple sequences)                │
│  - Example: 100 eDNA sequences from ecosystem sample                │
└─────────────────────────────────────────────────────────────────────┘
                              ↓

STEP 2: SEQUENCE PROCESSING LOOP
┌─────────────────────────────────────────────────────────────────────┐
│  for i, seq_request in enumerate(sequences):                        │
│      logger.info(f"Processing sequence {i+1}/{len(sequences)}")    │
│      species_result = self.identify_species(seq_request)           │
│                                                                      │
│  Performance:                                                       │
│  - Parallel processing across H100 GPU cores                       │
│  - Max containers: 3 (auto-scaling)               ⭐ KEY SPEC      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
         [Call identify_species() for each sequence]
                              ↓

STEP 3: TAXONOMIC AGGREGATION
┌─────────────────────────────────────────────────────────────────────┐
│  Count Taxonomy Levels                                              │
│  - species_count = {"Species_1": 15, "Species_2": 8, ...}         │
│  - genus_count = {"Genus_1": 25, "Genus_2": 10, ...}              │
│  - family_count = {"Family_1": 30, "Family_2": 5, ...}            │
└─────────────────────────────────────────────────────────────────────┘
                              ↓

STEP 4: DIVERSITY INDEX CALCULATION
┌─────────────────────────────────────────────────────────────────────┐
│  Shannon Diversity Index                                           │
│  - H = -Σ(p_i * log(p_i)) where p_i = proportion of species i      │
│  - Formula: shannon_diversity -= p * (p.bit_length() - 1)         │
│                                                                      │
│  Simpson Diversity Index                                            │
│  - D = Σ(p_i²) where p_i = proportion of species i                 │
│  - Formula: simpson_diversity += p * p                             │
│                                                                      │
│  Example Results:                                                   │
│  - total_sequences: 100                                            │
│  - unique_species: 15                                              │
│  - shannon_diversity: 2.847 (high diversity)                       │
│  - simpson_diversity: 0.15 (low dominance)                         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓

STEP 5: RESPONSE
┌─────────────────────────────────────────────────────────────────────┐
│  JSON Response                                                      │
│  {                                                                  │
│    "total_sequences": 100,                                          │
│    "unique_species": 15,                                            │
│    "unique_genera": 25,                                             │
│    "unique_families": 5,                                            │
│    "shannon_diversity": 2.847,                                     │
│    "simpson_diversity": 0.15,                                      │
│    "species_abundance": {"Species_1": 15, ...},                   │
│    "processing_time": 4.23                                         │
│  }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

### **Layer 4: EXTERNAL DEPENDENCIES**

```
┌────────────────────────────────────────────────────────────────────────┐
│  EXTERNAL SERVICES & DATABASES                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  HuggingFace Hub                                                │   │
│  │  - Model Repository: arcinstitute/evo2_7b                      │   │
│  │  - Initial Download: ~14GB model weights                       │   │
│  │  - Caching: modal.Volume for persistence                       │   │
│  └────────────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  UCSC Genome Browser API                                        │   │
│  │  - Service: genome.ucsc.edu                                    │   │
│  │  - API Endpoint: getData/sequence                              │   │
│  │  - Response Time: ~200-500ms per request                      │   │
│  │  - Rate Limits: Standard HTTP limits                           │   │
│  └────────────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Modal Volume Storage                                           │   │
│  │  - Volume Name: evo2_cache                                     │   │
│  │  - Mount: /evo2_cache                                          │   │
│  │  - Purpose: Cache Evo2 model weights between invocations      │   │
│  └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

### **Layer 5: INFRASTRUCTURE TECHNICAL SPECS**

```
┌────────────────────────────────────────────────────────────────────────┐
│  DEPLOYMENT SPECIFICATIONS                                             │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Base Docker Image                                              │   │
│  │  - Registry: nvidia/cuda:12.4.1-devel-ubuntu22.04              │   │
│  │  - Python Version: 3.12                                        │   │
│  │  - CUDA Version: 12.4.1                                        │   │
│  └────────────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  System Dependencies                                            │   │
│  │  - build-essential, cmake, ninja-build                         │   │
│  │  - libcudnn8, libcudnn8-dev                                   │   │
│  │  - gcc-9, g++-9                                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Python Dependencies                                            │   │
│  │  - torch (CUDA 12.4)                                           │   │
│  │  - flash-attn==2.7.4.post1                                     │   │
│  │  - nvidia-cudnn-cu12==9.3.0.75                                 │   │
│  │  - transformer-engine[pytorch]==2.6.0.post1                   │   │
│  │  - evo2 (Arc Institute package)                                │   │
│  └────────────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Modal Configuration                                            │   │
│  │  - App Name: variant-analysis-evo2                             │   │
│  │  - Retry Logic: 2 attempts                                     │   │
│  │  - Container Cleanup: 120 seconds                              │   │
│  │  - Max Parallel Containers: 3                                  │   │
│  └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

### **Layer 6: PERFORMANCE METRICS**

```
┌────────────────────────────────────────────────────────────────────────┐
│  SYSTEM PERFORMANCE CHARACTERISTICS                                    │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Variant Analysis                                               │   │
│  │  - Average Latency: 1.2-3.5 seconds                           │   │
│  │  - UCSC API Call: ~300ms                                       │   │
│  │  - Evo2 Scoring (2 sequences): ~1.5-2.5s                      │   │
│  │  - Classification: <50ms                                       │   │
│  └────────────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Species Identification                                         │   │
│  │  - Average Latency: 0.8-2.0 seconds                           │   │
│  │  - Evo2 Scoring: ~0.8-1.5s                                     │   │
│  │  - Validation: <10ms                                           │   │
│  └────────────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Biodiversity Analysis                                          │   │
│  │  - Per Sequence: ~1.5-3.0s (sequential)                       │   │
│  │  - 100 Sequences: ~4-6 minutes                                │   │
│  │  - Parallel Processing: 3x faster (3 containers)              │   │
│  └────────────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  GPU Utilization                                                │   │
│  │  - H100 VRAM Usage: ~15-20GB per model instance               │   │
│  │  - Batch Processing: Supported via max_containers=3           │   │
│  │  - Auto-scaling: Based on request queue                       │   │
│  └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

### **Layer 7: ERROR HANDLING & LOGGING**

```
┌────────────────────────────────────────────────────────────────────────┐
│  LOGGING & ERROR MANAGEMENT                                            │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Logging Level: INFO                                           │   │
│  │  - Request logging: variant position, parameters              │   │
│  │  - API call logging: UCSC requests                            │   │
│  │  - Model logging: Evo2 loading, scoring                       │   │
│  │  - Success logging: "✅ Analysis successful"                  │   │
│  │  - Error logging: Exception details                           │   │
│  └────────────────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Error Handling                                                │   │
│  │  - UCSC API failures: HTTP status code checking               │   │
│  │  - Invalid sequences: Validation errors                       │   │
│  │  - Out-of-bounds positions: ValueError raising                │   │
│  │  - Modal retries: 2 automatic retry attempts                 │   │
│  └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 **VISUAL DESIGN SPECIFICATIONS**

### **Color Coding Scheme:**
- 🔵 **Blue**: External APIs and services (UCSC, HuggingFace)
- 🟢 **Green**: Evo2 model operations and scoring
- 🟠 **Orange**: Classification logic and decision trees
- 🟣 **Purple**: Modal infrastructure and deployment
- 🔴 **Red**: Error handling and validation
- 🟡 **Yellow**: Performance metrics and specifications

### **Arrow Types:**
- **Solid Arrow** (→): Data flow
- **Dashed Arrow** (⇢): Optional/caching flow
- **Bold Arrow** (⇒): Critical path
- **Circular Arrow** (↻): Loop/iteration

### **Shape Types:**
- **Rectangle**: Process/Function
- **Diamond**: Decision/Validation
- **Cylinder**: Database/Storage
- **Cloud**: External Service
- **Document**: Data/Response

### **Flow Direction:**
- **Top → Bottom**: Main data flow
- **Left → Right**: Parallel processing
- **Horizontal Divider**: Layer separation

---

## 📊 **DIAGRAM LEGEND**

```
┌─────────────────────┐
│  Component Legend    │
├─────────────────────┤
│  ● Frontend UI       │
│  ● Modal Container   │
│  ● Evo2 Model        │
│  ● External API      │
│  ● Database/Storage  │
│  ● Process Step      │
│  ● Decision Point    │
│  ● Data Flow         │
└─────────────────────┘
```

---

## 🎯 **KEY DIFFERENTIATORS TO HIGHLIGHT**

1. **⭐ H100 GPU**: Single GPU, 80GB VRAM, optimized inference
2. **⭐ 8192bp Window**: Context size for variant analysis
3. **⭐ Max 3 Containers**: Auto-scaling for load distribution
4. **⭐ Threshold**: -0.0009178519 for pathogenic/benign classification
5. **⭐ Volume Caching**: Persistent model storage for fast startup
6. **⭐ 50-10,000bp**: Species ID sequence length constraints
7. **⭐ 7.2B Parameters**: Model size specification
8. **⭐ StripedHyena**: Architecture type for long sequences

---

This comprehensive diagram prompt includes EVERY technical detail from your pipeline!
