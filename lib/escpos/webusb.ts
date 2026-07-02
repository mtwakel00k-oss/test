// WebUSB printer handler — runs only in browser (Chrome/Edge).
// Connects to a USB thermal printer and sends ESC/POS data.

export interface UsbPrinterInfo {
  vendorId: number
  productId: number
  productName: string
}

const THERMAL_PRINTER_FILTERS = [
  { vendorId: 0x0483, productId: 0x5743 }, // STMicroelectronics (common)
  { vendorId: 0x04b8, productId: 0x0202 }, // Epson
  { vendorId: 0x0416, productId: 0x5011 }, // Bixolon
  { vendorId: 0x1504, productId: 0x0006 }, // Star Micronics
  { vendorId: 0x0456, productId: 0x0808 }, // Citizen
  { vendorId: 0x0525, productId: 0xa4a0 }, // NetUSB (generic)
  { vendorId: 0x067b, productId: 0x2305 }, // Prolific (generic)
]

export async function requestUsbPrinter(): Promise<USBDevice | null> {
  if (!navigator.usb) {
    throw new Error("WebUSB not supported in this browser. Use Chrome or Edge.")
  }

  const device = await navigator.usb.requestDevice({
    filters: THERMAL_PRINTER_FILTERS,
  })
  return device
}

export async function connectUsbPrinter(
  device: USBDevice,
): Promise<USBDevice> {
  await device.open()
  if (device.configuration === null) {
    await device.selectConfiguration(1)
  }
  await device.claimInterface(0)
  return device
}

export async function sendToUsbPrinter(
  device: USBDevice,
  data: Uint8Array,
): Promise<void> {
  const endpoint = findOutEndpoint(device)
  if (!endpoint) {
    throw new Error("No OUT endpoint found on USB device")
  }

  const maxPacketSize = endpoint.packetSize || 64
  // Send in chunks
  for (let offset = 0; offset < data.length; offset += maxPacketSize) {
    const chunk = data.subarray(offset, offset + maxPacketSize)
    await device.transferOut(endpoint.endpointNumber, chunk as BufferSource)
  }
}

export function disconnectUsbPrinter(device: USBDevice): Promise<void> {
  return device.close()
}

function findOutEndpoint(device: USBDevice): USBEndpoint | undefined {
  for (const iface of device.configuration?.interfaces ?? []) {
    for (const alt of iface.alternates) {
      for (const ep of alt.endpoints) {
        if (ep.direction === "out") return ep
      }
    }
  }
  return undefined
}
