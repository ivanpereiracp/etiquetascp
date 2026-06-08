import { useEffect, useRef, useState } from 'react';
import { Languages, Loader2, Copy, FileText, Image as ImageIcon, X, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { createWorker, Worker } from 'tesseract.js';

const OCR_LANGS = [
  { value: 'por', label: 'Português' },
  { value: 'eng', label: 'Inglês' },
  { value: 'spa', label: 'Espanhol' },
  { value: 'fra', label: 'Francês' },
  { value: 'deu', label: 'Alemão' },
  { value: 'ita', label: 'Italiano' },
  { value: 'jpn', label: 'Japonês' },
  { value: 'chi_sim', label: 'Chinês (Simplificado)' },
  { value: 'chi_tra', label: 'Chinês (Tradicional)' },
  { value: 'ara', label: 'Árabe' },
  { value: 'rus', label: 'Russo' },
  { value: 'kor', label: 'Coreano' },
];

const TRANSLATE_LANGS = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'Inglês' },
  { value: 'es', label: 'Espanhol' },
  { value: 'fr', label: 'Francês' },
  { value: 'de', label: 'Alemão' },
  { value: 'it', label: 'Italiano' },
  { value: 'ja', label: 'Japonês' },
  { value: 'zh-CN', label: 'Chinês (Simplificado)' },
  { value: 'zh-TW', label: 'Chinês (Tradicional)' },
  { value: 'ar', label: 'Árabe' },
  { value: 'ru', label: 'Russo' },
  { value: 'ko', label: 'Coreano' },
];

const STORAGE_KEY = 'zit_ocr_state_v1';

async function translateText(text: string, from: string, to: string): Promise<string> {
  if (!text.trim()) return '';
  const chunks: string[] = [];
  // MyMemory has a ~500 char per request limit
  for (let i = 0; i < text.length; i += 450) {
    chunks.push(text.slice(i, i + 450));
  }
  const out: string[] = [];
  for (const c of chunks) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(c)}&langpair=${encodeURIComponent(from + '|' + to)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha na tradução');
    const j = await res.json();
    out.push(j?.responseData?.translatedText || '');
  }
  return out.join('');
}

const ocrToTranslateLang = (ocr: string): string => {
  const map: Record<string, string> = {
    por: 'pt', eng: 'en', spa: 'es', fra: 'fr', deu: 'de', ita: 'it',
    jpn: 'ja', chi_sim: 'zh-CN', chi_tra: 'zh-TW', ara: 'ar', rus: 'ru', kor: 'ko',
  };
  return map[ocr] || 'en';
};

