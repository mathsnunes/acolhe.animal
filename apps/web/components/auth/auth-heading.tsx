/**
 * The eyebrow + editorial title + subtitle block at the top of each auth card.
 * `title` is passed as a node so callers can render `t.rich(..., { em })` with
 * the terra italic emphasis (the `.display em` style).
 */
export const AuthHeading = ({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}) => (
  <header className="mb-8">
    {eyebrow ? <div className="eyebrow text-terra">{eyebrow}</div> : null}
    <h1 className="display text-[2rem] font-light leading-tight tracking-[-0.025em] text-ink sm:text-[2.4rem]">
      {title}
    </h1>
    {subtitle ? <p className="mt-3.5 text-[15px] leading-snug text-ink-soft">{subtitle}</p> : null}
  </header>
);

/**
 * Emphasis chunk for auth titles. The terra italic styling comes from the
 * `.display em` rule (the `h1` carries `display`), so the element stays plain.
 */
export const titleEm = (chunks: React.ReactNode) => <em>{chunks}</em>;
