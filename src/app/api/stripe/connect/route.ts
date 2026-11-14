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
      const account = await stripe.v2.core.accounts.create({
        display_name: rawEmail,
        contact_email: rawEmail,
        dashboard: 'full',
        defaults: {
          responsibilities: {
            fees_collector: 'stripe',
            losses_collector: 'stripe',
          },
        },
        identity: {
          country: 'us',
        },
        configuration: {
          merchant: {
            capabilities: {
              card_payments: { requested: true },
            },
          },
        },
      });

      stripeAccountId = account.id;
      const chargesEnabled =
        account.configuration?.merchant?.capabilities?.card_payments?.status ===
        'active';

      const { error: upsertError } = await supabase.from('sellers').upsert(
        {
          email: rawEmail,
          stripe_account_id: stripeAccountId,
          charges_enabled: chargesEnabled,
          details_submitted: chargesEnabled,
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
      const account = await stripe.v2.core.accounts.retrieve(stripeAccountId, {
        include: ['configuration.merchant'],
      });
      const chargesEnabled =
        account.configuration?.merchant?.capabilities?.card_payments?.status ===
        'active';

      await supabase
        .from('sellers')
        .update({
          charges_enabled: chargesEnabled,
          details_submitted: chargesEnabled,
          updated_at: new Date().toISOString(),
        })
        .eq('email', rawEmail);
    }

    const accountLink = await stripe.v2.core.accountLinks.create({
      account: stripeAccountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          refresh_url: `${origin}/connect?refresh=1&email=${encodeURIComponent(
            rawEmail
          )}`,
          return_url: `${origin}/connect?connected=1&account_id=${encodeURIComponent(
            stripeAccountId
          )}`,
        },
      },
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