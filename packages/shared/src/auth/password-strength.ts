/**
 * Password strength heuristic — pure, dependency-free.
 *
 * The product favors strong passwords but never blocks a merely-average one:
 * the minimum is 8 characters (enforced by `passwordSchema`); this score only
 * nudges the user toward something stronger. The UI maps `level` to a pt-BR
 * label and a colored meter (see `components/auth/password-field.tsx`).
 *
 * Score is derived from length and character-class variety — a transparent
 * rubric, not an entropy estimator (that would mean a ~400 kB dependency).
 */
export type PasswordLevel = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordStrength {
  /** 0 (empty) … 4 (strong). Drives how many meter segments light up. */
  score: 0 | 1 | 2 | 3 | 4;
  level: PasswordLevel;
}

export const passwordStrength = (password: string): PasswordStrength => {
  if (!password) return { score: 0, level: 'weak' };

  let points = 0;

  // Length is the dominant factor.
  if (password.length >= 8) points += 1;
  if (password.length >= 12) points += 1;
  if (password.length >= 16) points += 1;

  // Character-class variety.
  let classes = 0;
  if (/[a-z]/.test(password)) classes += 1;
  if (/[A-Z]/.test(password)) classes += 1;
  if (/\d/.test(password)) classes += 1;
  if (/[^A-Za-z0-9]/.test(password)) classes += 1;
  if (classes >= 2) points += 1;
  if (classes >= 4) points += 1;

  // A too-short password can never read as more than weak.
  if (password.length < 8) return { score: 1, level: 'weak' };

  const score = Math.min(points, 4) as PasswordStrength['score'];
  const level: PasswordLevel = score <= 1 ? 'weak' : score === 2 ? 'fair' : score === 3 ? 'good' : 'strong';
  return { score, level };
};
