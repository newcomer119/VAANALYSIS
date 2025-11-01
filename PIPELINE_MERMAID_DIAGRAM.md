# Evo2 Genomic Analysis Pipeline - Mermaid Diagram

## Complete System Architecture Diagram

```mermaid
graph TB
    subgraph "Layer 1: Frontend Interface"
        FE1[Gene Browser Interface<br/>Interactive navigation<br/>Sequence display]
        FE2[Species ID Tab<br/>eDNA input form<br/>Taxonomic selection]
        FE3[Biodiversity Tab<br/>Bulk upload<br/>Ecosystem visualization]
    end

    subgraph "Layer 2: Modal Cloud Platform"
        subgraph "Container Config"
            CC[GPU: H100 80GB<br/>Max Containers: 3<br/>Retries: 2<br/>Scale-down: 120s<br/>CUDA 12.4.1]
        end
        
        subgraph "Evo2Model Class"
            VM[Volume: evo2_cache<br/>Mount: /evo2_cache]
            ME[@modal.enter<br/>load_evo2_model]
            
            subgraph "Evo2 Model Specs"
                ES[7.2B Parameters<br/>StripedHyena Architecture<br/>32 Layers<br/>Context: 8K-1M nt<br/>Hidden: 4096<br/>Vocab: 512]
            end
        end
        
        subgraph "API Endpoints"
            API1[analyze_single_variant<br/>POST]
            API2[identify_species<br/>POST]
            API3[analyze_biodiversity<br/>POST]
        end
    end

    subgraph "Pipeline 1: Variant Analysis"
        V1[Input: position, alt, genome, chr]
        V2[get_genome_sequence<br/>window_size=8192 bp]
        V3{UCSC API Call}
        V4[Calculate relative_pos<br/>Extract reference]
        V5[Create variant sequence]
        V6[Evo2: score ref sequence]
        V7[Evo2: score var sequence]
        V8[delta_score calculation]
        V9{Classification Logic<br/>threshold=-0.0009178519}
        V10[JSON Response<br/>prediction, confidence]
        
        V1 --> V2 --> V3 --> V4 --> V5 --> V6 --> V7 --> V8 --> V9 --> V10
    end

    subgraph "Pipeline 2: Species Identification"
        S1[eDNA Input<br/>sequence, id, group]
        S2{Validation<br/>50-10K nt}
        S3[Evo2: score sequence]
        S4[Mock taxonomy classification]
        S5[JSON Response<br/>species, genus, family]
        
        S1 --> S2 --> S3 --> S4 --> S5
    end

    subgraph "Pipeline 3: Biodiversity Analysis"
        B1[Multiple eDNA sequences]
        B2[Loop: identify_species per seq<br/>Max 3 containers parallel]
        B3[Aggregate taxonomy counts]
        B4[Calculate Shannon Index<br/>Calculate Simpson Index]
        B5[JSON Response<br/>diversity indices, abundance]
        
        B1 --> B2 --> B3 --> B4 --> B5
    end

    subgraph "Layer 4: External Services"
        HF[HuggingFace Hub<br/>arcinstitute/evo2_7b<br/>~14GB weights]
        UC[UCSC Genome Browser<br/>api.genome.ucsc.edu<br/>~300ms response]
        VOL[Modal Volume Storage<br/>Persistent caching]
    end

    FE1 --> API1
    FE2 --> API2
    FE3 --> API3
    
    API1 --> V1
    API2 --> S1
    API3 --> B1
    
    CC --> ME --> ES
    ME --> VM
    VM -.caches.-> VOL
    
    ME -.downloads.-> HF
    V3 --> UC
    
    V6 -.uses.-> ES
    V7 -.uses.-> ES
    S3 -.uses.-> ES
    
    style FE1 fill:#e1f5ff
    style FE2 fill:#e1f5ff
    style FE3 fill:#e1f5ff
    
    style CC fill:#f0d0ff
    style ME fill:#d4ffd4
    style ES fill:#d4ffd4
    
    style API1 fill:#ffd0d0
    style API2 fill:#ffd0d0
    style API3 fill:#ffd0d0
    
    style V9 fill:#ffe0c0
    style S2 fill:#ffe0c0
    
    style HF fill:#c0c0ff
    style UC fill:#c0c0ff
    style VOL fill:#c0c0ff
```

---

## Alternative: Simplified Overview Diagram

```mermaid
graph LR
    subgraph "User Interface"
        UI[Next.js Frontend]
    end
    
    subgraph "Modal Cloud H100 GPU"
        subgraph "Endpoints"
            V[Variant Analysis]
            S[Species ID]
            B[Biodiversity]
        end
        
        subgraph "Evo2 7B Model"
            E[StripedHyena<br/>7.2B params<br/>8K-1M context]
        end
    end
    
    subgraph "External Services"
        UC[UCSC API]
        HF[HuggingFace]
    end
    
    UI --> V
    UI --> S
    UI --> B
    
    V --> E
    S --> E
    B --> E
    
    V -.-> UC
    
    style UI fill:#e1f5ff
    style V fill:#ffd0d0
    style S fill:#ffd0d0
    style B fill:#ffd0d0
    style E fill:#d4ffd4
    style UC fill:#c0c0ff
    style HF fill:#c0c0ff
```

