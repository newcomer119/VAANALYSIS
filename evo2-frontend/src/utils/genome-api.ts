import { env } from "~/env";
import { ncbiRateLimiter } from "./rate-limiter";

export interface GenomeAssemblyFromSearch {
  id: string;
  name: string;
  sourceName: string;
  active: boolean;
}

export interface ChromosomeFromSeach {
  name: string;
  size: number;
}

export interface GeneFromSearch {
  symbol: string;
  name: string;
  chrom: string;
  description: string;
  gene_id?: string;
}

export interface GeneDetailsFromSearch {
  genomicinfo?: {
    chrstart: number;
    chrstop: number;
    strand?: string;
  }[];
  summary?: string;
  organism?: {
    scientificname: string;
    commonname: string;
  };
}

export interface GeneBounds {
  min: number;
  max: number;
}

export interface ClinvarVariant {
  clinvar_id: string;
  title: string;
  variation_type: string;
  classification: string;
  gene_sort: string;
  chromosome: string;
  location: string;
  evo2Result?: {
    prediction: string;
    delta_score: number;
    classification_confidence: number;
  };
  isAnalyzing?: boolean;
  evo2Error?: string;
}

export interface AnalysisResult {
  position: number;
  reference: string;
  alternative: string;
  delta_score: number;
  prediction: string;
  classification_confidence: number;
}

export interface eDNARequest {
  sequence: string;
  sequence_id?: string;
  taxonomic_group?: string;
}

export interface BiodiversityResult {
  total_sequences: number;
  unique_species: number;
  unique_genera: number;
  unique_families: number;
  shannon_diversity: number;
  simpson_diversity: number;
  species_abundance: Record<string, number>;
  genus_abundance: Record<string, number>;
  family_abundance: Record<string, number>;
  processing_time: number;
  success: boolean;
  error_message?: string;
}

export interface TaxonomyResult {
  sequence_id?: string;
  sequence: string;
  predicted_species: string;
  predicted_genus: string;
  predicted_family: string;
  confidence_score: number;
  taxonomic_rank: string;
  evo2_score: number;
  success: boolean;
  error_message?: string;
}

interface UCSCGenomeInfo {
  organism?: string;
  description?: string;
  sourceName?: string;
  active?: boolean;
}

interface UCSCGenomesResponse {
  ucscGenomes: Record<string, UCSCGenomeInfo>;
}

export async function getAvailableGenomes() {
  const apiUrl = "https://api.genome.ucsc.edu/list/ucscGenomes";
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch genome list from UCSC API");
  }

  const genomeData = await response.json() as UCSCGenomesResponse;
  if (!genomeData.ucscGenomes) {
    throw new Error("UCSC API error: missing ucscGenomes");
  }

  const genomes = genomeData.ucscGenomes;
  const structuredGenomes: Record<string, GenomeAssemblyFromSearch[]> = {};

  for (const genomeId in genomes) {
    const genomeInfo = genomes[genomeId];
    if (!genomeInfo) continue;
    
    const organism = genomeInfo.organism ?? "Other";

    structuredGenomes[organism] ??= [];
    structuredGenomes[organism].push({
      id: genomeId,
      name: genomeInfo.description ?? genomeId,
      sourceName: genomeInfo.sourceName ?? genomeId,
      active: !!genomeInfo.active,
    });
  }

  return { genomes: structuredGenomes };
}

interface UCSCChromosomesResponse {
  chromosomes: Record<string, number>;
}

export async function getGenomeChromosomes(genomeId: string) {
  const apiUrl = `https://api.genome.ucsc.edu/list/chromosomes?genome=${genomeId}`;
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch chromosome list from UCSC API");
  }

  const chromosomeData = await response.json() as UCSCChromosomesResponse;
  if (!chromosomeData.chromosomes) {
    throw new Error("UCSC API error: missing chromosomes");
  }

  const chromosomes: ChromosomeFromSeach[] = [];
  for (const chromId in chromosomeData.chromosomes) {
    if (
      chromId.includes("_") ||
      chromId.includes("Un") ||
      chromId.includes("random")
    )
      continue;
    const size = chromosomeData.chromosomes[chromId];
    if (size !== undefined) {
      chromosomes.push({
        name: chromId,
        size,
      });
    }
  }

  // chr1, chr2, ... chrX, chrY
  chromosomes.sort((a, b) => {
    const anum = a.name.replace("chr", "");
    const bnum = b.name.replace("chr", "");
    const isNumA = /^\d+$/.test(anum);
    const isNumB = /^\d+$/.test(bnum);
    if (isNumA && isNumB) return Number(anum) - Number(bnum);
    if (isNumA) return -1;
    if (isNumB) return 1;
    return anum.localeCompare(bnum);
  });

  return { chromosomes };
}

