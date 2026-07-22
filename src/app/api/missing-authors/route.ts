import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const showAll = searchParams.get('all') === 'true';

  const metadataPath = path.join(process.cwd(), 'scratch', 'docs_vision_strict_authors.json');
  if (!fs.existsSync(metadataPath)) {
    return NextResponse.json({ error: 'Metadata file not found' }, { status: 404 });
  }

  const rawData = fs.readFileSync(metadataPath, 'utf-8');
  const items = JSON.parse(rawData);

  const filtered = showAll
    ? items
    : items.filter((item: any) => !item.author || item.author.trim() === '');

  return NextResponse.json({
    totalCount: items.length,
    blankCount: items.filter((item: any) => !item.author || item.author.trim() === '').length,
    items: filtered
  });
}
