import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Simple atomic write helper to avoid race conditions when writing to docs_vision_strict_authors.json
function updateMetadataFileSafely(fileName: string, newAuthor: string) {
  const metadataPath = path.join(process.cwd(), 'scratch', 'docs_vision_strict_authors.json');
  if (!fs.existsSync(metadataPath)) return false;

  const rawData = fs.readFileSync(metadataPath, 'utf-8');
  const items = JSON.parse(rawData);

  let updated = false;
  for (const item of items) {
    if (item.fileName === fileName) {
      item.author = (newAuthor || '').trim();
      updated = true;
      break;
    }
  }

  if (updated) {
    // Write via temporary file for atomic write safety
    const tempPath = `${metadataPath}.tmp.${Date.now()}_${Math.random().toString(36).substring(7)}`;
    fs.writeFileSync(tempPath, JSON.stringify(items, null, 2), 'utf-8');
    fs.renameSync(tempPath, metadataPath);

    try {
      const syncScript = path.join(process.cwd(), 'scratch', 'build_strict_blank_sources.js');
      execSync(`node "${syncScript}"`, { cwd: process.cwd() });
    } catch (syncErr: any) {
      console.warn('[Sync Warning] Could not rebuild sources.md:', syncErr.message);
    }
  }

  return updated;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, author } = body;

    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    const success = updateMetadataFileSafely(fileName, author);
    if (!success) {
      return NextResponse.json({ error: `File ${fileName} not found in database` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      fileName,
      author: (author || '').trim()
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
