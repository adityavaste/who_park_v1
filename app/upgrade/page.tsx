// src/app/upgrade/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { PLANS, PlanType } from '@/lib/plans';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function UpgradePage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('PLUS_299');
  const [existingVehicles, setExistingVehicles] = useState<any[]>([]);
  const [loadingPay, setLoadingPay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Option A Shipping Address State (for PLUS_299)
  const [plateNumber, setPlateNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [pincode, setPincode] = useState('');

  useEffect(() => {
    fetch('/api/owner/vehicles', { credentials: 'include', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.vehicles?.length) {
          setExistingVehicles(data.vehicles);
          setPlateNumber(data.vehicles[0].plateNumber || '');
        }
      })
      .catch(() => {});
  }, []);

  async function handleProceedToPay(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoadingPay(true);

    try {
      const payload: any = { planType: selectedPlan };
      if (selectedPlan === 'PLUS_299') {
        payload.shipping = {
          plateNumber,
          recipientName,
          recipientPhone,
          addressLine,
          city,
          state: stateName,
          pincode,
        };
      }

      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        router.push('/login?redirect=/upgrade');
        return;
      }

      const orderData = await res.json();
      if (!res.ok || !orderData.success) {
        throw new Error(orderData.error || 'Could not start payment.');
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'WHO PARK',
        description: orderData.planName,
        order_id: orderData.orderId,
        prefill: {
          name: recipientName || orderData.user.name,
          email: orderData.user.email,
          contact: recipientPhone || orderData.user.phone,
        },
        theme: { color: '#FACC15' },
        handler: async function (response: any) {
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyJson = await verifyRes.json();
          if (verifyRes.ok && verifyJson.success) {
            router.replace('/dashboard?upgraded=1');
          } else {
            setError(verifyJson.error || 'Payment verification failed.');
            setLoadingPay(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoadingPay(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Payment failed.');
      setLoadingPay(false);
    }
  }

  const orderedPlans: PlanType[] = ['BASIC_199', 'PLUS_299', 'BUSINESS_999'];
  const activePlanObj = PLANS[selectedPlan];

  return (
    <main className="min-h-screen bg-[#FFFDF0] py-8 px-4 text-black selection:bg-yellow-300">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="bg-white hover:bg-yellow-100 border-2 border-black font-black text-xs px-4 py-2.5 rounded-xl shadow-[3px_3px_0px_#000]"
          >
            ← Back to Garage
          </Link>
          <span className="bg-yellow-300 border-2 border-black px-3 py-1 rounded-full text-xs font-black">
            🛡️ 1-Year Validity • Same Sticker Works on Renewal
          </span>
        </div>

        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            CHOOSE YOUR WHO PARK PLAN
          </h1>
          <p className="text-sm font-bold text-stone-600 mt-1.5">
            Instant UPI activation. Upgrade anytime without changing your existing QR sticker.
          </p>
        </div>

        {/* 3 Plan Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {orderedPlans.map((planKey) => {
            const plan = PLANS[planKey];
            const isSelected = selectedPlan === plan.id;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`cursor-pointer border-4 border-black rounded-3xl p-6 flex flex-col justify-between transition relative ${
                  isSelected
                    ? 'bg-yellow-400 shadow-[7px_7px_0px_#000] -translate-y-1'
                    : 'bg-white hover:bg-yellow-50 shadow-[4px_4px_0px_#000]'
                }`}
              >
                {plan.id === 'PLUS_299' && (
                  <span className="absolute -top-3.5 right-5 bg-black text-yellow-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    BEST VALUE + FREE DELIVERY
                  </span>
                )}

                <div>
                  <span
                    className={`border-2 border-black px-3 py-0.5 rounded-full text-[11px] font-black uppercase ${
                      isSelected ? 'bg-white' : 'bg-yellow-200'
                    }`}
                  >
                    {plan.badge}
                  </span>

                  <h2 className="text-lg font-black mt-3">{plan.shortName}</h2>

                  <div className="text-4xl font-black mt-2">
                    ₹{plan.priceInr}{' '}
                    <span className="text-xs font-bold text-neutral-700">/ 1 year</span>
                  </div>

                  <div className="mt-3 inline-block bg-black text-yellow-400 font-mono font-black text-xs px-3 py-1 rounded-lg">
                    UP TO {plan.maxVehicles} {plan.maxVehicles === 1 ? 'VEHICLE' : 'VEHICLES'}
                  </div>

                  <ul className="mt-4 space-y-2 text-xs font-bold text-neutral-900">
                    {plan.features.map((feat, i) => (
                      <li key={i}>✅ {feat}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 pt-3 border-t-2 border-black/15 text-xs font-black text-center">
                  {isSelected ? '✓ SELECTED PLAN' : 'Tap to Select'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Option A Checkout Box */}
        <form
          onSubmit={handleProceedToPay}
          className="bg-white border-4 border-black rounded-3xl p-6 shadow-[7px_7px_0px_#000] max-w-2xl mx-auto space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-neutral-200 pb-3">
            <div>
              <h3 className="text-lg font-black">
                Selected: {activePlanObj.shortName}
              </h3>
              <p className="text-xs font-bold text-neutral-600">
                {activePlanObj.includesPhysicalSticker
                  ? '📦 Includes 1 weather-proof physical sticker delivered to your doorstep + instant digital access for 3 vehicles.'
                  : '🖨️ Instant digital activation — download & print your QR stickers immediately after payment.'}
              </p>
            </div>
            <div className="text-2xl font-black font-mono bg-yellow-300 border-2 border-black px-3 py-1 rounded-xl">
              ₹{activePlanObj.priceInr}
            </div>
          </div>

          {error && (
            <div className="bg-rose-100 border-2 border-black text-rose-900 font-black text-xs p-3 rounded-xl">
              💥 {error}
            </div>
          )}

          {/* Option A Delivery Address Fields (Shown for ₹299 Plus Plan) */}
          {selectedPlan === 'PLUS_299' && (
            <div className="space-y-3 bg-amber-50/70 border-2 border-black rounded-2xl p-4">
              <div className="text-xs font-black uppercase tracking-wider">
                🚚 Physical Sticker Delivery Details
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black mb-1">
                    Vehicle Plate for Sticker (Optional)
                  </label>
                  {existingVehicles.length > 0 ? (
                    <select
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-xs font-mono font-black"
                    >
                      {existingVehicles.map((v: any) => (
                        <option key={v.id} value={v.plateNumber}>
                          {v.plateNumber}
                        </option>
                      ))}
                      <option value="">I will add vehicle after payment</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. MH 12 AB 1234 (or add later)"
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-xs font-mono font-bold"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-black mb-1">
                    Receiver Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black mb-1">
                    Delivery Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black mb-1">
                    6-Digit Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 411028"
                    className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black mb-1">
                  Flat / House No., Building, Street, Landmark *
                </label>
                <input
                  type="text"
                  required
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="Complete street address"
                  className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Pune"
                    className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="Maharashtra"
                    className="w-full px-3 py-2 rounded-xl bg-white border-2 border-black text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loadingPay}
            className="w-full py-4 rounded-2xl bg-yellow-400 hover:bg-yellow-300 active:translate-y-0.5 border-3 border-black font-black text-base shadow-[4px_4px_0px_#000] transition disabled:opacity-50"
          >
            {loadingPay
              ? 'Opening Razorpay UPI...'
              : `Pay ₹${activePlanObj.priceInr} & Activate 1-Year Plan →`}
          </button>
        </form>
      </div>
    </main>
  );
}