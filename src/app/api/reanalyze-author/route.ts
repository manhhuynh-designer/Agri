import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync, execSync } from 'child_process';

function getAgyExecutablePath(): string {
  const userHome = os.homedir();
  const possiblePaths = [
    path.join(userHome, 'AppData', 'Local', 'agy', 'bin', 'agy.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'agy', 'bin', 'agy.exe'),
    'agy.exe',
    'agy'
  ];

  for (const p of possiblePaths) {
    if (p.includes(path.sep) && fs.existsSync(p)) {
      return p;
    }
  }

  return 'agy';
}

function updateMetadataFileSafely(fileName: string, extractedAuthor: string, extractedTitle: string) {
  const metadataPath = path.join(process.cwd(), 'scratch', 'docs_vision_strict_authors.json');
  if (!fs.existsSync(metadataPath)) return false;

  const rawData = fs.readFileSync(metadataPath, 'utf-8');
  const items = JSON.parse(rawData);

  let updated = false;
  for (const item of items) {
    if (item.fileName === fileName) {
      if (extractedAuthor) item.author = extractedAuthor.trim();
      if (extractedTitle) item.title = extractedTitle.trim();
      updated = true;
      break;
    }
  }

  if (updated) {
    const tempPath = `${metadataPath}.tmp.${Date.now()}_${Math.random().toString(36).substring(7)}`;
    fs.writeFileSync(tempPath, JSON.stringify(items, null, 2), 'utf-8');
    fs.renameSync(tempPath, metadataPath);

    try {
      const syncScript = path.join(process.cwd(), 'scratch', 'build_strict_blank_sources.js');
      execSync(`node "${syncScript}"`, { cwd: process.cwd() });
    } catch (syncErr: any) {
      console.warn('[Sync Warning]:', syncErr.message);
    }
  }

  return updated;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, selectedPages, croppedImage } = body;

    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    let targetImages: string[] = [];
    let tempCroppedPath: string | null = null;

    if (croppedImage && typeof croppedImage === 'string' && croppedImage.startsWith('data:image/')) {
      const matches = croppedImage.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        const tempDir = path.join(process.cwd(), 'temp_covers', 'crops');
        fs.mkdirSync(tempDir, { recursive: true });

        const cropFileName = `crop_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        tempCroppedPath = path.join(tempDir, cropFileName);
        fs.writeFileSync(tempCroppedPath, buffer);
        targetImages.push(tempCroppedPath);
        console.log(`[Re-analyze Author] Created cropped image file: ${tempCroppedPath}`);
      }
    }

    if (targetImages.length === 0) {
      const pagesToAnalyze: number[] = Array.isArray(selectedPages) && selectedPages.length > 0
        ? selectedPages
        : [1, 2, 3];

      const baseNameNoExt = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
      const pagesDir = path.join(process.cwd(), 'temp_covers', 'pages');
      const mainCoversDir = path.join(process.cwd(), 'temp_covers');

      if (fs.existsSync(pagesDir)) {
        for (const p of pagesToAnalyze) {
          const pageImageName = `${baseNameNoExt}_p${p}.png`;
          const pageImagePath = path.join(pagesDir, pageImageName);
          if (fs.existsSync(pageImagePath)) {
            targetImages.push(pageImagePath);
          } else {
            const pageFiles = fs.readdirSync(pagesDir);
            const match = pageFiles.find(f =>
              f.toLowerCase().includes(baseNameNoExt.toLowerCase()) && f.endsWith(`_p${p}.png`)
            );
            if (match) {
              targetImages.push(path.join(pagesDir, match));
            }
          }
        }
      }

      if (targetImages.length === 0 && fs.existsSync(mainCoversDir)) {
        const mainFiles = fs.readdirSync(mainCoversDir);
        const matches = mainFiles.filter(f => f.toLowerCase().includes(baseNameNoExt.toLowerCase()) && f.endsWith('.png'));
        if (matches.length > 0) {
          targetImages = matches.slice(0, 3).map(f => path.join(mainCoversDir, f));
        }
      }
    }

    if (targetImages.length === 0) {
      return NextResponse.json({ error: `No rendered cover PNG found for ${fileName}` }, { status: 404 });
    }

    const agyExe = getAgyExecutablePath();
    console.log(`[Re-analyze Author] Using agy executable: ${agyExe} with Gemini 3.6 Flash (High)`);
    console.log(`[Re-analyze Author] Analyzing ${targetImages.length} image(s) for ${fileName}...`);

    const imageArgs = targetImages.map(img => `"${img}"`).join(', ');
    const promptText = `Inspect the book cover / title page image section at: ${imageArgs}.

Tasks:
1. Extract the EXACT printed Author Name(s) and Publisher / Publishing House / Organization as printed visually on this cover image (e.g., "GS.TS. Nguyễn Văn A / NXB Nông Nghiệp").
2. Extract the EXACT printed Book Title if visible.
3. If NO author or publisher is printed on this cover image, return empty string "".
4. DO NOT INVENT, GUESS, OR USE PLACEHOLDERS.

Return JSON format ONLY:
{
  "title": "Full printed title or empty string",
  "author": "Exact Author / Publisher or empty string"
}`;

    const agyResult = spawnSync(agyExe, [
      '--model', 'gemini-3.6-flash',
      '--effort', 'high',
      '--dangerously-skip-permissions',
      '--print-timeout', '3m0s',
      '-p', promptText
    ], {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      timeout: 180000,
      env: { ...process.env }
    });

    if (tempCroppedPath && fs.existsSync(tempCroppedPath)) {
      try { fs.unlinkSync(tempCroppedPath); } catch (e) {}
    }

    let extractedAuthor = '';
    let extractedTitle = '';

    if (agyResult.status === 0 && agyResult.stdout) {
      let output = agyResult.stdout.trim();
      console.log(`[Re-analyze agy output]:`, output);
      const match = output.match(/\{[\s\S]*?\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          extractedAuthor = (parsed.author || '').trim();
          extractedTitle = (parsed.title || '').trim();
        } catch (e) {
          console.error('[JSON Parse Error]:', e);
        }
      }
    } else {
      console.error('[agy Error Output]:', agyResult.stderr || agyResult.error?.message);
    }

    // Safely update metadata file
    updateMetadataFileSafely(fileName, extractedAuthor, extractedTitle);

    return NextResponse.json({
      success: true,
      fileName,
      model: 'gemini-3.6-flash (High effort)',
      author: extractedAuthor,
      title: extractedTitle,
      message: extractedAuthor
        ? `Trích xuất thành công qua Gemini 3.6 Flash (High): ${extractedAuthor}`
        : `Không tìm thấy tên tác giả/NXB trên các ảnh đã chọn`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
