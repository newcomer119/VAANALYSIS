import sys
import modal
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VariantRequest(BaseModel):
    variant_position: int
    alternative: str
    genome: str
    chromosome: str

class eDNARequest(BaseModel):
    sequence: str
    sequence_id: Optional[str] = None
    taxonomic_group: Optional[str] = None

class BiodiversityRequest(BaseModel):
    sequences: List[eDNARequest]

# Modal image configuration for proper Evo2 installation
evo2_image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.4.1-devel-ubuntu22.04", add_python="3.12"
    )
    .apt_install([
        "build-essential",
        "cmake",
        "ninja-build",
        "libcudnn8", "libcudnn8-dev",
        "git",
        "gcc-9", "g++-9",
        "wget",
        "curl",
    ])
    .env({
        "CC": "/usr/bin/gcc-9",
        "CXX": "/usr/bin/g++-9",
        "CUDA_HOME": "/usr/local/cuda",
        "PATH": "/usr/local/cuda/bin:${PATH}",
        "LD_LIBRARY_PATH": "/usr/local/cuda/lib64:${LD_LIBRARY_PATH}"
    })
    .run_commands([
        "pip install --upgrade pip setuptools wheel",
        "pip install torch --index-url https://download.pytorch.org/whl/cu124",
        "pip install flash-attn==2.7.4.post1 --no-build-isolation",
        "pip install 'nvidia-cudnn-cu12==9.3.0.75'",
        "pip install 'transformer-engine[pytorch]==2.6.0.post1' --no-build-isolation",
        "pip install evo2"
    ])
    .run_commands([
        "git clone https://github.com/ArcInstitute/evo2.git /evo2_repo",
    ])
    .pip_install_from_requirements("requirements.txt")
)

# Create Modal app
app = modal.App("variant-analysis-evo2", image=evo2_image)

# Volume for model caching
volume = modal.Volume.from_name("evo2_cache", create_if_missing=True)
mount_path = "/evo2_cache"

def get_genome_sequence(position, genome: str, chromosome: str, window_size=8192):
    """Fetch genome sequence from UCSC API"""
    import requests
    
    half_window = window_size // 2
    start = max(0, position - 1 - half_window)
    end = position - 1 + half_window + 1

    logger.info(f"Fetching {window_size}bp window around position {position} from UCSC API")
    logger.info(f"Coordinates: {chromosome}:{start}-{end} ({genome})")

    api_url = f"https://api.genome.ucsc.edu/getData/sequence?genome={genome};chrom={chromosome};start={start};end={end}"
    response = requests.get(api_url)

    if response.status_code != 200:
        raise Exception(f"Failed to fetch genome sequence from UCSC API: {response.status_code}")

    genome_data = response.json()

    if "dna" not in genome_data:
        error = genome_data.get("error", "Unknown error")
        raise Exception(f"UCSC API error: {error}")

    sequence = genome_data.get("dna", "").upper()
    expected_length = end - start
    if len(sequence) != expected_length:
        logger.warning(f"Warning: received sequence length ({len(sequence)}) differs from expected ({expected_length})")

    logger.info(f"Loaded reference genome sequence window (length: {len(sequence)} bases)")
    return sequence, start

def analyze_variant(relative_pos_in_window, reference, alternative, window_seq, model):
    """Analyze a single variant using Evo2 model"""
    var_seq = window_seq[:relative_pos_in_window] + alternative + window_seq[relative_pos_in_window+1:]

    ref_score = model.score_sequences([window_seq])[0]
    var_score = model.score_sequences([var_seq])[0]

    # Convert numpy types to Python native types for JSON serialization
    ref_score = float(ref_score)
    var_score = float(var_score)
    delta_score = var_score - ref_score

    # Threshold parameters from your working code
    threshold = -0.0009178519
    lof_std = 0.0015140239
    func_std = 0.0009016589

    if delta_score < threshold:
        prediction = "Likely pathogenic"
        confidence = min(1.0, abs(delta_score - threshold) / lof_std)
    else:
        prediction = "Likely benign"
        confidence = min(1.0, abs(delta_score - threshold) / func_std)

    return {
        "reference": reference,
        "alternative": alternative,
        "delta_score": float(delta_score),
        "prediction": prediction,
        "classification_confidence": float(confidence)
    }