export const OCRTranslator = () => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [ocrLang, setOcrLang] = useState('por');
  const [targetLang, setTargetLang] = useState('en');
  const [recognizedText, setRecognizedText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  // Persist state
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        if (s.imageDataUrl) setImageDataUrl(s.imageDataUrl);
        if (s.ocrLang) setOcrLang(s.ocrLang);
        if (s.targetLang) setTargetLang(s.targetLang);
        if (typeof s.recognizedText === 'string') setRecognizedText(s.recognizedText);
        if (typeof s.translatedText === 'string') setTranslatedText(s.translatedText);
      } catch {}
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ imageDataUrl, ocrLang, targetLang, recognizedText, translatedText }),
      );
    } catch {}
  }, [imageDataUrl, ocrLang, targetLang, recognizedText, translatedText]);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleFile = async (f: File) => {
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(reader.result as string);
    reader.readAsDataURL(f);
  };

  const runOCR = async () => {
    if (!imageDataUrl) {
      toast.error('Envie uma imagem primeiro.');
      return;
    }
    setIsProcessing(true);
    setProgress(0);
    setRecognizedText('');
    setTranslatedText('');
    setStage('Carregando modelo OCR...');
    try {
      // Recreate worker if language changed
      if (workerRef.current) {
        await workerRef.current.terminate();
        workerRef.current = null;
      }
      const worker = await createWorker(ocrLang, 1, {
        logger: (m: any) => {
          if (m.status) setStage(m.status);
          if (typeof m.progress === 'number') setProgress(Math.round(m.progress * 100));
        },
      });
      workerRef.current = worker;
      setStage('Reconhecendo texto...');
      const { data } = await worker.recognize(imageDataUrl);
      setRecognizedText(data.text || '');
      toast.success('Texto reconhecido com sucesso.');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro no OCR');
    } finally {
      setIsProcessing(false);
      setStage('');
    }
  };

  const runTranslate = async () => {
    if (!recognizedText.trim()) {
      toast.error('Faça o OCR antes de traduzir.');
      return;
    }
    setIsProcessing(true);
    setStage('Traduzindo...');
    try {
      const from = ocrToTranslateLang(ocrLang);
      const t = await translateText(recognizedText, from, targetLang);
      setTranslatedText(t);
      toast.success('Tradução concluída.');
    } catch (e: any) {
      toast.error(e?.message || 'Erro na tradução');
    } finally {
      setIsProcessing(false);
      setStage('');
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Languages className="text-primary" size={24} />
          <h2 className="text-xl font-semibold">OCR e Tradução</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Reconheça texto de uma imagem (Tesseract.js, 100% no navegador) e traduza para outro idioma
          (MyMemory API gratuita).
        </p>

        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Imagem</h3>
            {imageDataUrl ? (
              <div className="relative group">
                <div className="glass-panel rounded-lg p-4 glow-border">
                  <img
                    src={imageDataUrl}
                    alt="OCR source"
                    className="max-w-full max-h-80 mx-auto rounded object-contain"
                  />
                  <button
                    onClick={() => setImageDataUrl(null)}
                    className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <label className="upload-zone flex flex-col items-center justify-center p-8 cursor-pointer">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    if (e.target) e.target.value = '';
                  }}
                />
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <Upload size={48} />
                  <span className="text-sm">Clique para enviar uma imagem</span>
                  <span className="text-xs">PNG, JPG, BMP</span>
                </div>
              </label>
            )}

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <label className="text-sm text-muted-foreground">Idioma do OCR</label>
                <select
                  value={ocrLang}
                  onChange={(e) => setOcrLang(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white text-black border border-border font-medium"
                >
                  {OCR_LANGS.map((l) => (
                    <option key={l.value} value={l.value} className="bg-white text-black">
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Traduzir para</label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white text-black border border-border font-medium"
                >
                  {TRANSLATE_LANGS.map((l) => (
                    <option key={l.value} value={l.value} className="bg-white text-black">
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={runOCR}
                disabled={isProcessing || !imageDataUrl}
                className="download-button disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
                Reconhecer Texto
              </button>
              <button
                onClick={runTranslate}
                disabled={isProcessing || !recognizedText.trim()}
                className="tool-button flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Languages size={18} />}
                Traduzir
              </button>
            </div>

            {isProcessing && (
              <div className="mt-4">
                <div className="text-xs text-muted-foreground mb-1">
                  {stage} {progress > 0 ? `(${progress}%)` : ''}
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <FileText size={18} /> Texto reconhecido
                </h3>
                <button
                  onClick={() => copy(recognizedText)}
                  disabled={!recognizedText}
                  className="tool-button flex items-center gap-1 text-xs disabled:opacity-50"
                >
                  <Copy size={14} /> Copiar
                </button>
              </div>
              <textarea
                value={recognizedText}
                onChange={(e) => setRecognizedText(e.target.value)}
                placeholder="O texto reconhecido aparecerá aqui..."
                className="w-full h-48 p-3 rounded-lg bg-input border border-border font-mono text-sm resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Languages size={18} /> Tradução
                </h3>
                <button
                  onClick={() => copy(translatedText)}
                  disabled={!translatedText}
                  className="tool-button flex items-center gap-1 text-xs disabled:opacity-50"
                >
                  <Copy size={14} /> Copiar
                </button>
              </div>
              <textarea
                value={translatedText}
                onChange={(e) => setTranslatedText(e.target.value)}
                placeholder="A tradução aparecerá aqui..."
                className="w-full h-48 p-3 rounded-lg bg-input border border-border text-sm resize-none"
                dir={['ar', 'he', 'fa'].includes(targetLang) ? 'rtl' : 'ltr'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
