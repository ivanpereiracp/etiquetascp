import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer, FileCode, Contrast, Grid3X3, Tag, Barcode, Eye, History, Languages } from 'lucide-react';
import { GRFConverter } from '@/components/GRFConverter';
import { BlackWhiteConverter } from '@/components/BlackWhiteConverter';
import { RasterConverter } from '@/components/RasterConverter';
import { ZPLLabelCreator } from '@/components/ZPLLabelCreator';
import { BarcodeGenerator } from '@/components/BarcodeGenerator';
import { ZPLViewer } from '@/components/ZPLViewer';
import { HistoryPanel } from '@/components/HistoryPanel';
import { OCRTranslator } from '@/components/OCRTranslator';
import { SettingsPanel } from '@/components/SettingsPanel';
import { useSettings } from '@/contexts/SettingsContext';

type TabType = 'grf' | 'bw' | 'raster' | 'zpl' | 'barcode' | 'viewer' | 'ocr' | 'history';

const Index = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('zit_active_tab');
    return (saved as TabType) || 'grf';
  });

  // Persist active tab
  useEffect(() => {
    localStorage.setItem('zit_active_tab', activeTab);
  }, [activeTab]);

  const tabs = [
    { id: 'grf' as TabType, label: t('tabs.grf'), icon: FileCode },
    { id: 'bw' as TabType, label: t('tabs.bw'), icon: Contrast },
    { id: 'raster' as TabType, label: t('tabs.raster'), icon: Grid3X3 },
    { id: 'zpl' as TabType, label: t('tabs.zpl'), icon: Tag },
    { id: 'barcode' as TabType, label: t('tabs.barcode'), icon: Barcode },
    { id: 'viewer' as TabType, label: t('tabs.viewer'), icon: Eye },
    { id: 'ocr' as TabType, label: t('tabs.ocr'), icon: Languages },
    { id: 'history' as TabType, label: t('tabs.history'), icon: History },
  ];

  return (
    <div className="min-h-screen bg-background grid-pattern">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-primary/20 rounded-lg glow-border shrink-0">
              {settings.logoDataUrl ? (
                <img src={settings.logoDataUrl} alt="logo" className="h-7 w-7 object-contain" />
              ) : (
                <Printer className="text-primary" size={28} />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground truncate">{settings.siteName || t('app.title')}</h1>
              <p className="text-sm text-muted-foreground truncate">{settings.siteSubtitle || t('app.subtitle')}</p>
            </div>
          </div>
          <SettingsPanel />
        </div>
      </header>

      <nav className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition-all
                             border-b-2 whitespace-nowrap
                             ${activeTab === tab.id
                               ? 'border-primary text-primary bg-primary/5'
                               : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {/* Keep all panels mounted so state persists across tab switches */}
        <div hidden={activeTab !== 'grf'}><GRFConverter /></div>
        <div hidden={activeTab !== 'bw'}><BlackWhiteConverter /></div>
        <div hidden={activeTab !== 'raster'}><RasterConverter /></div>
        <div hidden={activeTab !== 'zpl'}><ZPLLabelCreator /></div>
        <div hidden={activeTab !== 'barcode'}><BarcodeGenerator /></div>
        <div hidden={activeTab !== 'viewer'}><ZPLViewer /></div>
        <div hidden={activeTab !== 'ocr'}><OCRTranslator /></div>
        <div hidden={activeTab !== 'history'}><HistoryPanel /></div>
      </main>

      <footer className="border-t border-border/50 bg-card/30 mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>{t('app.footer')}</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
