export function onlyCpfDigits(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 11);
}

export function formatCpf(value) {
  const digits = onlyCpfDigits(value);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function validateCpf(value) {
  const cpf = onlyCpfDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (size) => {
    let sum = 0;
    for (let index = 0; index < size; index += 1) {
      sum += Number(cpf[index]) * (size + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return (
    calculateDigit(9) === Number(cpf[9]) &&
    calculateDigit(10) === Number(cpf[10])
  );
}

export function normalizeC6Offers(rows, fallbackTerm = "108") {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => ({
      table: String(row?.table ?? row?.tabela ?? "").trim(),
      description: String(
        row?.description ?? row?.descricao ?? row?.descricaoTabela ?? "",
      ).trim(),
      monthlyRate: String(
        row?.monthlyRate ?? row?.taxa ?? row?.taxaJuros ?? "",
      ).trim(),
      installment: String(
        row?.installment ?? row?.parcela ?? row?.valorParcela ?? "",
      ).trim(),
      clientValue: String(
        row?.clientValue ?? row?.valorCliente ?? row?.valorCli ?? "",
      ).trim(),
      term: String(row?.term ?? row?.prazo ?? fallbackTerm).trim(),
    }))
    .filter(
      (row) =>
        row.table ||
        row.description ||
        row.monthlyRate ||
        row.installment ||
        row.clientValue,
    );
}