interface NCBIGeneResponse {
  0: number; // total count
  1: string; // query
  2: {
    GeneID?: string[];
    [key: string]: unknown;
  };
  3: string[][]; // results array
}

export async function searchGenes(query: string, genome: string) {
  const url = "https://clinicaltables.nlm.nih.gov/api/ncbi_genes/v3/search";
  const params = new URLSearchParams({
    terms: query,
    df: "chromosome,Symbol,description,map_location,type_of_gene",
    ef: "chromosome,Symbol,description,map_location,type_of_gene,GenomicInfo,GeneID",
  });
  const response = await fetch(`${url}?${params}`);
  if (!response.ok) {
    throw new Error("NCBI API Error");
  }

  const data = await response.json() as NCBIGeneResponse;
  const results: GeneFromSearch[] = [];

  if (data[0] > 0) {
    const fieldMap = data[2];
    const geneIds = fieldMap.GeneID ?? [];
    for (let i = 0; i < Math.min(10, data[0]); ++i) {
      if (i < data[3].length) {
        try {
          const display = data[3][i];
          if (display && display.length >= 4) {
            let chrom = display[0] ?? "";
            if (chrom && !chrom.startsWith("chr")) {
              chrom = `chr${chrom}`;
            }
            results.push({
              symbol: display[2] ?? "",
              name: display[3] ?? "",
              chrom,
              description: display[3] ?? "",
              gene_id: geneIds[i] ?? "",
            });
          }
        } catch {
          continue;
        }
      }
    }
  }

  return { query, genome, results };
}

interface NCBIGeneDetailResponse {
  result?: Record<string, {
    genomicinfo?: Array<{
      chrstart: number;
      chrstop: number;
      strand?: string;
    }>;
    summary?: string;
    organism?: {
      scientificname: string;
      commonname: string;
    };
  }>;
}

export async function fetchGeneDetails(geneId: string): Promise<{
  geneDetails: GeneDetailsFromSearch | null;
  geneBounds: GeneBounds | null;
  initialRange: { start: number; end: number } | null;
}> {
  try {
    // Apply rate limiting
    await ncbiRateLimiter.waitIfNeeded();
    
    const detailUrl = `/api/ncbi/gene-details?geneId=${geneId}`;
    const detailsResponse = await fetch(detailUrl);

    if (!detailsResponse.ok) {
      console.error(
        `Failed to fetch gene details: ${detailsResponse.statusText}`,
      );
      return { geneDetails: null, geneBounds: null, initialRange: null };
    }

    const detailData = await detailsResponse.json() as NCBIGeneDetailResponse;

    if (detailData.result?.[geneId]) {
      const detail = detailData.result[geneId];

      if (detail.genomicinfo && detail.genomicinfo.length > 0) {
        const info = detail.genomicinfo[0];
        if (info) {
          const minPos = Math.min(info.chrstart, info.chrstop);
          const maxPos = Math.max(info.chrstart, info.chrstop);
          const bounds = { min: minPos, max: maxPos };

          const geneSize = maxPos - minPos;
          const seqStart = minPos;
          const seqEnd = geneSize > 10000 ? minPos + 10000 : maxPos;
          const range = { start: seqStart, end: seqEnd };

          return { geneDetails: detail, geneBounds: bounds, initialRange: range };
        }
      }
    }

    return { geneDetails: null, geneBounds: null, initialRange: null };
  } catch {
    return { geneDetails: null, geneBounds: null, initialRange: null };
  }
}

interface UCSCSequenceResponse {
  dna?: string;
  error?: string;
}

export async function fetchGeneSequence(
  chrom: string,
  start: number,
  end: number,
  genomeId: string,
): Promise<{
  sequence: string;
  actualRange: { start: number; end: number };
  error?: string;
}> {
  try {
    const chromosome = chrom.startsWith("chr") ? chrom : `chr${chrom}`;

    const apiStart = start - 1;
    const apiEnd = end;

    const apiUrl = `https://api.genome.ucsc.edu/getData/sequence?genome=${genomeId};chrom=${chromosome};start=${apiStart};end=${apiEnd}`;
    const response = await fetch(apiUrl);
    const data = await response.json() as UCSCSequenceResponse;

    const actualRange = { start, end };

    if (data.error || !data.dna) {
      return { sequence: "", actualRange, error: data.error };
    }

    const sequence = data.dna.toUpperCase();

    return { sequence, actualRange };
  } catch {
    return {
      sequence: "",
      actualRange: { start, end },
      error: "Internal error in fetch gene sequence",
    };
  }
}