---

## Detailed Variant Analysis Flow

```mermaid
sequenceDiagram
    participant UI as Frontend UI
    participant API as Variant Endpoint
    participant UCSC as UCSC API
    participant Evo2 as Evo2 Model
    participant Logic as Classification Logic
    
    UI->>API: POST {position: 43119628, alt: "G"}
    API->>UCSC: Fetch 8Kbp window
    UCSC-->>API: Return sequence
    API->>API: Calculate relative_pos
    API->>API: Create variant sequence
    
    API->>Evo2: score_sequences(ref_seq)
    Evo2-->>API: ref_score: -8.234567
    
    API->>Evo2: score_sequences(var_seq)
    Evo2-->>API: var_score: -8.233541
    
    API->>Logic: delta_score = var_score - ref_score
    Logic->>Logic: if delta < threshold → pathogenic<br/>else → benign
    
    Logic-->>API: prediction + confidence
    API-->>UI: {prediction: "Likely benign", confidence: 1.0}
```

---

## Complete System Flow

```mermaid
flowchart TD
    Start([User Access]) --> Choose{Analysis Type}
    
    Choose -->|Variant| VA[Variant Analysis Pipeline]
    Choose -->|Species| SA[Species ID Pipeline]
    Choose -->|Biodiversity| BA[Biodiversity Pipeline]
    
    subgraph VA
        VA1[Input Variant Data] --> VA2[Fetch 8Kbp Context from UCSC]
        VA2 --> VA3[Score Reference with Evo2]
        VA3 --> VA4[Score Variant with Evo2]
        VA4 --> VA5[Calculate Delta]
        VA5 --> VA6[Classify: Pathogenic/Benign]
        VA6 --> VA7[Return Result]
    end
    
    subgraph SA
        SA1[Input eDNA Sequence] --> SA2{Validate: 50-10K nt}
        SA2 -->|Valid| SA3[Score with Evo2]
        SA2 -->|Invalid| SA_ERROR[Error Response]
        SA3 --> SA4[Taxonomy Classification]
        SA4 --> SA5[Return Species Result]
    end
    
    subgraph BA
        BA1[Input Multiple Sequences] --> BA2[Loop: Process Each]
        BA2 --> BA3[Call Species ID per Sequence]
        BA3 --> BA4[Calculate Diversity Indices]
        BA4 --> BA5[Return Ecosystem Metrics]
    end
    
    VA7 --> Results[JSON Response]
    SA5 --> Results
    BA5 --> Results
    SA_ERROR --> Error[Error Handler]
    
    Results --> Display[Display in UI]
    Error --> Display
    
    style Start fill:#e1f5ff
    style Choose fill:#ffe0c0
    style VA fill:#ffd0d0
    style SA fill:#ffd0d0
    style BA fill:#ffd0d0
    style Results fill:#d4ffd4
    style Display fill:#e1f5ff
```

---

## Infrastructure Architecture

```mermaid
graph TB
    subgraph "Modal Cloud Infrastructure"
        subgraph "Container Pool"
            C1[H100 Container 1<br/>Evo2 7B Loaded]
            C2[H100 Container 2<br/>Evo2 7B Loaded]
            C3[H100 Container 3<br/>Evo2 7B Loaded]
        end
        
        VOL[Volume Storage<br/>evo2_cache<br/>Persistent Model]
    end
    
    subgraph "Request Queue"
        Q1[Request 1]
        Q2[Request 2]
        Q3[Request 3]
        Q4[Request 4...]
    end
    
    subgraph "Load Balancer"
        LB[Auto-scaling<br/>Max 3 containers<br/>Retry 2x]
    end
    
    subgraph "External Resources"
        HF[模型的weights]
        UC[UCSC Genome DB]
    end
    
    Q1 --> LB
    Q2 --> LB
    Q3 --> LB
    Q4 --> LB
    
    LB --> C1
    LB --> C2
    LB --> C3
    
    C1 -.-> VOL
    C2 -.-> VOL
    C3 -.-> VOL
    
    C1 -.-> HF
    C2 -.-> HF
    C3 -.-> HF
    
    C1 --> UC
    C2 --> UC
    
    style C1 fill:#d4ffd4
    style C2 fill:#d4ffd4
    style C3 fill:#d4ffd4
    style VOL fill:#c0c0ff
    style LB fill:#ffe0c0
    style HF fill:#c0c0ff
    style UC fill:#c0c0ff
```

---

## Data Flow Diagram

