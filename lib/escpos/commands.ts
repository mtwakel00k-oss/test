// ESC/POS command constants and builder.
// Reference: https://reference.epson-biz.com/modules/ref_escpos/

export const ESC = 0x1b
export const GS = 0x1d
export const LF = 0x0a
export const FF = 0x0c

export enum Justification {
  LEFT = 0,
  CENTER = 1,
  RIGHT = 2,
}

export enum Font {
  A = 0,  // 12×24
  B = 1,  // 9×17
}

export enum CharSize {
  NORMAL = 0,
  WIDE = 1 << 4,
  TALL = 1 << 7,
  WIDE_TALL = (1 << 4) | (1 << 7),
}

export enum CutMode {
  FULL = 0,
  PARTIAL = 1,
}

export class EscPosBuilder {
  private buffer: number[] = []

  reset(): this {
    this.buffer = []
    return this
  }

  raw(data: number[] | Uint8Array): this {
    if (data instanceof Uint8Array) {
      this.buffer.push(...Array.from(data))
    } else {
      this.buffer.push(...data)
    }
    return this
  }

  text(str: string, encoding: BufferEncoding = "utf8"): this {
    const encoded = Buffer.from(str, encoding)
    this.buffer.push(...encoded)
    return this
  }

  writeline(str = ""): this {
    return this.text(str + "\n")
  }

  feed(lines = 1): this {
    for (let i = 0; i < lines; i++) this.buffer.push(LF)
    return this
  }

  // Initialize printer
  init(): this {
    return this.raw([ESC, 0x40])
  }

  // Justification
  justify(n: Justification): this {
    return this.raw([ESC, 0x61, n])
  }

  // Font selection
  font(n: Font): this {
    return this.raw([ESC, 0x4d, n])
  }

  // Character size (width + height)
  charSize(n: CharSize): this {
    return this.raw([GS, 0x21, n])
  }

  // Bold on/off
  bold(on: boolean): this {
    return this.raw([ESC, 0x45, on ? 1 : 0])
  }

  // Underline on/off
  underline(on: boolean): this {
    return this.raw([ESC, 0x2d, on ? 1 : 0])
  }

  // Double-strike on/off
  doubleStrike(on: boolean): this {
    return this.raw([ESC, 0x47, on ? 1 : 0])
  }

  // Print and feed n lines
  feedN(n: number): this {
    return this.raw([ESC, 0x64, n])
  }

  // Print and carriage return
  cr(): this {
    return this.raw([0x0d])
  }

  // Generate pulse for cash drawer
  cashDrawer(pin = 0): this {
    return this.raw([ESC, 0x70, pin === 0 ? 0 : 1, 0x19, 0x32])
  }

  // Cut paper
  cut(mode: CutMode = CutMode.FULL): this {
    return this.raw([GS, 0x56, mode])
  }

  // Horizontal line (using dashes)
  hr(char = "-", width = 42): this {
    return this.writeline(char.repeat(width))
  }

  // Barcode (CODE128)
  barcode128(data: string): this {
    const raw = Buffer.from(data, "ascii")
    const len = raw.length
    // GS k 73 = CODE128, length, data
    this.raw([GS, 0x6b, 73, len])
    this.buffer.push(...raw)
    return this
  }

  // QR Code
  qrCode(data: string, moduleSize = 4): this {
    // Set model
    this.raw([GS, 0x28, 0x6b, 4, 0, 49, 65, 50, 0])
    // Set module size
    this.raw([GS, 0x28, 0x6b, 3, 0, 49, 67, moduleSize])
    // Store data
    const bytes = Buffer.from(data, "utf8")
    const pL = (bytes.length + 3) & 0xff
    const pH = ((bytes.length + 3) >> 8) & 0xff
    this.raw([GS, 0x28, 0x6b, pL, pH, 49, 80, 48])
    this.raw([...bytes])
    // Print QR
    this.raw([GS, 0x28, 0x6b, 3, 0, 49, 81, 48])
    return this
  }

  // Build the final buffer
  build(): Uint8Array {
    return new Uint8Array(this.buffer)
  }

  // Build as Buffer (Node.js)
  buildBuffer(): Buffer {
    return Buffer.from(this.buffer)
  }
}
