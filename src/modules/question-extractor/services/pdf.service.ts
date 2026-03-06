// src/services/pdf.service.ts
import sharp from "sharp";
import { createCanvas } from "canvas";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.js";
import { PDF_CONFIG, SERVER_ONLY_CONFIG } from "@/lib/constants";

const pdfWorker = require("pdfjs-dist/legacy/build/pdf.worker.js");
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const PdfProcessor = {
  async loadDocument(data: Uint8Array) {
    return pdfjsLib.getDocument({
      data,
      disableFontFace: true,
      stopAtErrors: true,
    }).promise;
  },

  async crop(
    page: any,
    r: { x: number; y: number; w: number; h: number }
  ): Promise<Buffer> {
    const scale = SERVER_ONLY_CONFIG.CROP_RENDER_SCALE;
    const viewport = page.getViewport({ scale });
    const canvas: any = createCanvas(viewport.width, viewport.height);
    await page.render({ canvasContext: canvas.getContext("2d"), viewport })
      .promise;

    const toPx = (val: number, size: number) =>
      Math.round((val / PDF_CONFIG.COORDINATE_MAX) * size);

    return sharp(canvas.toBuffer("image/png"))
      .extract({
        left: Math.max(0, toPx(r.x, viewport.width)),
        top: Math.max(0, toPx(r.y, viewport.height)),
        width: Math.min(
          toPx(r.w, viewport.width),
          viewport.width - toPx(r.x, viewport.width)
        ),
        height: Math.min(
          toPx(r.h, viewport.height),
          viewport.height - toPx(r.y, viewport.height)
        ),
      })
      .toBuffer();
  },
};
