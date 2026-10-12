// Rasteriza las páginas de un PDF a PNG con PDFKit (macOS). Uso: swift pdf2png.swift <pdf> <dir> [maxPaginas]
import Foundation
import PDFKit
import AppKit
let args = CommandLine.arguments
guard let doc = PDFDocument(url: URL(fileURLWithPath: args[1])) else { exit(1) }
let outDir = args[2]
let base = URL(fileURLWithPath: args[1]).deletingPathExtension().lastPathComponent
let maxPages = args.count > 3 ? Int(args[3]) ?? 1 : 1
let scale: CGFloat = 1.4
for i in 0..<min(doc.pageCount, maxPages) {
  guard let page = doc.page(at: i) else { continue }
  let box = page.bounds(for: .mediaBox)
  let size = NSSize(width: box.width * scale, height: box.height * scale)
  let img = NSImage(size: size)
  img.lockFocus()
  NSColor.white.set(); NSRect(origin: .zero, size: size).fill()
  let ctx = NSGraphicsContext.current!.cgContext
  ctx.scaleBy(x: scale, y: scale)
  page.draw(with: .mediaBox, to: ctx)
  img.unlockFocus()
  let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
  try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "\(outDir)/\(base)-p\(i+1).png"))
}
