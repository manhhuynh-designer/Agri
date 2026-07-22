import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function sanitizeName(name: string): string {
  const noExt = name.replace(/\.[^/.]+$/, "");
  return noExt.replace(/[^a-zA-Z0-9]/g, "_");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get('file');
  const pageNum = searchParams.get('page') || '1';

  if (!fileName) {
    return new NextResponse('Missing file parameter', { status: 400 });
  }

  const cleanBase = sanitizeName(fileName);
  const pagesDir = path.join(process.cwd(), 'temp_covers', 'pages');
  const tempCoversDir = path.join(process.cwd(), 'temp_covers');

  // 1. Try temp_covers/pages/
  if (fs.existsSync(pagesDir)) {
    const pageFiles = fs.readdirSync(pagesDir);
    const targetSuffix = `_p${pageNum}.png`;

    // Exact match
    let pageMatch = pageFiles.find(f => f === `${cleanBase}${targetSuffix}`);

    // Case-insensitive / fuzzy match
    if (!pageMatch) {
      pageMatch = pageFiles.find(f => 
        f.toLowerCase().includes(cleanBase.toLowerCase()) && f.endsWith(targetSuffix)
      );
    }

    // Match by first 10 alphanumeric chars if name is long or accented
    if (!pageMatch) {
      const coreWords = cleanBase.split('_').filter(w => w.length > 2);
      if (coreWords.length > 0) {
        pageMatch = pageFiles.find(f => 
          f.toLowerCase().includes(coreWords[0].toLowerCase()) && f.endsWith(targetSuffix)
        );
      }
    }

    if (pageMatch) {
      const buffer = fs.readFileSync(path.join(pagesDir, pageMatch));
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400, immutable',
        },
      });
    }
  }

  // 2. Fallback to main temp_covers/
  if (fs.existsSync(tempCoversDir)) {
    const mainFiles = fs.readdirSync(tempCoversDir);
    let mainMatch = mainFiles.find(f => f.toLowerCase().includes(cleanBase.toLowerCase()) && f.endsWith('.png'));

    if (!mainMatch) {
      const words = cleanBase.split('_').filter(w => w.length > 2);
      if (words.length > 0) {
        mainMatch = mainFiles.find(f => f.toLowerCase().includes(words[0].toLowerCase()) && f.endsWith('.png'));
      }
    }

    if (mainMatch) {
      const buffer = fs.readFileSync(path.join(tempCoversDir, mainMatch));
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400, immutable',
        },
      });
    }
  }

  return new NextResponse('Cover image not found', { status: 404 });
}
