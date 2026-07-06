from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import html


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs"
OUT_FILE = OUT_DIR / "goodwill_website_monthly_essentials.docx"

NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def esc(value):
    return html.escape(str(value), quote=True)


def run(text, *, bold=False, size=20, color="111827"):
    bold_xml = "<w:b/>" if bold else ""
    return (
        "<w:r>"
        "<w:rPr>"
        f"<w:rFonts w:ascii=\"Calibri\" w:hAnsi=\"Calibri\"/>"
        f"<w:color w:val=\"{color}\"/>"
        f"<w:sz w:val=\"{size}\"/>"
        f"<w:szCs w:val=\"{size}\"/>"
        f"{bold_xml}"
        "</w:rPr>"
        f"<w:t xml:space=\"preserve\">{esc(text)}</w:t>"
        "</w:r>"
    )


def para(text="", *, align="left", bold=False, size=20, color="111827", before=0, after=120):
    jc = f"<w:jc w:val=\"{align}\"/>" if align else ""
    return (
        "<w:p>"
        "<w:pPr>"
        f"<w:spacing w:before=\"{before}\" w:after=\"{after}\" w:line=\"264\" w:lineRule=\"auto\"/>"
        f"{jc}"
        "</w:pPr>"
        f"{run(text, bold=bold, size=size, color=color)}"
        "</w:p>"
    )


def cell(text, *, width, fill="FFFFFF", color="111827", bold=False, size=16, align="left"):
    return (
        "<w:tc>"
        "<w:tcPr>"
        f"<w:tcW w:w=\"{width}\" w:type=\"dxa\"/>"
        f"<w:shd w:val=\"clear\" w:color=\"auto\" w:fill=\"{fill}\"/>"
        "<w:tcMar>"
        "<w:top w:w=\"95\" w:type=\"dxa\"/>"
        "<w:start w:w=\"95\" w:type=\"dxa\"/>"
        "<w:bottom w:w=\"95\" w:type=\"dxa\"/>"
        "<w:end w:w=\"95\" w:type=\"dxa\"/>"
        "</w:tcMar>"
        "<w:vAlign w:val=\"center\"/>"
        "</w:tcPr>"
        f"{para(text, align=align, bold=bold, size=size, color=color, after=0)}"
        "</w:tc>"
    )


def row(values, widths, *, header=False, fill="FFFFFF"):
    row_pr = "<w:trPr><w:tblHeader/></w:trPr>" if header else ""
    cells = "".join(
        cell(
            value,
            width=widths[idx],
            fill="4B342A" if header else fill,
            color="FFFFFF" if header else "111827",
            bold=header or idx in {0, 4, 5},
            size=16 if header else 15,
            align="center" if idx in {4, 5} and not header else "left",
        )
        for idx, value in enumerate(values)
    )
    return f"<w:tr>{row_pr}{cells}</w:tr>"


def table(headers, rows, widths):
    grid = "".join(f"<w:gridCol w:w=\"{width}\"/>" for width in widths)
    body = row(headers, widths, header=True)
    for idx, values in enumerate(rows):
        body += row(values, widths, fill="FFFFFF" if idx % 2 == 0 else "FFFBF2")
    return (
        "<w:tbl>"
        "<w:tblPr>"
        f"<w:tblW w:w=\"{sum(widths)}\" w:type=\"dxa\"/>"
        "<w:tblInd w:w=\"0\" w:type=\"dxa\"/>"
        "<w:tblLayout w:type=\"fixed\"/>"
        "<w:tblLook w:firstRow=\"1\" w:lastRow=\"0\" w:firstColumn=\"0\" w:lastColumn=\"0\" w:noHBand=\"0\" w:noVBand=\"1\"/>"
        "<w:tblBorders>"
        "<w:top w:val=\"single\" w:sz=\"6\" w:space=\"0\" w:color=\"E2D5BF\"/>"
        "<w:left w:val=\"single\" w:sz=\"6\" w:space=\"0\" w:color=\"E2D5BF\"/>"
        "<w:bottom w:val=\"single\" w:sz=\"6\" w:space=\"0\" w:color=\"E2D5BF\"/>"
        "<w:right w:val=\"single\" w:sz=\"6\" w:space=\"0\" w:color=\"E2D5BF\"/>"
        "<w:insideH w:val=\"single\" w:sz=\"6\" w:space=\"0\" w:color=\"E2D5BF\"/>"
        "<w:insideV w:val=\"single\" w:sz=\"6\" w:space=\"0\" w:color=\"E2D5BF\"/>"
        "</w:tblBorders>"
        "</w:tblPr>"
        f"<w:tblGrid>{grid}</w:tblGrid>"
        f"{body}"
        "</w:tbl>"
    )


