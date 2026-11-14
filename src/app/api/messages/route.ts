import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseClient } from '@/lib/supabase';

interface MessageRequestPayload {
  listingId?: unknown;
  buyerEmail?: unknown;
  body?: unknown;
}

export async function POST(request: Request) {
  let payload: MessageRequestPayload;

  try {
    payload = (await request.json()) as MessageRequestPayload;
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const listingId =
    typeof payload.listingId === 'string' ? payload.listingId.trim() : '';
  const buyerEmail =
    typeof payload.buyerEmail === 'string' ? payload.buyerEmail.trim() : '';
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';

  if (!listingId) {
    return NextResponse.json(
      { error: 'Missing listing ID.' },
      { status: 400 }
    );
  }

  if (!buyerEmail || !buyerEmail.includes('@') || buyerEmail.length > 254) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.' },
      { status: 400 }
    );
  }

  if (body.length < 1 || body.length > 1000) {
    return NextResponse.json(
      { error: 'Message must be between 1 and 1000 characters.' },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseClient();

    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, title, seller_email')
      .eq('id', listingId)
      .maybeSingle();

    if (listingError) {
      return NextResponse.json(
        { error: listingError.message },
        { status: 500 }
      );
    }

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found.' },
        { status: 404 }
      );
    }

    const { error: insertError } = await supabase.from('messages').insert({
      listing_id: listing.id,
      buyer_email: buyerEmail,
      body,
    });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({
        saved: true,
        emailSent: false,
        emailNote: 'RESEND_API_KEY is not configured yet.',
      });
    }

    const resend = new Resend(resendApiKey);
    const fromAddress =
      process.env.RESEND_FROM_EMAIL ??
      'Immortal Bazaar <onboarding@resend.dev>';

    const { error: emailError } = await resend.emails.send({
      from: fromAddress,
      to: listing.seller_email,
      replyTo: buyerEmail,
      subject: `[Immortal Bazaar] New inquiry for: ${listing.title}`,
      text: [
        'Greetings, Fellow Daoist!',
        '',
        `A buyer has sent a Jade Transmission regarding your listing "${listing.title}".`,
        '',
        `Buyer Email: ${buyerEmail}`,
        '',
        'Message:',
        body,
        '',
        'Reply directly to this email to respond to the buyer.',
      ].join('\n'),
    });

    if (emailError) {
      return NextResponse.json({
        saved: true,
        emailSent: false,
        emailNote: emailError.message,
      });
    }

    return NextResponse.json({
      saved: true,
      emailSent: true,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unable to process message.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}