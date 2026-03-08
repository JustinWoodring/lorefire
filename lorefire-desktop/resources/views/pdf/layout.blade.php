<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>@yield('title', 'Lorefire Chronicle')</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    width: 210mm;
    background: #0e0c0a;
    color: #c8bfa8;
    font-family: 'EB Garamond', 'Palatino Linotype', Palatino, Georgia, serif;
    font-size: 11pt;
    line-height: 1.7;
  }

  @page { size: A4; margin: 0; }

  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 16mm 18mm;
    page-break-after: always;
    background: #0e0c0a;
    position: relative;
  }
  .page:last-child { page-break-after: avoid; }

  h1, h2, h3 {
    font-family: 'Cinzel', 'Palatino Linotype', Palatino, serif;
    color: #f0ead8;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    line-height: 1.3;
  }
  h1 { font-size: 22pt; font-weight: 700; margin-bottom: 4mm; }
  h2 { font-size: 13pt; font-weight: 600; margin-bottom: 3mm; }
  h3 { font-size: 10pt; font-weight: 600; margin-bottom: 2mm; color: #c9963a; }

  p  { margin-bottom: 3mm; color: #c8bfa8; }
  em { font-style: italic; }
  strong { color: #f0ead8; font-weight: 600; }

  .divider {
    display: block;
    width: 100%;
    height: 1px;
    background: linear-gradient(to right, transparent, #8b6c3e, transparent);
    margin: 5mm 0;
  }

  .cover-header {
    border-bottom: 1px solid #2e2a22;
    padding-bottom: 4mm;
    margin-bottom: 6mm;
  }
  .cover-meta {
    font-family: 'Cinzel', serif;
    font-size: 8pt;
    color: #c9963a;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 2mm;
  }
  .cover-sub {
    font-size: 9pt;
    color: #6b6050;
    margin-top: 1mm;
  }

  .summary-body p {
    font-size: 11pt;
    line-height: 1.8;
    margin-bottom: 3.5mm;
    text-align: justify;
    hyphens: auto;
  }
  .summary-body h2 {
    font-size: 11pt;
    color: #c9963a;
    margin-top: 5mm;
    margin-bottom: 2mm;
    font-weight: 600;
  }

  .scenes-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5mm;
    margin-top: 4mm;
  }
  .scene-card {
    background: #141210;
    border: 1px solid #2e2a22;
    border-radius: 2mm;
    overflow: hidden;
    page-break-inside: avoid;
  }
  .scene-card img {
    width: 100%;
    display: block;
    aspect-ratio: 10 / 7;
    object-fit: contain;
    background: #0e0c0a;
  }
  .scene-label {
    padding: 2mm 3mm;
    font-family: 'Cinzel', serif;
    font-size: 7pt;
    color: #c9963a;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border-top: 1px solid #2e2a22;
  }

  .scene-inline {
    margin: 8mm 0 6mm;
    background: #141210;
    border: 1px solid #2e2a22;
    border-radius: 2mm;
    overflow: hidden;
    page-break-inside: avoid;
  }
  .scene-inline-wrap {
    padding-top: 14mm;
    page-break-inside: avoid;
  }
  .scene-inline img {
    width: 100%;
    display: block;
    aspect-ratio: 10 / 7;
    object-fit: contain;
    background: #0e0c0a;
  }
  .scene-inline .scene-label {
    border-top: 1px solid #2e2a22;
  }

  .party-portrait {
    width: 100%;
    border-radius: 2mm;
    border: 1px solid #2e2a22;
    display: block;
    margin-bottom: 6mm;
    aspect-ratio: 10 / 7;
    object-fit: contain;
    background: #0e0c0a;
  }

  .session-block {
    margin-bottom: 10mm;
  }
  .session-number {
    font-family: 'Cinzel', serif;
    font-size: 8pt;
    color: #8b6c3e;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 1mm;
  }
  .session-date {
    font-size: 8pt;
    color: #6b6050;
    margin-bottom: 3mm;
  }

  .footer {
    position: absolute;
    bottom: 10mm;
    left: 18mm;
    right: 18mm;
    padding-top: 3mm;
    border-top: 1px solid #2e2a22;
    font-size: 7pt;
    color: #6b6050;
    font-family: 'Cinzel', serif;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>
@yield('content')
</body>
</html>
