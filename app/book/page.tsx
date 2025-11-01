import { NEXT_PUBLIC_PAYPAY_LINK } from '@/lib/env';

import BookingClient from './BookingClient';

export default function BookPage() {
  return <BookingClient paypayLink={NEXT_PUBLIC_PAYPAY_LINK ?? null} />;
}
