import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge class names, resolving Tailwind conflicts (last wins). */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
