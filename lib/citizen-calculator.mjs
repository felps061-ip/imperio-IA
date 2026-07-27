const calculatorFields = [
  "months",
  "monthlyRate",
  "installment",
  "financed",
];

function assertPositive(value, field, allowZero = false) {
  const valid =
    Number.isFinite(value) && (allowZero ? value >= 0 : value > 0);

  if (!valid) {
    throw new Error(`${field} deve ser maior que ${allowZero ? "ou igual a " : ""}zero.`);
  }
}

function installmentFor(monthlyRate, months, financed) {
  if (monthlyRate === 0) return financed / months;
  return (
    (financed * monthlyRate) /
    (1 - Math.pow(1 + monthlyRate, -months))
  );
}

export function parseCitizenNumber(value) {
  const cleanValue = String(value ?? "")
    .trim()
    .replace(/[^\d,.-]/g, "");

  if (!cleanValue) return null;

  const normalizedValue = cleanValue.includes(",")
    ? cleanValue.replace(/\./g, "").replace(",", ".")
    : cleanValue;
  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function calculateCitizenFinancing(input) {
  const missingFields = calculatorFields.filter(
    (field) => input[field] === null || input[field] === undefined,
  );

  if (missingFields.length !== 1) {
    throw new Error(
      "Preencha exatamente três campos e deixe somente o campo que deseja calcular em branco.",
    );
  }

  const months = input.months;
  const ratePercent = input.monthlyRate;
  const installment = input.installment;
  const financed = input.financed;

  if (months !== null) assertPositive(months, "O número de meses");
  if (ratePercent !== null) {
    assertPositive(ratePercent, "A taxa mensal", true);
  }
  if (installment !== null) assertPositive(installment, "A prestação");
  if (financed !== null) assertPositive(financed, "O valor financiado");

  const field = missingFields[0];

  if (field === "financed") {
    const monthlyRate = ratePercent / 100;
    const value =
      monthlyRate === 0
        ? installment * months
        : installment *
          ((1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate);
    return { field, value };
  }

  if (field === "installment") {
    const monthlyRate = ratePercent / 100;
    return {
      field,
      value: installmentFor(monthlyRate, months, financed),
    };
  }

  if (field === "months") {
    const monthlyRate = ratePercent / 100;

    if (monthlyRate === 0) {
      return { field, value: financed / installment };
    }

    const remainingBalanceRatio =
      1 - (financed * monthlyRate) / installment;

    if (remainingBalanceRatio <= 0 || remainingBalanceRatio >= 1) {
      throw new Error(
        "A prestação informada não é suficiente para quitar o financiamento com essa taxa.",
      );
    }

    return {
      field,
      value:
        -Math.log(remainingBalanceRatio) / Math.log(1 + monthlyRate),
    };
  }

  const interestFreeInstallment = financed / months;
  if (Math.abs(installment - interestFreeInstallment) < 0.000001) {
    return { field, value: 0 };
  }
  if (installment < interestFreeInstallment) {
    throw new Error(
      "A prestação é menor que o valor sem juros. Revise os dados informados.",
    );
  }

  let lowerRate = 0;
  let upperRate = 1;

  while (
    installmentFor(upperRate, months, financed) < installment &&
    upperRate < 1024
  ) {
    upperRate *= 2;
  }

  for (let iteration = 0; iteration < 160; iteration += 1) {
    const middleRate = (lowerRate + upperRate) / 2;
    const calculatedInstallment = installmentFor(
      middleRate,
      months,
      financed,
    );

    if (calculatedInstallment < installment) {
      lowerRate = middleRate;
    } else {
      upperRate = middleRate;
    }
  }

  return {
    field,
    value: ((lowerRate + upperRate) / 2) * 100,
  };
}

export function formatCitizenResult(field, value) {
  if (field === "months") {
    return `${value.toFixed(2).replace(".", ",")} meses`;
  }

  if (field === "monthlyRate") {
    return `${value.toFixed(6).replace(".", ",")}% ao mês`;
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