@app.cls(gpu="H100", volumes={mount_path: volume}, max_containers=3, retries=2, scaledown_window=120)
class Evo2Model:
    @modal.enter()
    def load_evo2_model(self):
        """Load the Evo2 model"""
        from evo2 import Evo2
        logger.info("Loading evo2 model...")
        self.model = Evo2('evo2_7b')
        logger.info("Evo2 model loaded successfully")

    @modal.fastapi_endpoint(method="POST")
    def analyze_single_variant(self, request: VariantRequest):
        """Analyze a single genetic variant"""
        variant_position = request.variant_position
        alternative = request.alternative
        genome = request.genome
        chromosome = request.chromosome

        logger.info(f"Analyzing variant: {chromosome}:{variant_position} {alternative}")
        logger.info(f"Genome: {genome}, Chromosome: {chromosome}")

        WINDOW_SIZE = 8192

        try:
            window_seq, seq_start = get_genome_sequence(
                position=variant_position,
                genome=genome,
                chromosome=chromosome,
                window_size=WINDOW_SIZE
            )

            logger.info(f"Fetched genome sequence window, first 100: {window_seq[:100]}")

            relative_pos = variant_position - 1 - seq_start
            logger.info(f"Relative position within window: {relative_pos}")

            if relative_pos < 0 or relative_pos >= len(window_seq):
                raise ValueError(f"Variant position {variant_position} is outside the fetched window (start={seq_start+1}, end={seq_start+len(window_seq)})")

            reference = window_seq[relative_pos]
            logger.info(f"Reference nucleotide: {reference}")

            # Analyze the variant
            result = analyze_variant(
                relative_pos_in_window=relative_pos,
                reference=reference,
                alternative=alternative,
                window_seq=window_seq,
                model=self.model
            )

            result["position"] = variant_position
            logger.info(f"✅ Analysis successful: Position: {variant_position}, Variant: {reference} → {alternative}")

            return result

        except Exception as e:
            logger.error(f"Error analyzing variant: {str(e)}")
            raise

    @modal.fastapi_endpoint(method="POST")
    def identify_species(self, request: eDNARequest):
        """Identify species from eDNA sequence"""
        sequence = request.sequence.upper()
        sequence_id = request.sequence_id or "unknown"
        taxonomic_group = request.taxonomic_group or "unknown"
        
        logger.info(f"Identifying species for sequence: {sequence_id}")
        
        try:
            # Validate sequence
            if not all(c in 'ATCGN' for c in sequence):
                return {
                    "success": False,
                    "error_message": "Sequence contains invalid characters. Only A, T, C, G, N allowed."
                }
            
            if len(sequence) < 50 or len(sequence) > 10000:
                return {
                    "success": False,
                    "error_message": "Sequence length must be between 50 and 10,000 nucleotides"
                }
            
            # Score the sequence using Evo2
            logger.info(f"Analyzing eDNA sequence (length: {len(sequence)})")
            evo2_score = self.model.score_sequences([sequence])[0]
            
            # Convert numpy types to Python native types for JSON serialization
            evo2_score = float(evo2_score)
            
            # Mock taxonomy prediction (you can replace with real taxonomy model)
            predicted_species = f"Species_{taxonomic_group}_1"
            predicted_genus = f"Genus_{taxonomic_group}"
            predicted_family = f"Family_{taxonomic_group}"
            confidence_score = min(0.95, 0.6 + abs(evo2_score) * 0.1)
            
            result = {
                "success": True,
                "predicted_species": predicted_species,
                "predicted_genus": predicted_genus,
                "predicted_family": predicted_family,
                "confidence_score": confidence_score,
                "evo2_score": evo2_score,
                "taxonomic_rank": "species",
                "sequence_id": sequence_id
            }
            
            logger.info(f"✅ eDNA Analysis successful: Species: {predicted_species} (Confidence: {confidence_score:.2f})")
            return result
            
        except Exception as e:
            logger.error(f"Error identifying species: {str(e)}")
            return {
                "success": False,
                "error_message": f"Species identification failed: {str(e)}"
            }

    @modal.fastapi_endpoint(method="POST")
    def analyze_biodiversity(self, request: BiodiversityRequest):
        """Analyze biodiversity from multiple eDNA sequences"""
        sequences = request.sequences
        logger.info(f"Analyzing biodiversity for {len(sequences)} eDNA sequences")
        
        try:
            import time
            start_time = time.time()
            
            # Process each sequence
            results = []
            species_count = {}
            genus_count = {}
            family_count = {}
            
            for i, seq_request in enumerate(sequences):
                logger.info(f"Processing sequence {i+1}/{len(sequences)}: {seq_request.sequence_id}")
                
                # Get species identification for this sequence
                species_result = self.identify_species(seq_request)
                
                if species_result["success"]:
                    results.append(species_result)
                    
                    # Count species, genera, families
                    species = species_result["predicted_species"]
                    genus = species_result["predicted_genus"]
                    family = species_result["predicted_family"]
                    
                    species_count[species] = species_count.get(species, 0) + 1
                    genus_count[genus] = genus_count.get(genus, 0) + 1
                    family_count[family] = family_count.get(family, 0) + 1
            
            # Calculate diversity indices
            total_sequences = len(sequences)
            unique_species = len(species_count)
            unique_genera = len(genus_count)
            unique_families = len(family_count)
            
            # Shannon diversity index
            shannon_diversity = 0
            for count in species_count.values():
                if count > 0:
                    p = count / total_sequences
                    shannon_diversity -= p * (p.bit_length() - 1) if p > 0 else 0
            
            # Simpson diversity index
            simpson_diversity = 0
            for count in species_count.values():
                p = count / total_sequences
                simpson_diversity += p * p
            
            processing_time = time.time() - start_time
            
            result = {
                "total_sequences": total_sequences,
                "unique_species": unique_species,
                "unique_genera": unique_genera,
                "unique_families": unique_families,
                "shannon_diversity": shannon_diversity,
                "simpson_diversity": simpson_diversity,
                "species_abundance": species_count,
                "processing_time": processing_time
            }
            
            logger.info(f"✅ Biodiversity Analysis successful: {unique_species} unique species found")
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing biodiversity: {str(e)}")
            raise

@app.local_entrypoint()
def main():
    """Test the deployed functions"""
    import requests
    import json
    
    evo2Model = Evo2Model()
    
    # Test variant analysis
    variant_url = evo2Model.analyze_single_variant.web_url
    variant_payload = {
        "variant_position": 43119628,
        "alternative": "G",
        "genome": "hg38",
        "chromosome": "chr17"
    }
    
    print("Testing variant analysis...")
    response = requests.post(variant_url, json=variant_payload)
    response.raise_for_status()
    result = response.json()
    print("Variant analysis result:", result)
    
    # Test species identification
    species_url = evo2Model.identify_species.web_url
    species_payload = {
        "sequence": "ATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCG",
        "sequence_id": "test_sequence_1",
        "taxonomic_group": "bacteria"
    }
    
    print("\nTesting species identification...")
    response = requests.post(species_url, json=species_payload)
    response.raise_for_status()
    result = response.json()
    print("Species identification result:", result)

if __name__ == "__main__":
    main()