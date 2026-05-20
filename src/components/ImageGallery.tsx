import { useEffect, useState } from 'react';
import { Trash2, Images, RefreshCw } from 'lucide-react';
import { GalleryItem, listGalleryItems, deleteGalleryItem, dataUrlToImageData } from '@/utils/db';

interface ImageGalleryProps {
  onPick: (data: ImageData, name: string) => void;
  refreshKey?: number;
}

export const ImageGallery = ({ onPick, refreshKey }: ImageGalleryProps) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = async () => setItems(await listGalleryItems());

  useEffect(() => { refresh(); }, [refreshKey]);

  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          className="flex items-center gap-2 text-sm font-medium hover:text-primary transition"
          onClick={() => setOpen((o) => !o)}
        >
          <Images size={18} className="text-primary" />
          Galeria Local ({items.length})
        </button>
        <button
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          onClick={refresh}
          aria-label="Atualizar"
        >
          <RefreshCw size={14} />
        </button>
      </div>
      {open && (
        items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma imagem salva. Suas imagens carregadas aparecerão aqui.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-64 overflow-auto">
            {items.map((it) => (
              <div key={it.id} className="relative group border border-border rounded overflow-hidden bg-white">
                <img
                  src={it.dataUrl}
                  alt={it.name}
                  className="w-full h-20 object-contain cursor-pointer"
                  onClick={async () => {
                    const d = await dataUrlToImageData(it.dataUrl);
                    onPick(d, it.name);
                  }}
                />
                <button
                  className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded opacity-0 group-hover:opacity-100 transition"
                  onClick={async (e) => { e.stopPropagation(); await deleteGalleryItem(it.id); refresh(); }}
                  aria-label="Excluir"
                >
                  <Trash2 size={12} />
                </button>
                <div className="text-[10px] text-foreground/80 truncate px-1 bg-background/80">{it.name}</div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
