// deno-lint-ignore-file no-explicit-any
// Google Cloud Vision helpers used by the document-upload edge function.

export function encodeToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + chunkSize)
    );
  }
  return btoa(binary);
}

export async function ocrImageWithGoogleVision(
  googleCloudVisionApiKey: string,
  base64Image: string
): Promise<string> {
  const url = `https://vision.googleapis.com/v1/images:annotate?key=${googleCloudVisionApiKey}`;
  const requestBody = {
    requests: [
      {
        image: { content: base64Image },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
      },
    ],
  };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  const json = await response.json();
  if (!response.ok) {
    const message =
      (json && (json.error?.message || json.message)) ||
      `Vision API error: ${response.status}`;
    throw new Error(message);
  }
  const annotationResponse = json?.responses?.[0] ?? {};
  const text =
    annotationResponse.fullTextAnnotation?.text ||
    (Array.isArray(annotationResponse.textAnnotations)
      ? annotationResponse.textAnnotations
          .map((t: any) => t?.description ?? "")
          .join(" ")
      : "");
  return String(text || "");
}

export async function ocrPdfWithGoogleVision(
  googleCloudVisionApiKey: string,
  base64Pdf: string
): Promise<string> {
  const url = `https://vision.googleapis.com/v1/files:annotate?key=${googleCloudVisionApiKey}`;
  const requestBody: any = {
    requests: [
      {
        inputConfig: { content: base64Pdf, mimeType: "application/pdf" },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
      },
    ],
  };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  const json = await response.json();
  if (!response.ok) {
    const message =
      (json && (json.error?.message || json.message)) ||
      `Vision API error: ${response.status}`;
    throw new Error(message);
  }
  const fileResponse = json?.responses?.[0];
  if (!fileResponse) return "";
  const pageResponses: any[] = fileResponse.responses ?? [];
  const textChunks: string[] = [];
  for (const pageResponse of pageResponses) {
    const pageText =
      pageResponse?.fullTextAnnotation?.text ||
      (Array.isArray(pageResponse?.textAnnotations)
        ? pageResponse.textAnnotations
            .map((x: any) => x?.description ?? "")
            .join(" ")
        : "");
    if (pageText) textChunks.push(String(pageText));
  }
  return textChunks.join("\n\n");
}

function inferFileExtensionFromPath(storagePath: string): string {
  return storagePath.split(".").pop()?.toLowerCase() || "";
}

function isPdfFile(mimeType: string, fileExtension: string): boolean {
  return mimeType === "application/pdf" || fileExtension === "pdf";
}

function isImageFile(mimeType: string, fileExtension: string): boolean {
  return (
    mimeType.startsWith("image/") ||
    [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "bmp",
      "webp",
      "tif",
      "tiff",
      "heic",
    ].includes(fileExtension)
  );
}

export async function extractTextWithGoogleVision(
  googleCloudVisionApiKey: string,
  fileBlob: Blob,
  storagePath: string
): Promise<{ text: string; diagnosticNote?: string }> {
  const mimeType = (fileBlob as any).type || "";
  const fileExtension = inferFileExtensionFromPath(storagePath);
  const isPdf = isPdfFile(mimeType, fileExtension);
  const isImage = !isPdf && isImageFile(mimeType, fileExtension);

  const arrayBuffer = await fileBlob.arrayBuffer();
  const base64Content = encodeToBase64(new Uint8Array(arrayBuffer));

  if (isPdf) {
    const text = await ocrPdfWithGoogleVision(
      googleCloudVisionApiKey,
      base64Content
    );
    return { text };
  }
  if (isImage) {
    const text = await ocrImageWithGoogleVision(
      googleCloudVisionApiKey,
      base64Content
    );
    const diagnosticNote =
      fileExtension === "heic"
        ? "HEIC often not supported by Vision"
        : undefined;
    return { text, diagnosticNote };
  }
  throw new Error("Unsupported file type");
}
