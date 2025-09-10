import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache to reduce duplicate requests
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes (gene details change less frequently)

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      
      if (response.status === 429) {
        // Rate limited - wait longer before retry
        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (response.ok) {
        return response;
      }
      
      if (attempt === maxRetries) {
        throw new Error(`NCBI API error: ${response.statusText}`);
      }
      
      // Wait before retry for other errors
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  throw new Error('Max retries exceeded');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const geneId = searchParams.get('geneId');

  if (!geneId) {
    return NextResponse.json({ error: 'Missing geneId parameter' }, { status: 400 });
  }

  // Check cache first
  const cacheKey = `gene-${geneId}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json(cached.data);
  }

  try {
    const ncbiUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=gene&id=${geneId}&retmode=json`;
    const response = await fetchWithRetry(ncbiUrl);
    const data = await response.json();
    
    // Cache the result
    cache.set(cacheKey, { data, timestamp: Date.now() });
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('NCBI gene details proxy error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch gene details from NCBI', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
