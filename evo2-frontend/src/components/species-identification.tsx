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
  type TaxonomyResult,
  identifySpeciesWithAPI,
} from "~/utils/genome-api";
import { Dna, Loader2, Search } from "lucide-react";

export default function SpeciesIdentification() {
  const [sequence, setSequence] = useState("");
  const [sequenceId, setSequenceId] = useState("");
  const [taxonomicGroup, setTaxonomicGroup] = useState("bacteria");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<TaxonomyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateSequence = (seq: string): boolean => {
    return /^[ATCGN]+$/i.test(seq) && seq.length >= 50 && seq.length <= 10000;
  };

  const handleIdentify = async () => {
    if (!sequence.trim()) {
      setError("Please enter a DNA sequence");
      return;
    }

    if (!validateSequence(sequence.trim())) {
      setError("Invalid sequence: Must contain only A, T, C, G, N and be 50-10,000 nucleotides");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const taxonomyResult = await identifySpeciesWithAPI(
        sequence.trim(),
        sequenceId.trim() || undefined,
        taxonomicGroup || undefined
      );
      setResult(taxonomyResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Species identification failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearAll = () => {
    setSequence("");
    setSequenceId("");
    setTaxonomicGroup("bacteria");
    setResult(null);
    setError(null);
  };

  const loadExampleData = () => {
    setSequence("ATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCGATCG");
    setSequenceId("bacterial_sample_1");
    setTaxonomicGroup("bacteria");
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  return (
    <div className="space-y-6">
      <Card className="border-none bg-white shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-normal text-[#3c4f3d]/70">
              Species Identification
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
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Sequence ID (optional)"
                value={sequenceId}
                onChange={(e) => setSequenceId(e.target.value)}
                className="h-8 w-48 border-[#3c4f3d]/10 text-xs"
              />
              <Select
                value={taxonomicGroup}
                onValueChange={setTaxonomicGroup}
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
            </div>
            <div className="space-y-2">
              <textarea
                placeholder="Enter DNA sequence (A, T, C, G, N only, 50-10,000 nucleotides)"
                value={sequence}
                onChange={(e) => setSequence(e.target.value.toUpperCase())}
                className="w-full h-32 p-3 text-sm border border-[#3c4f3d]/10 rounded-md resize-none font-mono"
                style={{ fontFamily: "monospace" }}
              />
              {sequence && !validateSequence(sequence) && (
                <p className="text-xs text-red-600">
                  Invalid sequence: Must contain only A, T, C, G, N and be 50-10,000 nucleotides
                </p>
              )}
              <div className="flex justify-between text-xs text-[#3c4f3d]/60">
                <span>Length: {sequence.length} nucleotides</span>
                <span>
                  {sequence.length >= 50 && sequence.length <= 10000 ? "✓ Valid" : "✗ Invalid"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleIdentify}
              disabled={isAnalyzing || !sequence.trim() || !validateSequence(sequence)}
              className="h-8 bg-[#3c4f3d] text-white hover:bg-[#3c4f3d]/90 text-xs"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Identifying...
                </>
              ) : (
                <>
                  <Search className="h-3 w-3 mr-1" />
                  Identify Species
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
              <Dna className="h-4 w-4" />
              Identification Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.success ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-[#e9eeea]/30 rounded-md">
                      <div className="text-sm font-medium text-[#3c4f3d] mb-1">Predicted Species</div>
                      <div className="text-lg font-semibold text-[#3c4f3d]">
                        {result.predicted_species}
                      </div>
                    </div>
                    <div className="p-3 bg-[#e9eeea]/30 rounded-md">
                      <div className="text-sm font-medium text-[#3c4f3d] mb-1">Predicted Genus</div>
                      <div className="text-lg font-semibold text-[#3c4f3d]">
                        {result.predicted_genus}
                      </div>
                    </div>
                    <div className="p-3 bg-[#e9eeea]/30 rounded-md">
                      <div className="text-sm font-medium text-[#3c4f3d] mb-1">Predicted Family</div>
                      <div className="text-lg font-semibold text-[#3c4f3d]">
                        {result.predicted_family}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-[#e9eeea]/30 rounded-md">
                      <div className="text-sm font-medium text-[#3c4f3d] mb-1">Confidence Score</div>
                      <div className={`text-lg font-semibold ${getConfidenceColor(result.confidence_score)}`}>
                        {(result.confidence_score * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-[#3c4f3d]/60">
                        {getConfidenceLabel(result.confidence_score)} confidence
                      </div>
                    </div>
                    <div className="p-3 bg-[#e9eeea]/30 rounded-md">
                      <div className="text-sm font-medium text-[#3c4f3d] mb-1">Evo2 Score</div>
                      <div className="text-lg font-semibold text-[#3c4f3d]">
                        {result.evo2_score.toFixed(4)}
                      </div>
                      <div className="text-xs text-[#3c4f3d]/60">
                        Model prediction score
                      </div>
                    </div>
                    <div className="p-3 bg-[#e9eeea]/30 rounded-md">
                      <div className="text-sm font-medium text-[#3c4f3d] mb-1">Taxonomic Rank</div>
                      <div className="text-lg font-semibold text-[#3c4f3d] capitalize">
                        {result.taxonomic_rank}
                      </div>
                    </div>
                  </div>
                </div>

                {result.sequence_id && (
                  <div className="p-3 bg-[#e9eeea]/20 rounded-md">
                    <div className="text-sm font-medium text-[#3c4f3d] mb-1">Sequence ID</div>
                    <div className="text-sm text-[#3c4f3d] font-mono">
                      {result.sequence_id}
                    </div>
                  </div>
                )}

                <div className="text-xs text-[#3c4f3d]/60 pt-2 border-t border-[#3c4f3d]/10">
                  Analysis completed successfully
                </div>
              </>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="text-sm font-medium text-red-800 mb-1">Identification Failed</div>
                <div className="text-sm text-red-700">
                  {result.error_message ?? "Unknown error occurred during species identification"}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
