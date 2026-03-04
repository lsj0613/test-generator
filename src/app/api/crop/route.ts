import { NextResponse } from 'next/server';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { imageName, boxes } = await request.json();

    const publicPath = path.join(process.cwd(), 'public');
    const inputPath = path.join(publicPath, 'uploads', imageName);
    const outputDir = path.join(publicPath, 'crops');

    // 출력 폴더 생성 확인
    await fs.mkdir(outputDir, { recursive: true });

    const image = sharp(inputPath);
    const { width, height } = await image.metadata();

    if (!width || !height) {
      return NextResponse.json({ success: false, error: '이미지 로드 실패' }, { status: 400 });
    }

    const results = [];

    for (const box of boxes) {
      const [ymin, xmin, ymax, xmax] = box.box_2d;

      // 상대 좌표(0-1000)를 실제 픽셀로 변환
      const left = Math.floor((xmin / 1000) * width);
      const top = Math.floor((ymin / 1000) * height);
      const extractWidth = Math.floor(((xmax - xmin) / 1000) * width);
      const extractHeight = Math.floor(((ymax - ymin) / 1000) * height);

      const fileName = `crop_${box.q_num}_${Date.now()}.png`;
      const outputPath = path.join(outputDir, fileName);

      // 여백(Padding) 15px 추가하여 안전하게 크롭
      const padding = 15;
      await sharp(inputPath)
        .extract({
          left: Math.max(0, left - padding),
          top: Math.max(0, top - padding),
          width: Math.min(width - left, extractWidth + padding * 2),
          height: Math.min(height - top, extractHeight + padding * 2),
        })
        .toFile(outputPath);

      results.push({
        q_num: box.q_num,
        url: `/crops/${fileName}`
      });
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}