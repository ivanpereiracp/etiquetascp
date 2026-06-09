import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Download, Upload, ExternalLink, Printer, Save, Loader2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { renderLabelaryPNG, buildLabelaryViewerUrl, type LabelaryRotation, type LabelaryDpmm } from '@/utils/labelary';
import { isWebUsbSupported, printZPLViaWebUSB } from '@/utils/webusbZebra';
import { addHistoryItem } from '@/utils/db';
import { sendZPLToAgent } from '@/utils/zebraPrint';
import { useSettings } from '@/contexts/SettingsContext';

const DEFAULT_ZPL = `^XA
^FO50,50^A0N,40,40^FDHello Labelary^FS
^FO50,120^BY3^BCN,100,Y,N,N^FD123456789012^FS
^XZ`;

export const ZPLViewer = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [zpl, setZpl] = useState(DEFAULT_ZPL);
  const [dpmm, setDpmm] = useState<LabelaryDpmm>(8);
  const [widthIn, setWidthIn] = useState(4);
  const [heightIn, setHeightIn] = useState(6);
  const [rotation, setRotation] = useState<LabelaryRotation>(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleRender = async () => {
    setLoading(true);
    try {
      const url = await renderLabelaryPNG({
        zpl,
        dpmm,
        widthInches: widthIn,
        heightInches: heightIn,
        rotation,
      });
      setPreviewUrl(url);
    } catch (e: any) {
      toast({ title: t('viewer.renderError'), description: e?.message ?? String(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setZpl(String(reader.result || ''));
    reader.readAsText(f);
  };

  const handleExport = () => {
    const blob = new Blob([zpl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `label-${Date.now()}.zpl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveHistory = async () => {
    await addHistoryItem({
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      name: `Label ${new Date().toLocaleString()}`,
      zpl,
      thumbDataUrl: previewUrl ?? undefined,
      width: Math.round(widthIn * dpmm * 25.4),
      height: Math.round(heightIn * dpmm * 25.4),
      dpi: dpmm * 25.4,
    });
    toast({ title: t('viewer.saved') });
  };

  const handlePrintUSB = async () => {
    try {
      await printZPLViaWebUSB(zpl);
      toast({ title: t('viewer.sentToPrinter') });
    } catch (e: any) {
      toast({ title: t('viewer.printError'), description: e?.message ?? String(e), variant: 'destructive' });
    }
  };

  const handleBrowserPrint = () => {
    if (!previewUrl) {
      toast({ title: t('viewer.renderFirst'), variant: 'destructive' });
      return;
    }
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Print</title></head><body style="margin:0"><img src="${previewUrl}" style="max-width:100%"/></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4 bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t('viewer.code')}</h3>
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept=".zpl,.txt" hidden onChange={handleImport} />
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> {t('viewer.import')}
              </Button>
              <Button size="sm" variant="outline" onClick={handleExport}>
                <Download size={14} /> {t('viewer.export')}
              </Button>
            </div>
          </div>
          <Textarea
            value={zpl}
            onChange={(e) => setZpl(e.target.value)}
            className="font-mono text-xs min-h-[320px]"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('viewer.dpmm')}</Label>
              <Select value={String(dpmm)} onValueChange={(v) => setDpmm(Number(v) as LabelaryDpmm)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 dpmm (152 dpi)</SelectItem>
                  <SelectItem value="8">8 dpmm (203 dpi)</SelectItem>
                  <SelectItem value="12">12 dpmm (300 dpi)</SelectItem>
                  <SelectItem value="24">24 dpmm (600 dpi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('viewer.rotation')}</Label>
              <Select value={String(rotation)} onValueChange={(v) => setRotation(Number(v) as LabelaryRotation)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0°</SelectItem>
                  <SelectItem value="90">90°</SelectItem>
                  <SelectItem value="180">180°</SelectItem>
                  <SelectItem value="270">270°</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('viewer.widthIn')}</Label>
              <Input type="number" step="0.1" value={widthIn} onChange={(e) => setWidthIn(+e.target.value)} />
            </div>
            <div>
              <Label>{t('viewer.heightIn')}</Label>
              <Input type="number" step="0.1" value={heightIn} onChange={(e) => setHeightIn(+e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRender} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Eye size={14} />}
              {t('viewer.render')}
            </Button>
            <Button variant="outline" asChild>
              <a href={buildLabelaryViewerUrl(zpl)} target="_blank" rel="noreferrer">
                <ExternalLink size={14} /> {t('viewer.openLabelary')}
              </a>
            </Button>
            <Button variant="outline" onClick={handleSaveHistory}>
              <Save size={14} /> {t('viewer.save')}
            </Button>
          </div>
        </div>

        <div className="space-y-4 bg-card border border-border rounded-lg p-4">
          <h3 className="text-lg font-semibold">{t('viewer.preview')}</h3>
          <div className="bg-white rounded border border-border min-h-[320px] flex items-center justify-center p-4">
            {previewUrl ? (
              <img src={previewUrl} alt="ZPL preview" className="max-w-full max-h-[480px] object-contain" />
            ) : (
              <p className="text-muted-foreground text-sm">{t('viewer.noPreview')}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleBrowserPrint}>
              <Printer size={14} /> {t('viewer.browserPrint')}
            </Button>
            {isWebUsbSupported() && (
              <Button variant="outline" onClick={handlePrintUSB}>
                <Printer size={14} /> {t('viewer.usbPrint')}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={async () => {
                if (!settings.printerEndpoint) {
                  toast({ title: 'Configure a URL do agente Zebra em Configurações.', variant: 'destructive' });
                  return;
                }
                try {
                  await sendZPLToAgent(zpl, { endpoint: settings.printerEndpoint, printerName: settings.printerName });
                  toast({ title: 'Etiqueta enviada para a impressora Zebra.' });
                } catch (e: any) {
                  toast({ title: 'Falha ao imprimir', description: e?.message ?? String(e), variant: 'destructive' });
                }
              }}
            >
              <Printer size={14} /> Imprimir na Zebra (servidor)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
