import PDFDocument from "pdfkit"

export interface ReportRow {
  label: string
  value: string
}

export interface ReportTable {
  headers: string[]
  rows: string[][]
}

export interface DailyReportData {
  restaurantName: string
  date: string
  summary: ReportRow[]
  orderTypeBreakdown: ReportTable
  topProducts: ReportTable
}

export interface MonthlyReportData {
  restaurantName: string
  month: string
  summary: ReportRow[]
  dailyBreakdown: ReportTable
  orderTypeBreakdown: ReportTable
  topProducts: ReportTable
}

function drawHeader(doc: PDFKit.PDFDocument, text: string) {
  doc.fontSize(18).font("Helvetica-Bold").text(text, { align: "center" })
  doc.moveDown(0.5)
}

function drawSubHeader(doc: PDFKit.PDFDocument, text: string) {
  doc.fontSize(11).font("Helvetica").text(text, { align: "center" })
  doc.moveDown(1)
}

function drawSection(doc: PDFKit.PDFDocument, title: string, rows: ReportRow[]) {
  doc.fontSize(12).font("Helvetica-Bold").text(title)
  doc.moveDown(0.3)
  for (const r of rows) {
    doc.fontSize(10).font("Helvetica")
    doc.text(`${r.label}:  `, { continued: true })
    doc.font("Helvetica-Bold").text(r.value)
  }
  doc.moveDown(0.5)
}

function drawTable(doc: PDFKit.PDFDocument, title: string, table: ReportTable) {
  doc.fontSize(12).font("Helvetica-Bold").text(title)
  doc.moveDown(0.3)

  const colWidth = 460 / table.headers.length

  doc.fontSize(9).font("Helvetica-Bold")
  for (const h of table.headers) {
    doc.text(h, { width: colWidth, continued: true })
  }
  doc.moveDown(0.3)
  doc.moveTo(50, doc.y).lineTo(510, doc.y).stroke("#cccccc")
  doc.moveDown(0.3)

  doc.fontSize(9).font("Helvetica")
  for (const row of table.rows) {
    for (const cell of row) {
      doc.text(cell, { width: colWidth, continued: true })
    }
    doc.moveDown(0.2)
  }
  doc.moveDown(0.8)
}

export function buildDailyReportPdf(data: DailyReportData): Buffer {
  const doc = new PDFDocument({ margin: 50, size: "A4" })
  const chunks: Buffer[] = []
  doc.on("data", (chunk: Buffer) => chunks.push(chunk))

  drawHeader(doc, data.restaurantName)
  drawSubHeader(doc, data.date)

  doc.moveTo(50, doc.y).lineTo(510, doc.y).stroke("#000000")
  doc.moveDown(1)

  drawSection(doc, "", data.summary)

  doc.moveTo(50, doc.y).lineTo(510, doc.y).stroke("#cccccc")
  doc.moveDown(0.8)

  drawTable(doc, "", data.orderTypeBreakdown)
  drawTable(doc, "", data.topProducts)

  doc.moveDown(1)
  doc.fontSize(8).font("Helvetica").fillColor("#999999")
  doc.text(`Generated: ${new Date().toLocaleString()}`, { align: "center" })

  doc.end()
  return Buffer.concat(chunks)
}

export function buildMonthlyReportPdf(data: MonthlyReportData): Buffer {
  const doc = new PDFDocument({ margin: 50, size: "A4" })
  const chunks: Buffer[] = []
  doc.on("data", (chunk: Buffer) => chunks.push(chunk))

  drawHeader(doc, data.restaurantName)
  drawSubHeader(doc, data.month)

  doc.moveTo(50, doc.y).lineTo(510, doc.y).stroke("#000000")
  doc.moveDown(1)

  drawSection(doc, "", data.summary)

  doc.moveTo(50, doc.y).lineTo(510, doc.y).stroke("#cccccc")
  doc.moveDown(0.8)

  drawTable(doc, "", data.dailyBreakdown)
  drawTable(doc, "", data.orderTypeBreakdown)
  drawTable(doc, "", data.topProducts)

  doc.moveDown(1)
  doc.fontSize(8).font("Helvetica").fillColor("#999999")
  doc.text(`Generated: ${new Date().toLocaleString()}`, { align: "center" })

  doc.end()
  return Buffer.concat(chunks)
}
