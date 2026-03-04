'use server';
import { convert } from 'pdf-img-convert';

export async function processPdfForEditor(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    const buffer = Buffer.from(await file.arrayBuffer());

    // 💡 width 대신 scale을 사용해 물리적 픽셀 밀도를 높입니다.
    const images = await convert(buffer, {
      page_numbers: [1, 2, 6],
      scale: 2, // 1(기본) -> 4(고화질)
      base64: true 
    });

    console.log("✅ 고화질 이미지 추출 완료");
    return { 
      success: true, 
      imageUrls: images.map(b64 => `data:image/png;base64,${b64}`) 
    };
  } catch (error) {
    console.error(error);
    return { success: false, error: '변환 실패' };
  }
}