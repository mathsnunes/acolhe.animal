import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

/**
 * The adoption term as a fillable, signable PDF (one or two A4 pages) that mirrors
 * the org's printed term: a header with the org identity, the adopter + animal
 * fields pre-filled, the standard responsibility clauses, and signature lines.
 * Applies to digital adoptions; offline adoptions upload their own signed PDF.
 */
export const ADOPTION_TERM_VERSION = 'term-v2';

export interface AdoptionTermData {
  org: {
    name: string;
    documentLabel?: string | null;
    phone?: string | null;
    logo?: { bytes: Uint8Array; type: 'png' | 'jpg' } | null;
  };
  adopter: {
    name: string;
    cpf: string;
    phone?: string | null;
    email?: string | null;
    address: {
      street?: string | null;
      number?: string | null;
      complement?: string | null;
      neighborhood?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
    };
  };
  animal: {
    name: string;
    species: 'dog' | 'cat';
    sex?: 'male' | 'female' | null;
    color?: string | null;
    ageText?: string | null;
    microchip?: string | null;
  };
  /** The member who conducted the adoption; falls back to the org when absent. */
  responsible?: { name: string; phone?: string | null } | null;
  date: Date;
  extraClauses?: string | null;
}

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 50;
const INK = rgb(0.12, 0.16, 0.13);
const MUTE = rgb(0.42, 0.42, 0.4);

const INTRO =
  'Declaro que estou adotando o animal acima identificado de forma livre e responsável, ' +
  'comprometendo-me a garantir seu bem-estar e assumindo as seguintes responsabilidades:';

const CLAUSES: { title: string; bullets?: string[]; text?: string }[] = [
  {
    title: '1. Cuidados e bem-estar',
    bullets: [
      'Fornecer alimentação adequada e água limpa diariamente.',
      'Garantir abrigo seguro, protegido do sol, chuva e frio.',
      'Providenciar cuidados veterinários sempre que necessário.',
      'Manter vacinação e vermifugação regulares.',
    ],
  },
  {
    title: '2. Guarda responsável',
    bullets: [
      'Não abandonar, doar ou vender o animal sem comunicar previamente ao responsável pela adoção.',
      'Manter o animal em ambiente seguro, evitando fugas.',
      'Respeitar as normas de bem-estar animal previstas na legislação vigente.',
    ],
  },
  {
    title: '3. Castração',
    text: 'Caso o animal ainda não seja castrado, comprometo-me a realizar a castração quando atingir idade adequada, salvo contraindicação veterinária.',
  },
  {
    title: '4. Acompanhamento da adoção',
    text: 'Autorizo contato para acompanhamento da adaptação do animal, podendo ser solicitadas fotos ou informações.',
  },
  {
    title: '5. Devolução',
    text: 'Caso eu não possa permanecer com o animal, comprometo-me a devolvê-lo ao responsável pela adoção, não realizando abandono ou repasse irresponsável.',
  },
];

const NOTICE =
  'Declaro estar ciente de que maus-tratos e abandono de animais são crimes conforme a legislação brasileira.';

