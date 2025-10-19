// Create new file: my-app/app/api/save-file/route.ts
// This saves data to the pre-process directory

import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { fileName, data } = await request.json();

    if (!fileName || !data) {
      return NextResponse.json(
        { error: 'fileName and data are required' },
        { status: 400 }
      );
    }

    // Create pre-process directory if it doesn't exist
    const preProcessDir = path.join(process.cwd(), 'pre-process');
    
    try {
      await mkdir(preProcessDir, { recursive: true });
    } catch (err) {
      // Directory might already exist, that's fine
    }

    // Full file path
    const filePath = path.join(preProcessDir, fileName);

    // Write the JSON data to file
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`✓ File saved successfully: ${filePath}`);

    return NextResponse.json({
      success: true,
      path: `pre-process/${fileName}`,
      fullPath: filePath,
      message: 'File saved successfully'
    });

  } catch (error: any) {
    console.error('Failed to save file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save file' },
      { status: 500 }
    );
  }
}