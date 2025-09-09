"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Select, SelectContent,SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import {
  type GenomeAssemblyFromSearch,
  getAvailableGenomes,
  type GeneFromSearch,
  type ChromosomeFromSeach,
  getGenomeChromosomes
} from "~/utils/genome-api";

export default function Home() {
  const [genomes, setGenomes] = useState<GenomeAssemblyFromSearch[]>([]);

  const [selectedGenome, setSelectedGenome] = useState<string>("hg38");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<GeneFromSearch[]>([]);
  const [selectedGene, setSelectedGene] = useState<GeneFromSearch | null>(null);
  const [chromosomes,setChromosomes] = useState<ChromosomeFromSeach[]>([]);
  const [selectedChromosome, setSelectedChromosome] = useState<string>("chr1");
  const [searchQuery,setSearchQuery] = useState("");


  useEffect(() => {
    const fetchChromosomes = async () => {
      if (!selectedGenome) return; // Don't fetch if no genome is selected
      
      try {
        setIsLoading(true);
        const data = await getGenomeChromosomes(selectedGenome);
        setChromosomes(data.chromosomes);
        if(data.chromosomes.length > 0){
          setSelectedChromosome(data.chromosomes[0]!.name);
        }
      } catch (error) {
        setError('Failed to fetch chromosomes');
      } finally {
        setIsLoading(false);
      }
    };
    fetchChromosomes();
  }, [selectedGenome]); // Fetch chromosomes when selectedGenome changes


  useEffect(() => {
    const fetchGenomes = async () => {
      try {
        setIsLoading(true);
        const data = await getAvailableGenomes();
        if (data.genomes && data.genomes["Human"]) {
          setGenomes(data.genomes["Human"]);

        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };
    fetchGenomes();
  }, []);

  const handleGenomeChange = (value: string) => {
    setSelectedGenome(value);
    setSearchResults([]);
    setSelectedGene(null);
  };

  return (
    <div className="min-h-screen bg-[e9eeea]">
      <header className="border-b border-[#3c4f3d]/10 bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <h1 className="text-xl font-light tracking-wide text-[#3c4f3d]">
                <span className="font-normal">EVO</span>
                <span className="text-[#de8246]">2</span>
              </h1>
              <div className="absolute -bottom-1 left-0 h-[2px] w-12 bg-[#de8246]"></div>
            </div>
            <span className="text-sm font-light text-[#3c4f3d]/70">
              Variant Analysis
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        <Card className="mb-6 gap-0 border-none bg-white py-0 shadow-sm">
          <CardHeader className="pt-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-normal text-[#3c4f3d]/70">
                Genome Assembly
              </CardTitle>
              <div className="text-xs text-[#3c4f3d]/60">
                Organism: <span className="font-medium">Human</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <Select
              value={selectedGenome}
              onValueChange={handleGenomeChange}
              disabled={isLoading}
            >
              <SelectTrigger className="h-9 w-full border-[#3c4f3d]/10">
                <SelectValue placeholder={isLoading ? "Loading..." : "Select genome assembly"} />
              </SelectTrigger>
              <SelectContent>
                {genomes.length > 0 ? (
                  genomes.map((genome) => (
                    <SelectItem key={genome.id} value={genome.id}>
                      {genome.id} - {genome.name}
                      {genome.active ? " (active)" : ""}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-genomes" disabled>
                    No genomes available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {selectedGenome && (
              <p className="mt-2 text-xs text-[#3c4f3d]/60">
                {
                  genomes.find((genome) => genome.id === selectedGenome)
                    ?.sourceName
                }
              </p>
            )}
            {error && (
              <p className="mt-2 text-xs text-red-500">
                Error: {error}
              </p>
            )}
            {isLoading && (
              <p className="mt-2 text-xs text-[#3c4f3d]/60">
                Loading genomes...
              </p>
            )}
            {!isLoading && genomes.length === 0 && !error && (
              <p className="mt-2 text-xs text-[#3c4f3d]/60">
                No genomes found
              </p>
            )}
          </CardContent>  
        </Card>

        {/* Chromosome Selection Card */}
        {selectedGenome && chromosomes.length > 0 && (
          <Card className="mb-6 gap-0 border-none bg-white py-0 shadow-sm">
            <CardHeader className="pt-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-normal text-[#3c4f3d]/70">
                  Chromosome Selection
                </CardTitle>
                <div className="text-xs text-[#3c4f3d]/60">
                  Genome: <span className="font-medium">{selectedGenome}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pb-4">
              <Select
                value={selectedChromosome}
                onValueChange={setSelectedChromosome}
                disabled={isLoading}
              >
                <SelectTrigger className="h-9 w-full border-[#3c4f3d]/10">
                  <SelectValue placeholder="Select chromosome" />
                </SelectTrigger>
                <SelectContent>
                  {chromosomes.map((chromosome) => (
                    <SelectItem key={chromosome.name} value={chromosome.name}>
                      {chromosome.name} ({chromosome.size.toLocaleString()} bp)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedChromosome && (
                <p className="mt-2 text-xs text-[#3c4f3d]/60">
                  Selected: {selectedChromosome}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
