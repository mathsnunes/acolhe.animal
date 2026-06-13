/**
 * @acolhe-animal/integrations — external providers behind interfaces.
 *
 * Every provider is selected by `INTEGRATIONS_MODE` (mock | live). The rest of
 * the codebase depends on the interfaces and factory getters here, never on a
 * concrete SDK — so swapping a provider is an adapter change, not a domain change.
 */
export * from './storage';
export * from './messaging';
export * from './email';
export * from './payments';