ROWS = [
    [
        "Website hosting",
        "Render",
        "Keeps the website online so people can visit it.",
        "Hosts the Node/Express web server and serves the React website plus backend API routes.",
        "$7/month",
        "$7/month",
        "Render's small paid web service is $7 per month. This is enough for the website now because the site is not a large high-traffic application.",
    ],
    [
        "Database, admin login, and file storage",
        "Firebase",
        "Stores website content, admin data, uploaded images, and controls admin login.",
        "Provides Firebase Authentication, Cloud Firestore database, and Firebase Storage for admin-managed content and media.",
        "$0-$5/month",
        "Likely $0/month right now",
        "Firebase usually stays free or very low for small sites. Budget $5 per month for small growth, more uploaded images, and normal church usage.",
    ],
    [
        "Email sending",
        "Resend",
        "Sends welcome emails, newsletter emails, and admin invitation emails.",
        "Handles transactional and broadcast email delivery through the site's backend API routes.",
        "$0-$20/month",
        "Likely $0/month right now",
        "Resend's free tier allows up to 3,000 emails per month. If the church needs more, the paid plan starts around $20 per month.",
    ],
    [
        "Domain name",
        "IONOS",
        "Keeps the church's web address active: goodwillpresch1867.com.",
        "Maintains DNS registration and domain ownership for the custom domain.",
        "About $1.67/month",
        "About $1.67/month",
        "A .com domain is about $20 per year through IONOS. $20 divided by 12 months is about $1.67 per month.",
    ],
    [
        "SSL certificate",
        "IONOS / SSL provider",
        "Makes the website show as secure with HTTPS.",
        "Provides an SSL/TLS certificate for encrypted browser-to-server traffic.",
        "About $10-$15/month",
        "If purchased: about $10-$15/month",
        "Render already provides SSL at no extra cost. If the church still buys a separate SSL certificate, budget about $120-$180 per year, which is about $10-$15 per month.",
    ],
    [
        "Banner/hero image generation",
        "ChatGPT / OpenAI",
        "Helps create new banner or hero images when needed.",
        "Provides AI-generated visual assets used for homepage banners and promotional slides.",
        "Optional: $0-$20/month",
        "Only if actively subscribed/using it",
        "Existing images cost $0 per month. If the church wants to keep creating new images with ChatGPT, budget about $20 per month for a ChatGPT subscription.",
    ],
]


def document_xml():
    headers = [
        "Essential service",
        "Platform used for service",
        "Why it is needed, in basic language",
        "Why it is needed, in technical language",
        "Estimated monthly cost",
        "Actual/current monthly cost",
        "Explanation of cost",
    ]
    widths = [1120, 920, 1770, 2050, 950, 1100, 2490]
    summary = (
        "Recommended monthly budget: $45/month for core website operations with a purchased SSL certificate. "
        "This gives the church room for hosting, the domain, SSL, and small increases in Firebase or email usage as the website grows."
    )
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="{NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    {para("goodwill-pc-web", align="center", bold=True, size=40, color="4B342A", after=40)}
    {para("Essential Monthly Costs to Keep the Website Running", align="center", size=24, color="925E17", after=120)}
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="14256" w:type="dxa"/>
        <w:tblLayout w:type="fixed"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="F0C36A"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="F0C36A"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="F0C36A"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="F0C36A"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid><w:gridCol w:w="14256"/></w:tblGrid>
      <w:tr>{cell(summary, width=14256, fill="FFF7E6", color="4B342A", bold=True, size=20)}</w:tr>
    </w:tbl>
    {para("Prepared June 7, 2026", align="center", size=18, color="6B7280", before=70, after=90)}
    {table(headers, ROWS, widths)}
    {para("Note: Render already includes SSL for the website. The SSL line is included because a separate purchased SSL certificate was requested for budgeting.", size=18, color="4B5563", before=120, after=0)}
    <w:sectPr>
      <w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>
      <w:pgMar w:top="792" w:right="720" w:bottom="792" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>"""


def styles_xml():
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="{NS}">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:sz w:val="20"/>
      <w:szCs w:val="20"/>
    </w:rPr>
    <w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr>
  </w:style>
  <w:style w:type="table" w:default="1" w:styleId="TableNormal">
    <w:name w:val="Normal Table"/>
    <w:tblPr><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr>
  </w:style>
</w:styles>"""


def content_types_xml():
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>"""


def root_rels_xml():
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>"""


def document_rels_xml():
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>"""


def settings_xml():
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="{NS}">
  <w:zoom w:percent="100"/>
  <w:defaultTabStop w:val="720"/>
  <w:compat/>
</w:settings>"""


def core_xml():
    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    return f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>goodwill-pc-web Monthly Essentials</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{timestamp}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{timestamp}</dcterms:modified>
</cp:coreProperties>"""


def app_xml():
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Word</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company>Goodwill Presbyterian Church</Company>
</Properties>"""


def build_docx():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with ZipFile(OUT_FILE, "w", ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types_xml())
        zf.writestr("_rels/.rels", root_rels_xml())
        zf.writestr("word/document.xml", document_xml())
        zf.writestr("word/_rels/document.xml.rels", document_rels_xml())
        zf.writestr("word/styles.xml", styles_xml())
        zf.writestr("word/settings.xml", settings_xml())
        zf.writestr("docProps/core.xml", core_xml())
        zf.writestr("docProps/app.xml", app_xml())
    return OUT_FILE


if __name__ == "__main__":
    print(build_docx())
