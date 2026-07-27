declare module "@/lib/c6-refin.mjs" {
  export function onlyCpfDigits(value: string): string;
  export function formatCpf(value: string): string;
  export function validateCpf(value: string): boolean;
  export function normalizeC6Offers(
    rows: unknown[],
    fallbackTerm?: string,
  ): Array<{
    table: string;
    description: string;
    monthlyRate: string;
    installment: string;
    clientValue: string;
    term: string;
  }>;
}
