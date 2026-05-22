import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Download, History, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { listHistoryItems, deleteHistoryItem, clearHistory, type HistoryItem } from '@/utils/db';

interface Props {
  onRestore?: (item: HistoryItem) => void;
}

export const HistoryPanel = ({ onRestore }: Props) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<HistoryItem[]>([]);

  const reload = async () => setItems(await listHistoryItems());

  useEffect(() => {
    reload();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteHistoryItem(id);
    reload();
  };

  const handleClear = async () => {
    await clearHistory();
    reload();
  };

  const handleDownload = (item: HistoryItem) => {
    const blob = new Blob([item.zpl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.name}.zpl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async (item: HistoryItem) => {
    await navigator.clipboard.writeText(item.zpl);
    toast({ title: t('history.copied') });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={20} className="text-primary" />
          <h3 className="text-lg font-semibold">{t('history.title')}</h3>
          <span className="text-xs text-muted-foreground">({items.length})</span>
        </div>
        {items.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleClear}>
            <Trash2 size={14} /> {t('history.clearAll')}
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">{t('history.empty')}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it) => (
            <div key={it.id} className="border border-border rounded-lg p-3 bg-card space-y-2">
              <div className="aspect-square bg-white rounded flex items-center justify-center overflow-hidden">
                {it.thumbDataUrl ? (
                  <img src={it.thumbDataUrl} alt={it.name} className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-xs text-muted-foreground">ZPL</span>
                )}
              </div>
              <div className="text-xs">
                <p className="font-medium truncate">{it.name}</p>
                <p className="text-muted-foreground">{new Date(it.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {onRestore && (
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => onRestore(it)}>
                    {t('history.restore')}
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => handleCopy(it)}>
                  <Copy size={12} />
                </Button>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => handleDownload(it)}>
                  <Download size={12} />
                </Button>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => handleDelete(it.id)}>
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
