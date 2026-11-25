// app/shipping-policy/page.tsx
import LegalLayout from '@/components/LegalLayout';

export default function ShippingPolicyPage() {
  return (
    <LegalLayout title="Shipping & Delivery Policy">
      <h2 className="text-lg font-black text-neutral-950">1. Digital QR Stickers (Instant Delivery)</h2>
      <p>
        All digital WHO PARK QR stickers and printable PDF/PNG sticker cards are available{' '}
        <strong>immediately (0 days)</strong> inside your Owner Dashboard upon vehicle registration. No
        physical shipping is required for self-printed stickers.
      </p>

      <h2 className="text-lg font-black text-neutral-950 pt-2">2. Physical Waterproof Stickers (If Ordered)</h2>
      <ul className="list-disc pl-5 space-y-1.5">
        <li>
          <strong>Processing & Dispatch Time:</strong> Custom-printed physical stickers are printed and
          dispatched within <strong>1 to 2 business days</strong> from Pune, Maharashtra.
        </li>
        <li>
          <strong>Delivery Timeline:</strong> Standard courier delivery across India takes{' '}
          <strong>3 to 7 business days</strong> depending on your pin code.
        </li>
        <li>
          <strong>Shipping Charges:</strong> Applicable shipping fees (if any) are clearly displayed at
          checkout before payment.
        </li>
      </ul>
    </LegalLayout>
  );
}