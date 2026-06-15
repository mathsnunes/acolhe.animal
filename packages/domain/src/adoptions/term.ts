import { formatCpf } from '@acolhe-animal/shared';

/**
 * The canonical adoption term. Lives here as a versioned template string with
 * placeholders (`modelagem-dados.md` › Adoption). Org-specific `extraClauses` are
 * appended under their own header. Applies to digital adoptions only.
 *
 * Note: the MVP stores the rendered term as an HTML document and hashes its bytes.
 * Rendering to a polished PDF (pdf-lib / react-pdf) is a follow-up that keeps this
 * composition unchanged.
 */
export const ADOPTION_TERM_VERSION = 'term-v1';

export interface AdoptionTermParams {
  organizationName: string;
  adopterName: string;
  adopterDocument: string;
  animalName: string;
  animalSpecies: 'dog' | 'cat';
  date: Date;
  extraClauses?: string | null;
}

export const composeAdoptionTerm = (params: AdoptionTermParams): string => {
  const species = params.animalSpecies === 'dog' ? 'cão' : 'gato';
  const dateStr = params.date.toLocaleDateString('pt-BR');

  const canonical = `
TERMO DE ADOÇÃO RESPONSÁVEL

Pelo presente termo, ${params.adopterName}, portador(a) do CPF ${formatCpf(
    params.adopterDocument,
  )}, declara adotar o ${species} de nome "${params.animalName}", até então sob a guarda da organização ${params.organizationName}, comprometendo-se a:

1. Oferecer abrigo, alimentação adequada e cuidados veterinários sempre que necessário.
2. Não abandonar, maltratar ou submeter o animal a qualquer forma de crueldade.
3. Manter a vacinação e a vermifugação em dia, e providenciar a castração quando ainda não realizada.
4. Comunicar à organização qualquer impossibilidade de continuar com a guarda, devolvendo o animal em vez de repassá-lo a terceiros sem aviso.
5. Permitir, quando solicitado, o acompanhamento da organização sobre as condições de vida do animal.

A adoção é um ato de amor e responsabilidade que dura toda a vida do animal.
`.trim();

  const extras = params.extraClauses?.trim()
    ? `\n\nCLÁUSULAS ADICIONAIS DESTA ORGANIZAÇÃO\n\n${params.extraClauses.trim()}`
    : '';

  const footer = `\n\nCriciúma/região, ${dateStr}.\n\n_______________________________\n${params.adopterName}\n\n_______________________________\n${params.organizationName}`;

  return canonical + extras + footer;
};

/** Wrap the term text in a minimal printable HTML document. */
export const renderTermHtml = (termText: string): string => {
  const body = termText
    .split('\n')
    .map((line) => `<p>${escapeHtml(line) || '&nbsp;'}</p>`)
    .join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Termo de adoção</title><style>body{font-family:Georgia,serif;max-width:720px;margin:48px auto;line-height:1.6;color:#1E2A22}p{margin:0 0 8px}</style></head><body>${body}</body></html>`;
};

const escapeHtml = (s: string): string => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
