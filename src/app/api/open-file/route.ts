import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, fullPath } = body;

    let targetPath = fullPath;

    if (!targetPath && fileName) {
      // Find fullPath from metadata
      const metadataPath = path.join(process.cwd(), 'scratch', 'docs_vision_strict_authors.json');
      if (fs.existsSync(metadataPath)) {
        const items = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        const found = items.find((i: any) => i.fileName === fileName);
        if (found && found.fullPath) {
          targetPath = found.fullPath;
        }
      }
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      return NextResponse.json({ error: 'File path not found or file does not exist on disk' }, { status: 404 });
    }

    // Windows Explorer command to highlight specific file
    const winPath = path.normalize(targetPath);
    const cmd = `explorer.exe /select,"${winPath}"`;

    exec(cmd, (err) => {
      if (err) {
        console.error('[Open File Error]:', err.message);
      }
    });

    return NextResponse.json({
      success: true,
      message: `Opened ${path.basename(winPath)} in Explorer`,
      path: winPath
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
