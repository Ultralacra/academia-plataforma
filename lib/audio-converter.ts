
export async function convertBlobToMp3(blob: Blob): Promise<File> {
  // 1) Decodificar blob a PCM usando AudioContext
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) throw new Error("AudioContext no soportado");
  
  // Decodificar original
  const tempCtx = new AudioCtx();
  const decoded = await tempCtx.decodeAudioData(arrayBuffer);

  // 2) Resamplear y mezclar a Mono 22050Hz (Optimización de velocidad y peso)
  const targetRate = 22050;
  // Calcular longitud exacta en muestras
  const length = Math.ceil(decoded.duration * targetRate);
  
  // Usar OfflineAudioContext para renderizar a la nueva tasa de muestreo y mezclar a mono
  const offlineCtx = new OfflineAudioContext(1, length, targetRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start(0);
  
  const rendered = await offlineCtx.startRendering();
  const pcm = rendered.getChannelData(0);
  const sampleRate = targetRate;

  // 3) Convertir Float32 PCM a Int16 para el encoder MP3
  const pcmInt16 = new Int16Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    let s = Math.max(-1, Math.min(1, pcm[i]));
    pcmInt16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  // 3) Usar lamejs para codificar a MP3
  let Mp3Encoder: any = null;

  // Helper para cargar script
  const loadScript = (src: string) => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error(`Error loading ${src}`));
      document.body.appendChild(script);
    });
  };

  try {
    // Primero intentamos usar la versión global si existe
    if (typeof (window as any).lamejs !== "undefined") {
      Mp3Encoder = (window as any).lamejs.Mp3Encoder;
    } else {
      // Si no, intentamos cargar desde CDN
      await loadScript("https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js");
      if (typeof (window as any).lamejs !== "undefined") {
        Mp3Encoder = (window as any).lamejs.Mp3Encoder;
      }
    }
  } catch (e) {
    console.error("Error cargando lamejs:", e);
  }

  if (!Mp3Encoder) {
    // Fallback: try dynamic import if CDN fails or just in case
    try {
      // @ts-ignore
      const lameMod: any = await import("lamejs");
      Mp3Encoder =
        lameMod && (lameMod.Mp3Encoder || lameMod.default?.Mp3Encoder);
    } catch {}
  }

  if (!Mp3Encoder) {
    throw new Error("Mp3Encoder no disponible. No se pudo cargar lamejs.");
  }

  const channels = 1;
  const kbps = 128; // bitrate estándar
  const encoder = new Mp3Encoder(channels, sampleRate, kbps);

  const samplesPerFrame = 1152;
  let mp3Data: Uint8Array[] = [];

  try {
    for (let i = 0; i < pcmInt16.length; i += samplesPerFrame) {
      const chunk = pcmInt16.subarray(i, i + samplesPerFrame);
      const mp3buf = encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
    const end = encoder.flush();
    if (end && end.length > 0) mp3Data.push(end);
  } catch (err) {
    console.error("Error durante la codificación MP3:", err);
    throw err;
  }

  // 4) Crear Blob/File MP3
  const mp3Blob = new Blob(mp3Data as any[], { type: "audio/mpeg" });
  const mp3File = new File([mp3Blob], `grabacion-${Date.now()}.mp3`, {
    type: "audio/mpeg",
  });

  try {
    tempCtx.close();
  } catch {}

  return mp3File;
}
