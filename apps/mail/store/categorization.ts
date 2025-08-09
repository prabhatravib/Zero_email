import { atom } from 'jotai';

// Shared categorization state across the app
export const categorizationResultsAtom = atom<Map<string, string[]>>(new Map());
export const categorizationErrorAtom = atom<string | null>(null);
export const isCategorizingAtom = atom<boolean>(false);
export const categorizationCompleteAtom = atom<boolean>(false);
export const categorizationPendingResultsAtom = atom<Map<string, string[]> | null>(null);