interface ClinvarSearchResponse {
  esearchresult?: {
    idlist?: string[];
  };
}

interface ClinvarSummaryResponse {
  result?: {
    uids?: string[];
    [id: string]: {
      title?: string;
      obj_type?: string;
      germline_classification?: {
        description?: string;
      };
      gene_sort?: string;
      location_sort?: string;
    } | string[] | undefined;
  };
}

export async function fetchClinvarVariants(
  chrom: string,
  geneBound: GeneBounds,
  genomeId: string,
): Promise<ClinvarVariant[]> {
  // Apply rate limiting
  await ncbiRateLimiter.waitIfNeeded();
  
  const chromFormatted = chrom.replace(/^chr/i, "");

  const minBound = Math.min(geneBound.min, geneBound.max);
  const maxBound = Math.max(geneBound.min, geneBound.max);

  const positionField = genomeId === "hg19" ? "chrpos37" : "chrpos38";
  const searchTerm = `${chromFormatted}[chromosome] AND ${minBound}:${maxBound}[${positionField}]`;

  const searchUrl = "/api/ncbi/esearch";
  const searchParams = new URLSearchParams({
    db: "clinvar",
    term: searchTerm,
    retmode: "json",
    retmax: "20",
  });

  const searchResponse = await fetch(`${searchUrl}?${searchParams.toString()}`);

  if (!searchResponse.ok) {
    throw new Error("ClinVar search failed: " + searchResponse.statusText);
  }

  const searchData = await searchResponse.json() as ClinvarSearchResponse;

  if (
    !searchData.esearchresult?.idlist ||
    searchData.esearchresult.idlist.length === 0
  ) {
    console.log("No ClinVar variants found");
    return [];
  }

  const variantIds = searchData.esearchresult.idlist;

  const summaryUrl = "/api/ncbi/esummary";
  const summaryParams = new URLSearchParams({
    db: "clinvar",
    id: variantIds.join(","),
    retmode: "json",
  });

  const summaryResponse = await fetch(
    `${summaryUrl}?${summaryParams.toString()}`,
  );

  if (!summaryResponse.ok) {
    throw new Error(
      "Failed to fetch variant details: " + summaryResponse.statusText,
    );
  }

  const summaryData = await summaryResponse.json() as ClinvarSummaryResponse;
  const variants: ClinvarVariant[] = [];

  if (summaryData.result?.uids) {
    for (const id of summaryData.result.uids) {
      const variant = summaryData.result[id];
      if (typeof variant === 'object' && variant !== null && !Array.isArray(variant)) {
        variants.push({
          clinvar_id: id,
          title: variant.title ?? "",
          variation_type: (variant.obj_type ?? "Unknown")
            .split(" ")
            .map(
              (word: string) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
            )
            .join(" "),
          classification:
            variant.germline_classification?.description ?? "Unknown",
          gene_sort: variant.gene_sort ?? "",
          chromosome: chromFormatted,
          location: variant.location_sort
            ? parseInt(variant.location_sort).toLocaleString()
            : "Unknown",
        });
      }
    }
  }

  return variants;
}

export async function analyzeVariantWithAPI({
  position,
  alternative,
  genomeId,
  chromosome,
}: {
  position: number;
  alternative: string;
  genomeId: string;
  chromosome: string;
}): Promise<AnalysisResult> {
  const url = env.NEXT_PUBLIC_ANALYZE_SINGLE_VARIANT_BASE_URL;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      variant_position: position,
      alternative: alternative,
      genome: genomeId,
      chromosome: chromosome,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Failed to analyze variant " + errorText);
  }

  return await response.json() as AnalysisResult;
}

export async function analyzeBiodiversityWithAPI(
  sequences: eDNARequest[]
): Promise<BiodiversityResult> {
  const url = env.NEXT_PUBLIC_ANALYZE_BIODIVERSITY_BASE_URL;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sequences: sequences,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Failed to analyze biodiversity " + errorText);
  }

  return await response.json() as BiodiversityResult;
}

export async function identifySpeciesWithAPI(
  sequence: string,
  sequenceId?: string,
  taxonomicGroup?: string
): Promise<TaxonomyResult> {
  const url = env.NEXT_PUBLIC_IDENTIFY_SPECIES_BASE_URL;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sequence: sequence,
      sequence_id: sequenceId,
      taxonomic_group: taxonomicGroup,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Failed to identify species " + errorText);
  }

  return await response.json() as TaxonomyResult;
}
