// Best-effort direct print to a USB-connected Zebra printer using WebUSB.
// Falls back gracefully if the API or device is unavailable.

const ZEBRA_VENDOR_ID = 0x0a5f;

export const isWebUsbSupported = (): boolean =>
  typeof navigator !== 'undefined' && 'usb' in navigator;

export const printZPLViaWebUSB = async (zpl: string): Promise<void> => {
  if (!isWebUsbSupported()) {
    throw new Error('WebUSB não suportado neste navegador.');
  }
  // @ts-expect-error - WebUSB types not in TS lib
  const device: any = await navigator.usb.requestDevice({
    filters: [{ vendorId: ZEBRA_VENDOR_ID }],
  });
  await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
  const iface = device.configuration.interfaces[0];
  await device.claimInterface(iface.interfaceNumber);
  const endpoint = iface.alternates[0].endpoints.find(
    (e: any) => e.direction === 'out',
  );
  if (!endpoint) throw new Error('Endpoint OUT não encontrado.');
  const data = new TextEncoder().encode(zpl);
  await device.transferOut(endpoint.endpointNumber, data);
  await device.close();
};
