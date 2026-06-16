# Adoption term — target PDF layout (from the user's attachment)

Date: 2026-06-16
Status: reference for Leva 5 (term as a fillable, branded PDF)

The adoption term must be generated as a **PDF for download + signature**, pre-filled
with the adopter + animal data, and carry the **org/protector identity (and logo, if
any)**. Today it is plain HTML (`packages/domain/src/adoptions/term.ts`) — this is the
target format to replace it with.

## Layout (single page, centered title)

Title: **TERMO DE ADOÇÃO RESPONSÁVEL DE ANIMAL**

### Org/protector header (NEW — not in the attachment image, required by the user)
- Organization/protector name, document (CNPJ/CPF), and logo "caso possua".
- Place as a header band above the title, or in the footer "Responsável pela adoção".

### Adopter block (labelled fields, fillable)
- Nome do adotante: __________
- CPF: ______  Telefone: ______  Email: ______
- Rua: ______  Nº: ____
- Complemento: ______
- Bairro: ______  Cidade: ______  UF: ____

### Animal block
- Nome do animal: ______
- Espécie: ☐ Cão ☐ Gato    Sexo: ☐ Macho ☐ Fêmea   (checkboxes, pre-ticked from data)
- Cor / características: ______
- Idade aproximada: ______   Microchip: ______

### DECLARAÇÃO DE RESPONSABILIDADE
Intro: "Declaro que estou adotando o animal acima identificado de forma livre e
responsável, comprometendo-me a garantir seu bem-estar e assumindo as seguintes
responsabilidades:"

1. **Cuidados e bem-estar**
   - Fornecer alimentação adequada e água limpa diariamente.
   - Garantir abrigo seguro, protegido do sol, chuva e frio.
   - Providenciar cuidados veterinários sempre que necessário.
   - Manter vacinação e vermifugação regulares.
2. **Guarda responsável**
   - Não abandonar, doar ou vender o animal sem comunicar previamente ao responsável pela adoção.
   - Manter o animal em ambiente seguro, evitando fugas.
   - Respeitar as normas de bem-estar animal previstas na legislação vigente.
3. **Castração** — "Caso o animal ainda não seja castrado, comprometo-me a realizar a
   castração quando atingir idade adequada, salvo contraindicação veterinária."
4. **Acompanhamento da adoção** — "Autorizo contato para acompanhamento da adaptação do
   animal, podendo ser solicitadas fotos ou informações."
5. **Devolução** — "Caso eu não possa permanecer com o animal, comprometo-me a devolvê-lo
   ao responsável pela adoção, não realizando abandono ou repasse irresponsável."

Bold notice: "Declaro estar ciente de que maus-tratos e abandono de animais são crimes
conforme a legislação brasileira."

### Signature footer
- Local e data: ______
- Assinatura do adotante: ______
- Responsável pela adoção: ______
- Telefone para contato: ______

## Implementation notes (Leva 5)
- Generate a real PDF (pdf-lib is the lightest fit; it can also embed the logo PNG/JPG).
- Pull org identity (name, document, logo, phone) + adopter snapshot + animal fields
  (incl. microchip from Leva 2, age, color, species, sex).
- Pre-fill the fields; leave the signature lines blank for printing/signing.
- Replace `renderTermHtml`/`storeTerm` to emit `application/pdf` at
  `adoptions/{adoptionId}/term.pdf`; keep the SHA-256 hash. `termPdfUrl` already exists.
- Fields not yet captured by the adopter flow (bairro) — add to the finalize form or
  leave blank in the PDF.