export const renderTermPdf = async (data: AdoptionTermData): Promise<Uint8Array> => {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const right = A4.w - MARGIN;
  const contentW = right - MARGIN;
  let page = pdf.addPage([A4.w, A4.h]);
  let y = A4.h - MARGIN;

  const ensure = (needed: number) => {
    if (y - needed < MARGIN) {
      page = pdf.addPage([A4.w, A4.h]);
      y = A4.h - MARGIN;
    }
  };

  const wrap = (text: string, f: PDFFont, size: number, maxW: number): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (f.widthOfTextAtSize(next, size) > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  const drawText = (
    text: string,
    x: number,
    f: PDFFont,
    size: number,
    color = INK,
  ) => {
    page.drawText(text, { x, y, size, font: f, color });
  };

  const paragraph = (text: string, f: PDFFont, size: number, gap = size * 0.5) => {
    const lines = wrap(text, f, size, contentW);
    for (const line of lines) {
      ensure(size + 2);
      drawText(line, MARGIN, f, size);
      y -= size + 2;
    }
    y -= gap;
  };

  // A labelled field on an underline: "Label: ____value____".
  const field = (label: string, value: string, x: number, width: number, size = 10) => {
    drawText(label, x, bold, size);
    const labelW = bold.widthOfTextAtSize(label, size);
    const valX = x + labelW + 4;
    const lineY = y - 2;
    page.drawLine({
      start: { x: valX, y: lineY },
      end: { x: x + width, y: lineY },
      thickness: 0.5,
      color: MUTE,
    });
    if (value) page.drawText(value, { x: valX + 2, y, size, font, color: INK });
  };

  const checkbox = (label: string, checked: boolean, x: number, size = 10): number => {
    const box = 8;
    page.drawRectangle({
      x,
      y: y - 1,
      width: box,
      height: box,
      borderColor: INK,
      borderWidth: 0.7,
    });
    if (checked) page.drawText('X', { x: x + 1.4, y: y - 0.2, size: 8, font: bold, color: INK });
    page.drawText(label, { x: x + box + 4, y, size, font, color: INK });
    return x + box + 6 + font.widthOfTextAtSize(label, size) + 14;
  };

  // ── Header: org identity (+ optional logo) ──
  if (data.org.logo) {
    try {
      const img =
        data.org.logo.type === 'png'
          ? await pdf.embedPng(data.org.logo.bytes)
          : await pdf.embedJpg(data.org.logo.bytes);
      const h = 38;
      const w = (img.width / img.height) * h;
      page.drawImage(img, { x: MARGIN, y: y - h + 8, width: w, height: h });
    } catch {
      // A bad logo image shouldn't block the term.
    }
  }
  const orgLine = [data.org.name, data.org.documentLabel, data.org.phone].filter(Boolean).join('  ·  ');
  page.drawText(orgLine, {
    x: right - font.widthOfTextAtSize(orgLine, 9),
    y: y - 4,
    size: 9,
    font,
    color: MUTE,
  });
  y -= 46;

  // ── Title ──
  const title = 'TERMO DE ADOÇÃO RESPONSÁVEL DE ANIMAL';
  drawText(title, MARGIN + (contentW - bold.widthOfTextAtSize(title, 14)) / 2, bold, 14);
  y -= 30;

  // ── Adopter block ──
  field('Nome do adotante:', data.adopter.name, MARGIN, contentW);
  y -= 22;
  field('CPF:', data.adopter.cpf, MARGIN, contentW * 0.34);
  field('Telefone:', data.adopter.phone ?? '', MARGIN + contentW * 0.36, contentW * 0.3);
  field('Email:', data.adopter.email ?? '', MARGIN + contentW * 0.68, contentW * 0.32);
  y -= 22;
  const addr = data.adopter.address;
  field('Rua:', addr.street ?? '', MARGIN, contentW * 0.78);
  field('Nº:', addr.number ?? '', MARGIN + contentW * 0.8, contentW * 0.2);
  y -= 22;
  field('Complemento:', addr.complement ?? '', MARGIN, contentW);
  y -= 22;
  field('Bairro:', addr.neighborhood ?? '', MARGIN, contentW * 0.42);
  field('Cidade:', addr.city ?? '', MARGIN + contentW * 0.44, contentW * 0.36);
  field('UF:', addr.state ?? '', MARGIN + contentW * 0.82, contentW * 0.18);
  y -= 28;

  // ── Animal block ──
  field('Nome do animal:', data.animal.name, MARGIN, contentW);
  y -= 22;
  let cx = MARGIN;
  drawText('Espécie:', cx, bold, 10);
  cx += bold.widthOfTextAtSize('Espécie:', 10) + 8;
  cx = checkbox('Cão', data.animal.species === 'dog', cx);
  cx = checkbox('Gato', data.animal.species === 'cat', cx);
  cx += 16;
  drawText('Sexo:', cx, bold, 10);
  cx += bold.widthOfTextAtSize('Sexo:', 10) + 8;
  cx = checkbox('Macho', data.animal.sex === 'male', cx);
  checkbox('Fêmea', data.animal.sex === 'female', cx);
  y -= 22;
  field('Cor / características:', data.animal.color ?? '', MARGIN, contentW);
  y -= 22;
  field('Idade aproximada:', data.animal.ageText ?? '', MARGIN, contentW * 0.5);
  field('Microchip:', data.animal.microchip ?? '', MARGIN + contentW * 0.52, contentW * 0.48);
  y -= 30;

  // ── Declaration ──
  drawText('DECLARAÇÃO DE RESPONSABILIDADE', MARGIN, bold, 11);
  y -= 18;
  paragraph(INTRO, font, 10, 8);

  for (const clause of CLAUSES) {
    ensure(16);
    drawText(clause.title, MARGIN, bold, 10);
    y -= 15;
    if (clause.bullets) {
      for (const b of clause.bullets) {
        const lines = wrap(b, font, 10, contentW - 16);
        ensure(12);
        page.drawCircle({ x: MARGIN + 4, y: y + 3, size: 1.3, color: INK });
        for (let i = 0; i < lines.length; i++) {
          ensure(12);
          drawText(lines[i]!, MARGIN + 14, font, 10);
          y -= 12;
        }
      }
      y -= 4;
    } else if (clause.text) {
      paragraph(clause.text, font, 10, 6);
    }
  }

  ensure(14);
  paragraph(NOTICE, bold, 10, 10);

  if (data.extraClauses?.trim()) {
    ensure(20);
    drawText('CLÁUSULAS ADICIONAIS', MARGIN, bold, 10);
    y -= 15;
    paragraph(data.extraClauses.trim(), font, 10, 10);
  }

  // ── Signature footer ──
  ensure(110);
  y -= 10;
  field('Local e data:', '', MARGIN, contentW);
  y -= 30;
  field('Assinatura do adotante:', '', MARGIN, contentW);
  y -= 26;
  field('Responsável pela adoção:', data.responsible?.name ?? data.org.name, MARGIN, contentW);
  y -= 26;
  field('Telefone para contato:', data.responsible?.phone ?? data.org.phone ?? '', MARGIN, contentW);

  return pdf.save();
};
