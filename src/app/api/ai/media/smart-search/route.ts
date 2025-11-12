import { NextRequest, NextResponse } from 'next/server';
import { RetrievalEngine } from '@/lib/rag/retrieval-engine';

const retrievalEngine = new RetrievalEngine();

async function smartSearch(query: string, filters: any): Promise<any[]> {
  const params = {
    query,
    filters,
    limit: 20,
    includeContent: true,
  };
  const { results } = await retrievalEngine.semanticSearch(params);
  return results.map((r: any) => ({
    id: r.id,
    url: r.url,
    type: r.type,
    name: r.name,
    size: r.size,
    createdAt: r.createdAt,
    tags: r.tags,
    thumbnailUrl: r.thumbnailUrl,
  }));
}

export async function POST(req: NextRequest) {
  try {
    const { query, filters } = await req.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid query' }, { status: 400 });
    }
    const results = await smartSearch(query, filters);
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to perform smart search' }, { status: 500 });
  }
} 