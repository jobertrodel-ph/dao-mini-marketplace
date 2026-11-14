import { NextResponse } from 'next/server';
import { getAppOrigin, getStripeClient } from '@/lib/stripe';
import { getSupabaseAdminClient } from '@/lib/supabase';

interface ConnectPayload {
  email?: unknown;
}

export async function POST(request: Request) {
  let payload: ConnectPayload;

  try {
    payload = (await request.json()) as ConnectPayload;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const rawEmail =
    typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';

  if (!rawEmail || !rawEmail.includes('@') || rawEmail.length > 254) {
    return NextResponse.json(
      { error: 'Please enter a valid seller email address.' },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripeClient();
    const supabase = getSupabaseAdminClient();
    const origin = getAppOrigin(request);

    const { data: existingSeller, error: lookupError } = await supabase
      .from('sellers')
      .select('email, stripe_account_id, charges_enabled, details_submitted')
      .eq('email', rawEmail)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json(
        { error: lookupError.message },
        { status: 500 }
      );
    }

    let stripeAccountId = existingSeller?.stripe_account_id ?? '';

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: rawEmail,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });

      stripeAccountId = account.id;

      const { error: upsertError } = await supabase.from('sellers').upsert(
        {
          email: rawEmail,
          stripe_account_id: stripeAccountId,
          charges_enabled: Boolean(account.charges_enabled),
          details_submitted: Boolean(account.details_submitted),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      );

      if (upsertError) {
        return NextResponse.json(
          { error: upsertError.message },
          { status: 500 }
        );
      }
    } else {
      const account = await stripe.accounts.retrieve(stripeAccountId);

      await supabase
        .from('sellers')
        .update({
          charges_enabled: Boolean(account.charges_enabled),
          details_submitted: Boolean(account.details_submitted),
          updated_at: new Date().toISOString(),
        })
        .eq('email', rawEmail);
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/connect?refresh=1&email=${encodeURIComponent(
        rawEmail
      )}`,
      return_url: `${origin}/connect?connected=1&account_id=${encodeURIComponent(
        stripeAccountId
      )}`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      url: accountLink.url,
      accountId: stripeAccountId,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Unable to start Stripe Connect onboarding.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}