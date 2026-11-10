from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


SOURCE = Path(r"C:\Users\jpbra\AppData\Local\Packages\5319275A.WhatsAppDesktop_cv1g1gvanyjgm\LocalState\sessions\469CEAD367E1F5F9102716454A32DB0BEB819D91\transfers\2026-42\Relatorio_Estatistica_Atividade3.pdf")
OUTPUT = Path(r"C:\Users\jpbra\Documents\GitHub\Cofrin\output\pdf\Relatorio_Estatistica_Atividade3_formatado.pdf")
COVER = Path(r"C:\Users\jpbra\Documents\GitHub\Cofrin\tmp\pdfs\cover.pdf")


def make_cover() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    COVER.parent.mkdir(parents=True, exist_ok=True)
    font_path = Path(r"C:\Windows\Fonts\arial.ttf")
    bold_path = Path(r"C:\Windows\Fonts\arialbd.ttf")
    if font_path.exists() and bold_path.exists():
        pdfmetrics.registerFont(TTFont("Arial", str(font_path)))
        pdfmetrics.registerFont(TTFont("Arial-Bold", str(bold_path)))
        regular, bold = "Arial", "Arial-Bold"
    else:
        regular, bold = "Helvetica", "Helvetica-Bold"

    doc = SimpleDocTemplate(
        str(COVER), pagesize=A4, leftMargin=2.8 * cm, rightMargin=2.8 * cm,
        topMargin=2.2 * cm, bottomMargin=2.2 * cm,
    )
    navy = colors.HexColor("#222222")
    center = ParagraphStyle("center", fontName=regular, fontSize=13, leading=18,
                            alignment=TA_CENTER, textColor=navy)
    institution = ParagraphStyle("institution", parent=center, fontName=bold,
                                 fontSize=13, leading=18)
    title = ParagraphStyle("title", parent=center, fontName=bold, fontSize=23,
                           leading=30, spaceAfter=6)
    subtitle = ParagraphStyle("subtitle", parent=center, fontName=bold, fontSize=18,
                              leading=24)
    author = ParagraphStyle("author", parent=center, fontName=regular, fontSize=12,
                            leading=19)
    small = ParagraphStyle("small", parent=center, fontSize=11, leading=16)

    story = [
        Spacer(1, 0.6 * cm),
        Paragraph("FUNDAÇÃO EDSON QUEIROZ", institution),
        Paragraph("UNIVERSIDADE DE FORTALEZA", institution),
        Spacer(1, 0.15 * cm),
        Paragraph("Centro de Ciências Tecnológicas", center),
        Paragraph("Métodos Quantitativos em Computação", center),
        Spacer(1, 3.0 * cm),
        Paragraph("ATIVIDADE 3", title),
        Paragraph("Correlação e Regressão Linear", subtitle),
        Spacer(1, 2.6 * cm),
    ]
    story += [
        Paragraph("INTEGRANTES", ParagraphStyle("ah", parent=author, fontName=bold, fontSize=11, leading=16)),
        Spacer(1, 0.15 * cm),
        Paragraph("João Pedro Braga — Matrícula 2517424", author),
        Paragraph("João Pedro Eugenio Costa Rodrigues — Matrícula 2513839", author),
    ]
    story += [Spacer(1, 4.4 * cm), Paragraph("Fortaleza — Ceará", small), Paragraph("Outubro de 2026", small)]
    doc.build(story)


def merge() -> None:
    make_cover()
    cover_reader = PdfReader(str(COVER))
    source_reader = PdfReader(str(SOURCE))
    writer = PdfWriter()
    writer.add_page(cover_reader.pages[0])
    for page in source_reader.pages[2:]:
        writer.add_page(page)
    with OUTPUT.open("wb") as handle:
        writer.write(handle)

    # Rasterize the complete report in grayscale so charts and text share one
    # restrained visual language. The source PDF remains untouched.
    import subprocess
    from PIL import Image
    rendered = OUTPUT.parent.parent / ".." / "tmp" / "pdfs" / "gray-pages"
    rendered = rendered.resolve()
    rendered.mkdir(parents=True, exist_ok=True)
    prefix = rendered / "page"
    subprocess.run(["pdftoppm", "-gray", "-r", "180", str(OUTPUT), str(prefix)], check=True)
    page_files = sorted(rendered.glob("page-*.pgm"))
    images = [Image.open(path).convert("L") for path in page_files]
    if images:
        images[0].save(OUTPUT, save_all=True, append_images=images[1:], resolution=180.0)


if __name__ == "__main__":
    merge()
