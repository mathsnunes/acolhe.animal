import { Fraunces, Inter_Tight, JetBrains_Mono } from 'next/font/google';

/**
 * The three brand families, loaded via next/font to avoid layout shift and
 * exposed as CSS variables consumed by the `@theme` tokens in globals.css.
 */
export const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
});

export const interTight = Inter_Tight({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter-tight',
  weight: ['300', '400', '500', '600'],
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  weight: ['400', '500'],
});

export const fontVariables = `${fraunces.variable} ${interTight.variable} ${jetbrainsMono.variable}`;
