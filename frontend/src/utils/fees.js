export function estimateFees(priceRow, { copies = 1, succeedingPages = 0, deliveryMethod = 'pickup' } = {}) {
  if (!priceRow) {
    return { subtotal: 0, deliveryFee: 0, total: 0 };
  }

  const normalizedCopies = Math.max(1, Number(copies) || 1);
  const normalizedPages = Math.max(0, Number(succeedingPages) || 0);
  const basePrice = Number(priceRow.basePrice) || 0;
  const perPage = Number(priceRow.perSucceedingPageFee) || 0;
  const succeedingPagesFee = normalizedPages * perPage;
  const subtotal = (basePrice + succeedingPagesFee) * normalizedCopies;
  const deliveryFee =
    String(deliveryMethod).toLowerCase() === 'delivery'
      ? Number(priceRow.deliveryFee) || 150
      : 0;

  return {
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
  };
}

export function findPriceForType(prices, documentType) {
  if (!Array.isArray(prices) || !documentType) return null;
  return prices.find((p) => p.documentType === documentType) || null;
}
