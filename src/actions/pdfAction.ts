'use server';

// 기존: import pdf2img from 'pdf-img-convert'; (에러 발생)
// 수정: 라이브러리에서 직접 'convert' 함수를 가져옵니다.

export async function convertPdfToImages(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) throw new Error('파일이 없습니다.');

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // pdf2img.convert 대신 바로 convert 함수를 사용합니다.
    const outputImages = await convert(buffer, {
      base64: true,
      scale: 2.0, // 고해상도 추출을 위해 2.0 이상 유지
    });

    // 12페이지 중 1p, 2p, 6p에 대한 초기 좌표 설정 로직 (이전과 동일)
    // outputImages가 문자열 배열(Base64)이므로 이를 map으로 처리
    return (outputImages as string[]).map((img, index) => {
      let coords: { y: number }[] = [];
      if (index === 0) coords = [{ y: 800 }, { y: 800 }]; // 1p: 좌/우 하단
      if (index === 1 || index === 5) coords = [{ y: 500 }]; // 2p, 6p: 구분선
      
      return {
        image: `data:image/png;base64,${img}`,
        coordinates: coords,
      };
    });
  } catch (error) {
    console.error('PDF 변환 에러:', error);
    throw new Error('PDF 변환에 실패했습니다.');
  }
}