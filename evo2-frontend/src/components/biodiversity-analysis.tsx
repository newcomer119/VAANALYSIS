"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  type BiodiversityResult,
  type eDNARequest,
  analyzeBiodiversityWithAPI,
} from "~/utils/genome-api";

// UI state type that allows empty sequences for form management
type SequenceInput = {
  sequence: string;
  sequence_id?: string;
  taxonomic_group?: string;
};
import { Dna, Loader2, Trash2, Plus, BarChart3 } from "lucide-react";

export default function BiodiversityAnalysis() {
  const [sequences, setSequences] = useState<SequenceInput[]>([
    { sequence: "", sequence_id: "seq_1", taxonomic_group: "bacteria" },
  ]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<BiodiversityResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addSequence = () => {
    const newId = `seq_${sequences.length + 1}`;
    setSequences([
      ...sequences,
      { sequence: "", sequence_id: newId, taxonomic_group: "bacteria" },
    ]);
  };

  const removeSequence = (index: number) => {
    if (sequences.length > 1) {
      setSequences(sequences.filter((_, i) => i !== index));
    }
  };

  const updateSequence = (index: number, field: keyof SequenceInput, value: string) => {
    const updated = [...sequences];
    const currentSequence = updated[index];
    if (currentSequence) {
      updated[index] = { ...currentSequence, [field]: value };
      setSequences(updated);
    }
  };

  const validateSequence = (seq: string): boolean => {
    return /^[ATCGN]+$/i.test(seq) && seq.length >= 50 && seq.length <= 10000;
  };

  const handleAnalyze = async () => {
    // Validate all sequences and convert to API format
    const validSequences: eDNARequest[] = sequences
      .filter((seq) => seq.sequence.trim() && validateSequence(seq.sequence.trim()))
      .map((seq) => ({
        sequence: seq.sequence.trim(),
        sequence_id: seq.sequence_id || undefined,
        taxonomic_group: seq.taxonomic_group || undefined,
      }));

    if (validSequences.length === 0) {
      setError("Please provide at least one valid DNA sequence (50-10,000 nucleotides)");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const biodiversityResult = await analyzeBiodiversityWithAPI(validSequences);
      setResult(biodiversityResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAll = () => {
    setSequences([{ sequence: "", sequence_id: "seq_1", taxonomic_group: "bacteria" }]);
    setResult(null);
    setError(null);
  };

  const loadExampleData = () => {
    setSequences([
      {
        sequence: "ATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCG",
        sequence_id: "bacterial_seq_1",
        taxonomic_group: "bacteria",
      },
      {
        sequence: "GCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTAGCTA",
        sequence_id: "fungal_seq_1",
        taxonomic_group: "fungi",
      },
      {
        sequence: "ATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCG",
        sequence_id: "protist_seq_1",
        taxonomic_group: "protists",
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <Card className="border-none bg-white shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-normal text-[#3c4f3d]/70">
              eDNA Biodiversity Analysis
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadExampleData}
                className="h-8 border-[#3c4f3d]/10 text-xs"
              >
                Load Example
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                className="h-8 border-[#3c4f3d]/10 text-xs"
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {sequences.map((seq, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Sequence ID (optional)"
                      value={seq.sequence_id || ""}
                      onChange={(e) => updateSequence(index, "sequence_id", e.target.value)}
                      className="h-8 w-32 border-[#3c4f3d]/10 text-xs"
                    />
                    <Select
                      value={seq.taxonomic_group || "bacteria"}
                      onValueChange={(value) => updateSequence(index, "taxonomic_group", value)}
                    >
                      <SelectTrigger className="h-8 w-32 border-[#3c4f3d]/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bacteria">Bacteria</SelectItem>
                        <SelectItem value="archaea">Archaea</SelectItem>
                        <SelectItem value="fungi">Fungi</SelectItem>
                        <SelectItem value="protists">Protists</SelectItem>
                        <SelectItem value="metazoa">Metazoa</SelectItem>
                        <SelectItem value="viruses">Viruses</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                    {sequences.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeSequence(index)}
                        className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <textarea
                    placeholder="Enter DNA sequence (A, T, C, G, N only, 50-10,000 nucleotides)"
                    value={seq.sequence}
                    onChange={(e) => updateSequence(index, "sequence", e.target.value.toUpperCase())}
                    className="w-full h-20 p-2 text-xs border border-[#3c4f3d]/10 rounded-md resize-none font-mono"
                    style={{ fontFamily: "monospace" }}
                  />
                  {seq.sequence && !validateSequence(seq.sequence) && (
                    <p className="text-xs text-red-600">
                      Invalid sequence: Must contain only A, T, C, G, N and be 50-10,000 nucleotides
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={addSequence}
              className="h-8 border-[#3c4f3d]/10 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Sequence
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || sequences.every(s => !s.sequence.trim())}
              className="h-8 bg-[#3c4f3d] text-white hover:bg-[#3c4f3d]/90 text-xs"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Dna className="h-3 w-3 mr-1" />
                  Analyze Biodiversity
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card className="border-none bg-white shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-normal text-[#3c4f3d]/70 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Biodiversity Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-[#e9eeea]/50 rounded-md">
                <div className="text-lg font-semibold text-[#3c4f3d]">{result.total_sequences}</div>
                <div className="text-xs text-[#3c4f3d]/70">Total Sequences</div>
              </div>
              <div className="text-center p-3 bg-[#e9eeea]/50 rounded-md">
                <div className="text-lg font-semibold text-[#3c4f3d]">{result.unique_species}</div>
                <div className="text-xs text-[#3c4f3d]/70">Unique Species</div>
              </div>
              <div className="text-center p-3 bg-[#e9eeea]/50 rounded-md">
                <div className="text-lg font-semibold text-[#3c4f3d]">{result.unique_genera}</div>
                <div className="text-xs text-[#3c4f3d]/70">Unique Genera</div>
              </div>
              <div className="text-center p-3 bg-[#e9eeea]/50 rounded-md">
                <div className="text-lg font-semibold text-[#3c4f3d]">{result.unique_families}</div>
                <div className="text-xs text-[#3c4f3d]/70">Unique Families</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-[#e9eeea]/30 rounded-md">
                <div className="text-sm font-medium text-[#3c4f3d] mb-1">Shannon Diversity Index</div>
                <div className="text-lg font-semibold text-[#3c4f3d]">
                  {result.shannon_diversity.toFixed(3)}
                </div>
                <div className="text-xs text-[#3c4f3d]/70">
                  Higher values indicate greater diversity
                </div>
              </div>
              <div className="p-3 bg-[#e9eeea]/30 rounded-md">
                <div className="text-sm font-medium text-[#3c4f3d] mb-1">Simpson Diversity Index</div>
                <div className="text-lg font-semibold text-[#3c4f3d]">
                  {result.simpson_diversity.toFixed(3)}
                </div>
                <div className="text-xs text-[#3c4f3d]/70">
                  Higher values indicate greater diversity
                </div>
              </div>
            </div>

            {Object.keys(result.species_abundance).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[#3c4f3d]">Species Abundance</h4>
                <div className="overflow-hidden rounded-md border border-[#3c4f3d]/5">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#e9eeea]/50 hover:bg-[e9eeea]/70">
                        <TableHead className="text-xs font-normal text-[#3c4f3d]/70">
                          Species
                        </TableHead>
                        <TableHead className="text-xs font-normal text-[#3c4f3d]/70">
                          Count
                        </TableHead>
                        <TableHead className="text-xs font-normal text-[#3c4f3d]/70">
                          Relative Abundance
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(result.species_abundance)
                        .sort(([, a], [, b]) => b - a)
                        .map(([species, count]) => (
                          <TableRow
                            key={species}
                            className="border-b border-[#3c4f3d]/5 hover:bg-[#e9eeea]/50"
                          >
                            <TableCell className="py-2 font-medium text-[#3c4f3d] text-xs">
                              {species}
                            </TableCell>
                            <TableCell className="py-2 font-medium text-[#3c4f3d] text-xs">
                              {count}
                            </TableCell>
                            <TableCell className="py-2 font-medium text-[#3c4f3d] text-xs">
                              {((count / result.total_sequences) * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="text-xs text-[#3c4f3d]/60 pt-2 border-t border-[#3c4f3d]/10">
              Processing time: {result.processing_time.toFixed(2)}s
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
