import { useState } from 'react';
import { Printer, FileCode, Contrast, Grid3X3, Tag } from 'lucide-react';
import { GRFConverter } from '@/components/GRFConverter';
import { BlackWhiteConverter } from '@/components/BlackWhiteConverter';
import { RasterConverter } from '@/components/RasterConverter';
import { ZPLLabelCreator } from '@/components/ZPLLabelCreator';

type TabType = 'grf' | 'bw' | 'raster' | 'zpl';

const tabs = [
  { id: 'grf' as TabType, label: 'Conversor GRF', icon: FileCode },
  { id: 'bw' as TabType, label: 'Preto e Branco', icon: Contrast },
  { id: 'raster' as TabType, label: 'Raster', icon: Grid3X3 },
  { id: 'zpl' as TabType, label: 'Etiquetas ZPL', icon: Tag },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>('grf');

  return (
    <div className="min-h-screen bg-background grid-pattern">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg glow-border">
              <Printer className="text-primary" size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Zebra Image Tools</h1>
              <p className="text-sm text-muted-foreground">Processamento de imagens para impressoras Zebra</p>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'grf' && <GRFConverter />}
        {activeTab === 'bw' && <BlackWhiteConverter />}
        {activeTab === 'raster' && <RasterConverter />}
        {activeTab === 'zpl' && <ZPLLabelCreator />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 mt-auto">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Ferramenta de processamento de imagens para impressoras térmicas Zebra</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