```mermaid
flowchart LR
    subgraph Input[Input Data]
        I1[Variant Position<br/>Alternative<br/>Genome, Chromosome]
        I2[eDNA Sequence<br/>Sequence ID<br/>Taxonomic Group]
        I3[Multiple eDNA<br/>Sequences]
    end
    
    subgraph Processing[Processing Layer]
        subgraph Mod1[Modal Container 1]
            M1[Evo2 Model Instance<br/>H100 GPU]
        end
        subgraph Mod2[Modal Container 2]
            M2[Evo2 Model Instance<br/>H100 GPU]
        end
        subgraph Mod3[Modal Container 3]
            M3[Evo2 Model Instance<br/>H100 GPU]
        end
    end
    
    subgraph External[External Services]
        UC[UCSC API<br/>Get genome sequence<br/>8192bp window]
        DB[(Model Cache<br/>evo2_cache)]
    end
    
    subgraph Output[Output Results]
        O1[Variant Prediction<br/>Pathogenic/Benign<br/>Confidence Score]
        O2[Species Identification<br/>Genus, Family<br/>Taxonomic Rank]
        O3[Diversity Metrics<br/>Shannon Index<br/>Simpson Index]
    end
    
    I1 --> Mod1
    I2 --> Mod2
    I3 --> Mod3
    
    Mod1 --> UC
    Mod2 -.uses cached.-> DB
    Mod3 -.uses cached.-> DB
    
    Mod1 --> O1
    Mod2 --> O2
    Mod3 --> O3
    
    style I1 fill:#e1f5ff
    style I2 fill:#e1f5ff
    style I3 fill:#e1f5ff
    style M1 fill:#d4ffd4
    style M2 fill:#d4ffd4
    style M3 fill:#d4ffd4
    style UC fill:#c0c0ff
    style DB fill:#c0c0ff
    style O1 fill:#ffd0d0
    style O2 fill:#ffd0d0
    style O3 fill:#ffd0d0
```

---

## Decision Tree for Classification

```mermaid
graph TD
    Input[Delta Score from Evo2] --> Check{delta_score < threshold<br/>-0.0009178519?}
    
    Check -->|Yes| Pathogenic[Likely Pathogenic]
    Check -->|No| Benign[Likely Benign]
    
    Pathogenic --> P_Conf[Confidence =<br/>abs(delta - threshold) /<br/>lof_std 0.0015140239]
    
    Benign --> B_Conf[Confidence =<br/>abs(delta - threshold) /<br/>func_std 0.0009016589]
    
    P_Conf --> Cap1{Capped at 1.0}
    B_Conf --> Cap2{Capped at 1.0}
    
    Cap1 --> P_Final[Final Prediction<br/>Pathogenic + Confidence]
    Cap2 --> B_Final[Final Prediction<br/>Benign + Confidence]
    
    P_Final --> Output[JSON Response]
    B_Final --> Output
    
    style Input fill:#e1f5ff
    style Check fill:#ffe0c0
    style Pathogenic fill:#ff8888
    style Benign fill:#88ff88
    style P_Final fill:#ffd0d0
    style B_Final fill:#ffd0d0
    style Output fill:#d4ffd4
```

---

## Performance Metrics Flow

```mermaid
graph LR
    subgraph "Latency Breakdown"
        L1[UCSC API Call<br/>~300ms] --> L2[Evo2 Scoring<br/>~1.5-2.5s]
        L2 --> L3[Classification<br/><50ms]
        L3 --> L4[Total: 1.2-3.5s]
    end
    
    subgraph "Throughput"
        T1[Sequential: 100 seq<br/>~4-6 min]
        T2[Parallel 3x<br/>~1.3-2 min]
    end
    
    subgraph "Resource Usage"
        R1[H100 VRAM<br/>15-20GB]
        R2[GPU Utilization<br/>Optimized inference]
    end
    
    subgraph "Scaling"
        S1[Auto-scale<br/>Max 3 containers]
        S2[Container 1 → Ready]
        S3[Container 2 → Ready]
        S4[Container 3 → Ready]
    end
    
    T1 -.optimized by.-> T2
    S1 --> S2
    S1 --> S3
    S1 --> S4
    
    style L4 fill:#ffe0c0
    style T2 fill:#d4ffd4
    style R1 fill:#c0c0ff
    style S1 fill:#e1f5ff
```

---

## Use the Mermaid Live Editor

1. Go to: https://mermaid.live
2. Paste any of the diagram codes above
3. Customize colors, labels, or layout as needed
4. Export as PNG, SVG, or shareable link

### Recommended diagrams for your paper:
- **Complete System Architecture**: Full overview
- **Detailed Variant Analysis Flow**: In-depth pipeline
- **Infrastructure Architecture**: Deployment and scaling
- **Decision Tree**: Classification logic

Choose the diagram(s) that best fit your paper's needs!
