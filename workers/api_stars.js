/** Telegram Stars (XTR) product catalog and checkout validation. */
/**
 * Canonical Stars (XTR) catalog. Amounts are whole Stars; invoice titles <= 32 chars.
 * @see https://core.telegram.org/bots/payments-stars
 */
export const STARS_PRODUCTS = {
  daily_unlimited: {
    id: 'daily_unlimited',
    stars: 50,
    tier: 'daily_pass',
    title: '24-Hour Study Pass',
    description: 'Higher hard AI budgets, streaming coach, Core 1+networking specialists for 24 hours.'
  },
  pro_monthly: {
    id: 'pro_monthly',
    stars: 250,
    tier: 'pro_monthly',
    title: 'Monthly Pro Pass',
    description: 'Multi-specialist handoffs, tools, NVIDIA/OpenRouter, hard daily/monthly AI caps for 30 days.'
  },
  lifetime_master: {
    id: 'lifetime_master',
    stars: 1500,
    tier: 'lifetime',
    title: 'Lifetime Master Pass',
    description: 'Highest hard AI budgets, war-room plans, priority models, and full Core 1+2 forever.'
  }
};

export function getStarsProduct(productId) {
  if (!productId) return null;
  return STARS_PRODUCTS[String(productId)] || null;
}

export function parseStarsInvoicePayload(raw) {
  let data = {};
  try {
    data = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
  } catch (e) {
    return { productId: null, telegramId: null, stars: null };
  }
  return {
    productId: data.p || data.productId || null,
    telegramId: data.u != null ? data.u : (data.telegramId != null ? data.telegramId : null),
    stars: data.s != null ? data.s : (data.stars != null ? data.stars : null)
  };
}

export function resolveStarsGrant(productId) {
  const product = getStarsProduct(productId) || STARS_PRODUCTS.daily_unlimited;
  let expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  if (product.id === 'pro_monthly') {
    expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  } else if (product.id === 'lifetime_master') {
    expiresAt = null;
  }
  return { tier: product.tier, expiresAt, product };
}

export function validateStarsPreCheckout(pcq) {
  if (!pcq) {
    return { ok: false, error_message: 'Missing checkout details. Please try again.' };
  }
  if (pcq.currency !== 'XTR') {
    return {
      ok: false,
      error_message: 'Digital goods must be paid in Telegram Stars (XTR) only.'
    };
  }
  const parsed = parseStarsInvoicePayload(pcq.invoice_payload);
  const product = getStarsProduct(parsed.productId);
  if (!product) {
    return {
      ok: false,
      error_message: 'This product is no longer available. Open the Mini App for current passes.'
    };
  }
  if (Number(pcq.total_amount) !== Number(product.stars)) {
    return {
      ok: false,
      error_message: 'Price mismatch. Please reopen checkout from the Mini App.'
    };
  }
  return { ok: true };
}

