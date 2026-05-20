import { useTranslation } from 'react-i18next';
import { Settings as SettingsIcon, Upload, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useSettings, hexToHsl, hslToHex } from '@/contexts/SettingsContext';

const FONT_OPTIONS = ['Inter', 'Roboto', 'Poppins', 'JetBrains Mono', 'system-ui'];
const LANG_OPTIONS = [
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

export const SettingsPanel = () => {
  const { t, i18n } = useTranslation();
  const { settings, update, reset } = useSettings();
  const [open, setOpen] = useState(false);

  const onLogo = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => update({ logoDataUrl: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label={t('settings.open')}
          className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
        >
          <SettingsIcon size={20} />
        </button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <SettingsIcon size={20} /> {t('settings.title')}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Language */}
          <section className="space-y-2">
            <label className="text-sm font-medium">{t('settings.language')}</label>
            <select
              value={i18n.language.split('-')[0]}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="w-full bg-white text-black border border-border rounded-lg px-3 py-2"
            >
              {LANG_OPTIONS.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </section>

          {/* Branding */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('settings.branding')}
            </h3>
            <div className="space-y-2">
              <label className="text-sm">{t('settings.siteName')}</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => update({ siteName: e.target.value })}
                className="w-full bg-input border border-border rounded-lg px-3 py-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm">{t('settings.siteSubtitle')}</label>
              <input
                type="text"
                value={settings.siteSubtitle}
                onChange={(e) => update({ siteSubtitle: e.target.value })}
                className="w-full bg-input border border-border rounded-lg px-3 py-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm">{t('settings.logo')}</label>
              <div className="flex items-center gap-3">
                {settings.logoDataUrl && (
                  <img src={settings.logoDataUrl} alt="logo" className="h-10 w-10 object-contain bg-white rounded" />
                )}
                <label className="tool-button cursor-pointer flex items-center gap-2 text-sm">
                  <Upload size={14} /> {t('settings.uploadLogo')}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])}
                  />
                </label>
                {settings.logoDataUrl && (
                  <button
                    onClick={() => update({ logoDataUrl: null })}
                    className="text-xs text-destructive flex items-center gap-1"
                  >
                    <X size={14} /> {t('settings.removeLogo')}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Colors */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('settings.colors')}
            </h3>
            <ColorRow
              label={t('settings.primary')}
              hsl={settings.primaryHsl}
              onChange={(hsl) => update({ primaryHsl: hsl })}
            />
            <ColorRow
              label={t('settings.secondary')}
              hsl={settings.secondaryHsl}
              onChange={(hsl) => update({ secondaryHsl: hsl })}
            />
            <div className="space-y-2">
              <label className="text-sm">{t('settings.editorBg')}</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.editorBg}
                  onChange={(e) => update({ editorBg: e.target.value })}
                  className="h-10 w-14 rounded cursor-pointer bg-transparent border border-border"
                />
                <input
                  type="text"
                  value={settings.editorBg}
                  onChange={(e) => update({ editorBg: e.target.value })}
                  className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>

          {/* Font */}
          <section className="space-y-2">
            <label className="text-sm font-medium">{t('settings.font')}</label>
            <select
              value={settings.fontFamily}
              onChange={(e) => update({ fontFamily: e.target.value })}
              className="w-full bg-white text-black border border-border rounded-lg px-3 py-2"
            >
              {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </section>

          <button
            onClick={reset}
            className="tool-button w-full flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} /> {t('settings.reset')}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const ColorRow = ({
  label, hsl, onChange,
}: { label: string; hsl: string; onChange: (hsl: string) => void }) => {
  const hex = hslToHex(hsl);
  return (
    <div className="space-y-2">
      <label className="text-sm">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(hexToHsl(e.target.value))}
          className="h-10 w-14 rounded cursor-pointer bg-transparent border border-border"
        />
        <code className="text-xs text-muted-foreground flex-1">hsl({hsl})</code>
      </div>
    </div>
  );
};
