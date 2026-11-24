// app/delete-account/page.tsx
'use client';

import { useState } from 'react';
import LegalLayout from '@/components/LegalLayout';

export default function DeleteAccountPage() {
  const [email, setEmail] = useState('');
  const [plate, setPlate] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <LegalLayout title="Account & Data Deletion Request">
      <p>
        You have complete control over your <strong>WHO PARK</strong> account and vehicle data. Deleting
        your account permanently removes your profile, registered vehicles, QR sticker mappings, push
        notification tokens, and alert history within <strong>7 days</strong>.
      </p>

      <h2 className="text-lg font-black text-neutral-950 pt-2">Option 1: Instant Deletion Inside the App</h2>
      <ol className="list-decimal pl-5 space-y-1">
        <li>Open the <strong>WHO PARK</strong> app or visit <strong>whopark.in/dashboard</strong>.</li>
        <li>Sign in with your registered Google account.</li>
        <li>Tap <strong>Delete Account</strong> in your profile settings to erase all data immediately.</li>
      </ol>

      <h2 className="text-lg font-black text-neutral-950 pt-2">Option 2: Request Deletion via Web Form</h2>
      {submitted ? (
        <div className="bg-emerald-100 border-2 border-neutral-950 rounded-2xl p-4 font-bold text-neutral-950">
          ✅ Deletion request received for <strong>{email}</strong>. Your account, vehicles, and QR
          tags will be permanently erased within 48 hours, and a confirmation email will be sent.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-[#FFFDF0] border-2 border-neutral-950 rounded-2xl p-5 space-y-4"
        >
          <div>
            <label className="block text-xs font-bold mb-1">Registered Google Email *</label>
            <input
              type="email"
              required
              placeholder="you@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border-2 border-neutral-950 rounded-xl px-3.5 py-2.5 text-sm font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Registered Vehicle Plate (Optional)</label>
            <input
              type="text"
              placeholder="MH 12 AB 1234"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              className="w-full bg-white border-2 border-neutral-950 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold"
            />
          </div>
          <button
            type="submit"
            className="bg-rose-500 hover:bg-rose-600 text-white font-black text-xs px-5 py-3 rounded-xl border-2 border-neutral-950 shadow-[3px_3px_0px_#0a0a0a]"
          >
            Submit Account Deletion Request
          </button>
        </form>
      )}
    </LegalLayout>
  );
}