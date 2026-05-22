import { openDB, IDBPDatabase } from 'idb';

export interface GalleryItem {
  id: string;
  name: string;
  createdAt: number;
  width: number;
  height: number;
  dataUrl: string;
}

export interface HistoryItem {
  id: string;
  createdAt: number;
  name: string;
  zpl: string;
  thumbDataUrl?: string;
  width: number;
  height: number;
  dpi: number;
}

const DB_NAME = 'zit_db';
const STORE = 'gallery';
const HISTORY = 'history';
let dbPromise: Promise<IDBPDatabase> | null = null;

const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 2, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains(HISTORY)) {
          db.createObjectStore(HISTORY, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const addGalleryItem = async (item: GalleryItem) => {
  const db = await getDB();
  await db.put(STORE, item);
};

export const listGalleryItems = async (): Promise<GalleryItem[]> => {
  const db = await getDB();
  const items = await db.getAll(STORE);
  return (items as GalleryItem[]).sort((a, b) => b.createdAt - a.createdAt);
};

export const deleteGalleryItem = async (id: string) => {
  const db = await getDB();
  await db.delete(STORE, id);
};

export const addHistoryItem = async (item: HistoryItem) => {
  const db = await getDB();
  await db.put(HISTORY, item);
};

export const listHistoryItems = async (): Promise<HistoryItem[]> => {
  const db = await getDB();
  const items = await db.getAll(HISTORY);
  return (items as HistoryItem[]).sort((a, b) => b.createdAt - a.createdAt);
};

export const deleteHistoryItem = async (id: string) => {
  const db = await getDB();
  await db.delete(HISTORY, id);
};

export const clearHistory = async () => {
  const db = await getDB();
  await db.clear(HISTORY);
};

export const dataUrlToImageData = (dataUrl: string): Promise<ImageData> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      if (!ctx) return reject(new Error('ctx'));
      ctx.drawImage(img, 0, 0);
      resolve(ctx.getImageData(0, 0, img.width, img.height));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });

export const imageDataToDataUrl = (data: ImageData): string => {
  const c = document.createElement('canvas');
  c.width = data.width;
  c.height = data.height;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  ctx.putImageData(data, 0, 0);
  return c.toDataURL('image/png');
};
