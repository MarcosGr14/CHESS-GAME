export const UNDO_COSTS = Object.freeze([0, 5, 10, 20]);

export function assertAmount(value) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error('Cantidad de monedas no válida.');
}

export function validateWallet(wallet) {
  if (!wallet) throw new Error('Monedero no válido.');
  for (const key of ['balance', 'earned', 'spent']) assertAmount(wallet[key]);
  if (wallet.earned - wallet.spent !== wallet.balance)
    throw new Error('El saldo del monedero no coincide.');
  return {
    balance: wallet.balance,
    earned: wallet.earned,
    spent: wallet.spent,
  };
}

export function creditWallet(wallet, amount) {
  const current = validateWallet(wallet);
  assertAmount(amount);
  return validateWallet({
    ...current,
    balance: current.balance + amount,
    earned: current.earned + amount,
  });
}

export function debitWallet(wallet, amount) {
  const current = validateWallet(wallet);
  assertAmount(amount);
  if (current.balance < amount)
    throw new Error('No tienes monedas suficientes.');
  return validateWallet({
    ...current,
    balance: current.balance - amount,
    spent: current.spent + amount,
  });
}
