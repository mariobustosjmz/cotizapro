/** Estilos de impresión (A4) del documento de presentación para MEGAGLASS. */
export const DOC_CSS = `
  @page { size: A4; margin: 14mm 13mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color: #111827; font-size: 10.5px; line-height: 1.45; margin: 0; }
  h1 { font-size: 27px; line-height: 1.15; margin: 4px 0 10px; } h2 { font-size: 17px; margin: 2px 0 8px; } h3 { font-size: 12.5px; margin: 14px 0 6px; color: #1f2937; }
  a { color: #c2410c; text-decoration: none; } code { font-family: Menlo, monospace; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
  .brand { color: #ea580c; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; font-size: 10.5px; margin: 0; }
  .lead { font-size: 12px; color: #374151; } .muted { color: #6b7280; font-size: 10px; }
  .cover, .page { page-break-after: always; } .page:last-child { page-break-after: auto; }
  table { border-collapse: collapse; width: 100%; }
  .access { display: grid; grid-template-columns: 1fr 170px; gap: 16px; border: 2px solid #fdba74; background: #fff7ed; border-radius: 10px; padding: 12px 14px; margin: 14px 0; }
  .access h3 { margin-top: 0; } .pw { font-size: 12px; font-weight: 700; color: #9a3412; }
  .qr { text-align: center; } .qr img { width: 150px; height: 150px; } .qr p { margin: 4px 0 0; font-size: 9.5px; word-break: break-all; }
  .kv th { text-align: left; width: 120px; color: #6b7280; font-weight: 600; vertical-align: top; padding: 3px 8px 3px 0; } .kv td { padding: 3px 0; }
  .grid td { border-top: 1px solid #fed7aa; padding: 4px 6px 4px 0; }
  .toc { columns: 2; font-size: 11.5px; line-height: 1.8; }
  .compare th, .compare td, .index th, .index td { border-bottom: 1px solid #f3f4f6; padding: 6px; text-align: left; vertical-align: top; }
  .compare thead th, .index thead th { background: #fff7ed; color: #9a3412; font-size: 10px; }
  .compare tbody th { width: 120px; color: #9a3412; } .compare td:nth-child(3) { color: #065f46; }
  .r { text-align: right !important; white-space: nowrap; }
  .flow { display: flex; flex-wrap: wrap; gap: 6px; } .flow span { background: #f3f4f6; border-radius: 999px; padding: 5px 10px; font-size: 10px; }
  .flow b { color: #ea580c; margin-right: 5px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0; }
  .kpis div { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; font-size: 10px; color: #6b7280; }
  .kpis b { display: block; font-size: 15px; color: #111827; }
  .st { border-radius: 999px; padding: 1px 7px; font-size: 9.5px; font-weight: 600; background: #f3f4f6; white-space: nowrap; }
  .st-cobrado { background: #dcfce7; color: #166534; } .st-rejected { background: #fee2e2; color: #991b1b; } .st-en_instalacion { background: #cffafe; color: #155e75; }
  .st-completado { background: #ccfbf1; color: #115e59; } .st-accepted { background: #d1fae5; color: #065f46; } .st-viewed { background: #ede9fe; color: #5b21b6; } .st-sent { background: #dbeafe; color: #1e40af; }
  .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 8px 0; }
  figure { margin: 0; } figure img { width: 100%; border-radius: 6px; border: 1px solid #e5e7eb; } figcaption { font-size: 9.5px; color: #4b5563; text-align: center; margin-top: 2px; }
  .twocol { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .pdf .shot img { max-height: 225mm; } .nw { white-space: nowrap; }
  .reviews { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  blockquote { margin: 0 0 8px; padding: 8px 10px; background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 4px; font-size: 10.5px; }
  .module .kv { margin-bottom: 8px; }
  .shot { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; text-align: center; background: #f9fafb; margin-bottom: 10px; }
  .shot img { max-width: 100%; max-height: 200mm; object-fit: contain; display: block; margin: 0 auto; }
  .shot.split { display: flex; justify-content: center; gap: 12px; padding: 10px; background: #f3f4f6; }
  .shot.split .col { overflow: hidden; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,.15); background: #fff; }
  .shot.split .col img { max-width: none; max-height: none; }
  .phones { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
  .phones figure { width: 30%; } .phone { border-radius: 14px; border: 3px solid #111827; height: 96mm; object-fit: cover; object-position: top; }
  .phone.tall { height: 150mm; } .phones.solo figure { width: 45%; }
  ul.check, ol.check { line-height: 1.8; font-size: 11px; } ol.check { list-style: none; padding-left: 4px; }
  .faq dt { font-weight: 700; margin-top: 8px; color: #9a3412; } .faq dd { margin: 2px 0 0; font-size: 10.5px; }
  .rating td.box { text-align: center; font-size: 14px; } .rating th:not(:first-child) { text-align: center; width: 34px; }
  .q { font-weight: 600; margin: 12px 0 2px; } .lines { height: 44px; background: repeating-linear-gradient(transparent, transparent 21px, #d1d5db 22px); }
`
