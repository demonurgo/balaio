const DEFAULT_MAX_BYTES = 900_000;
const JPEG_QUALITY_STEPS = [0.82, 0.74, 0.66, 0.58, 0.5, 0.42];

type OptimizeImageOptions = {
  maxBytes?: number;
  maxHeight: number;
  maxWidth: number;
};

export async function optimizeImageFile(file: File, options: OptimizeImageOptions) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Escolha uma imagem valida.");
  }

  const image = await loadImage(file);
  const scale = Math.min(1, options.maxWidth / image.naturalWidth, options.maxHeight / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Nao foi possivel preparar a imagem.");
  }

  context.fillStyle = "#f8f5ef";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  for (const quality of JPEG_QUALITY_STEPS) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);

    if (dataUrlToBytes(dataUrl) <= maxBytes) {
      return dataUrl;
    }
  }

  throw new Error("Imagem muito pesada. Tente uma foto menor.");
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Nao foi possivel ler a imagem."));
    };
    image.src = url;
  });
}

function dataUrlToBytes(dataUrl: string) {
  const [, data = ""] = dataUrl.split(",");
  return Math.ceil((data.length * 3) / 4);
}
