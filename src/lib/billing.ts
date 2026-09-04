export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  apiVersion: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: "month" | "year";
  features: string[];
  stripePriceId: string;
  trialDays?: number;
}

export interface Subscription {
  id: string;
  customerId: string;
  planId: string;
  status: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialStart?: string;
  trialEnd?: string;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: string;
  pdfUrl: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

const PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    interval: "month",
    features: [
      "Basic workout tracking",
      "Limited exercise library",
      "Community access",
    ],
    stripePriceId: "",
  },
  {
    id: "pro_monthly",
    name: "Pro",
    price: 9.99,
    interval: "month",
    features: [
      "Unlimited workouts",
      "AI workout generation",
      "Advanced analytics",
      "Nutrition tracking",
      "Priority support",
    ],
    stripePriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "price_pro_monthly",
    trialDays: 7,
  },
  {
    id: "pro_yearly",
    name: "Pro",
    price: 79.99,
    interval: "year",
    features: [
      "Unlimited workouts",
      "AI workout generation",
      "Advanced analytics",
      "Nutrition tracking",
      "Priority support",
      "2 months free",
    ],
    stripePriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID || "price_pro_yearly",
    trialDays: 7,
  },
  {
    id: "elite_monthly",
    name: "Elite",
    price: 19.99,
    interval: "month",
    features: [
      "Everything in Pro",
      "Personal AI coach",
      "Custom meal plans",
      "Video form analysis",
      "1-on-1 coaching sessions",
      "API access",
    ],
    stripePriceId: process.env.STRIPE_ELITE_MONTHLY_PRICE_ID || "price_elite_monthly",
    trialDays: 14,
  },
];

let stripeClient: unknown = null;

async function getStripeClient() {
  if (stripeClient) return stripeClient;

  const Stripe = (await import("stripe")).default;
  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2024-12-18.acacia" as never,
  });

  return stripeClient;
}

export function getPlans(): SubscriptionPlan[] {
  return [...PLANS];
}

export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return PLANS.find((p) => p.id === planId);
}

export function getPlanByStripePriceId(priceId: string): SubscriptionPlan | undefined {
  return PLANS.find((p) => p.stripePriceId === priceId);
}

export async function createCheckoutSession(
  userId: string,
  planId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ sessionId: string; url: string }> {
  const plan = getPlanById(planId);
  if (!plan || !plan.stripePriceId) {
    throw new Error("Invalid plan");
  }

  const stripe = await getStripeClient() as {
    checkout: {
      sessions: {
        create: (params: Record<string, unknown>) => Promise<{ id: string; url: string }>;
      };
    };
  };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: plan.stripePriceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, planId },
    subscription_data: {
      trial_period_days: plan.trialDays,
      metadata: { userId, planId },
    },
  });

  return { sessionId: session.id, url: session.url };
}

export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const stripe = await getStripeClient() as {
    billingPortal: {
      sessions: {
        create: (params: Record<string, unknown>) => Promise<{ url: string }>;
      };
    };
  };

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

export async function getSubscription(
  subscriptionId: string
): Promise<Subscription | null> {
  try {
    const stripe = await getStripeClient() as {
      subscriptions: {
        retrieve: (id: string) => Promise<Record<string, unknown>>;
      };
    };

    const sub = await stripe.subscriptions.retrieve(subscriptionId) as unknown as {
      id: string;
      customer: string;
      items: { data: Array<{ price: { id: string } }> };
      status: string;
      current_period_start: number;
      current_period_end: number;
      cancel_at_period_end: boolean;
      trial_start: number | null;
      trial_end: number | null;
    };

    return {
      id: sub.id,
      customerId: sub.customer,
      planId: sub.items.data[0]?.price.id || "",
      status: sub.status as Subscription["status"],
      currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
      currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      trialStart: sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : undefined,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : undefined,
    };
  } catch {
    return null;
  }
}

export async function cancelSubscription(
  subscriptionId: string,
  atPeriodEnd: boolean = true
): Promise<boolean> {
  try {
    const stripe = await getStripeClient() as {
      subscriptions: {
        update: (id: string, params: Record<string, unknown>) => Promise<unknown>;
      };
    };

    if (atPeriodEnd) {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      await stripe.subscriptions.cancel(subscriptionId);
    }

    return true;
  } catch {
    return false;
  }
}

export async function resumeSubscription(
  subscriptionId: string
): Promise<boolean> {
  try {
    const stripe = await getStripeClient() as {
      subscriptions: {
        update: (id: string, params: Record<string, unknown>) => Promise<unknown>;
      };
    };

    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    return true;
  } catch {
    return false;
  }
}

export async function getCustomerInvoices(
  customerId: string,
  limit: number = 10
): Promise<Invoice[]> {
  try {
    const stripe = await getStripeClient() as {
      invoices: {
        list: (params: Record<string, unknown>) => Promise<{
          data: Array<{
            id: string;
            amount_paid: number;
            currency: string;
            status: string;
            created: number;
            hosted_invoice_url: string;
          }>;
        }>;
      };
    };

    const result = await stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return result.data.map((inv) => ({
      id: inv.id,
      amount: inv.amount_paid / 100,
      currency: inv.currency,
      status: inv.status,
      created: new Date(inv.created * 1000).toISOString(),
      pdfUrl: inv.hosted_invoice_url,
    }));
  } catch {
    return [];
  }
}

export async function getCustomerPaymentMethods(
  customerId: string
): Promise<PaymentMethod[]> {
  try {
    const stripe = await getStripeClient() as {
      paymentMethods: {
        list: (params: Record<string, unknown>) => Promise<{
          data: Array<{
            id: string;
            type: string;
            card?: {
              last4: string;
              brand: string;
              exp_month: number;
              exp_year: number;
            };
          }>;
        }>;
      };
    };

    const result = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    return result.data
      .filter((pm) => pm.card)
      .map((pm) => ({
        id: pm.id,
        type: pm.type,
        last4: pm.card!.last4,
        brand: pm.card!.brand,
        expMonth: pm.card!.exp_month,
        expYear: pm.card!.exp_year,
        isDefault: false,
      }));
  } catch {
    return [];
  }
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const elements = signature.split(",");
    const timestamp = elements.find((e) => e.startsWith("t="))?.slice(2);
    const sig = elements.find((e) => e.startsWith("v1="))?.slice(3);

    if (!timestamp || !sig) return false;

    const timeDiff = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (timeDiff > 300) return false;

    let hash = 0;
    const combined = timestamp + "." + payload + secret;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    const expectedSig = Math.abs(hash).toString(16).padStart(8, "0");

    return sig === expectedSig;
  } catch {
    return false;
  }
}

export function formatStripeAmount(amount: number, currency: string = "usd"): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
  return formatter.format(amount);
}

export function calculateSavings(
  monthlyPrice: number,
  yearlyPrice: number
): { amount: number; percentage: number } {
  const monthlyCost = monthlyPrice * 12;
  const savings = monthlyCost - yearlyPrice;
  return {
    amount: savings,
    percentage: (savings / monthlyCost) * 100,
  };
}
