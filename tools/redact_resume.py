"""Make the public resume copy: remove the phone number from the header line and re-centre what is left.
The PDF's text is vector outlines (no text layer), so the number's shapes are removed from the page itself."""
import pymupdf, sys

SRC, OUT = sys.argv[1], sys.argv[2]
PHONE = pymupdf.Rect(402, 54, 493, 66)       # "Mob: +91 ..." on the contact line
BAND_Y = (52, 67.5)                          # the contact line only (rules and name are outside it)
SHIFT = 47.0                                 # re-centres Email + LinkedIn on the page

a = pymupdf.open(SRC); pa = a[0]
pa.add_redact_annot(PHONE)
pa.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=pymupdf.PDF_REDACT_LINE_ART_REMOVE_IF_TOUCHED)

out = pymupdf.open(); r = pa.rect
pg = out.new_page(width=r.width, height=r.height)
pg.show_pdf_page(pymupdf.Rect(0, 0, r.width, BAND_Y[0]), a, 0, clip=pymupdf.Rect(0, 0, r.width, BAND_Y[0]))
pg.show_pdf_page(pymupdf.Rect(0, BAND_Y[1], r.width, r.height), a, 0, clip=pymupdf.Rect(0, BAND_Y[1], r.width, r.height))
band = pymupdf.Rect(0, BAND_Y[0], PHONE.x0, BAND_Y[1])
pg.show_pdf_page(band + (SHIFT, 0, SHIFT, 0), a, 0, clip=band)
out.set_metadata({"title": "Rakesh Meshua: Resume", "author": "Rakesh Meshua"})
out.save(OUT, garbage=4, deflate=True)
