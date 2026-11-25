// src/app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface StickerOrderItem {
  id: string;
  plateNumber: string | null;
  recipientName: string;
  recipientPhone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  dispatchStatus: string;
  trackingNumber: string | null;
  createdAt: string;
  accountEmail: string | null;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Revenue & Physical Sticker Dispatch Queue States
  const [totalRevenueInr, setTotalRevenueInr] = useState<number>(0);
  const [paidOrdersCount, setPaidOrdersCount] = useState<number>(0);
  const [dispatchQueue, setDispatchQueue] = useState<StickerOrderItem[]>([]);
  const [dispatchFilter, setDispatchFilter] = useState<string>('ALL');
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Bulk Order Generator States
  const [batchName, setBatchName] = useState('');
  const [quantity, setQuantity] = useState<number>(50);
  const [generatingBulk, setGeneratingBulk] = useState(false);
  const [bulkError, setBulkError] = useState('');

  async function refreshOrders() {
    const ordersRes = await fetch(`/api/admin/orders?t=${Date.now()}`, {
      credentials: 'include',
      cache: 'no-store',
    });
    if (ordersRes.status === 401) {
      router.replace('/admin/login');
      return;
    }
    const ordersJson = await ordersRes.json().catch(() => null);
    if (ordersJson?.success) {
      setTotalRevenueInr(ordersJson.totalRevenueInr || 0);
      setPaidOrdersCount(ordersJson.paidOrdersCount || 0);
      const queue: StickerOrderItem[] = ordersJson.dispatchQueue || [];
      setDispatchQueue(queue);
      setTrackingInputs((prev) => {
        const next = { ...prev };
        for (const item of queue) {
          if (next[item.id] === undefined && item.trackingNumber) {
            next[item.id] = item.trackingNumber;
          }
        }
        return next;
      });
    }
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/stats', { credentials: 'include', cache: 'no-store' }),
      fetch('/api/admin/bulk-qr', { credentials: 'include', cache: 'no-store' }),
      fetch('/api/admin/orders', { credentials: 'include', cache: 'no-store' }),
    ])
      .then(async ([statsRes, bulkRes, ordersRes]) => {
        if (statsRes.status === 401 || bulkRes.status === 401 || ordersRes.status === 401) {
          router.replace('/admin/login');
          return;
        }
        const statsJson = await statsRes.json().catch(() => null);
        const bulkJson = await bulkRes.json().catch(() => null);
        const ordersJson = await ordersRes.json().catch(() => null);

        if (statsJson?.success) setData(statsJson);
        if (bulkJson?.success) setBatches(bulkJson.batches || []);
        if (ordersJson?.success) {
          setTotalRevenueInr(ordersJson.totalRevenueInr || 0);
          setPaidOrdersCount(ordersJson.paidOrdersCount || 0);
          const queue: StickerOrderItem[] = ordersJson.dispatchQueue || [];
          setDispatchQueue(queue);
          const initialTracking: Record<string, string> = {};
          for (const item of queue) {
            if (item.trackingNumber) initialTracking[item.id] = item.trackingNumber;
          }
          setTrackingInputs(initialTracking);
        }
        setLoading(false);
      })
      .catch(() => {
        router.replace('/admin/login');
      });
  }, [router]);

  async function handleAdminLogout() {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    router.replace('/admin/login');
  }

  async function handleUpdateDispatchStatus(
    orderId: string,
    dispatchStatus: 'PENDING_DISPATCH' | 'SHIPPED' | 'DELIVERED'
  ) {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          dispatchStatus,
          trackingNumber: trackingInputs[orderId] || '',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update dispatch order.');
      }
      await refreshOrders();
    } catch (err: any) {
      alert(err?.message || 'Could not update order.');
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handleGenerateBulk(e: React.FormEvent) {
    e.preventDefault();
    setBulkError('');
    setGeneratingBulk(true);

    try {
      const res = await fetch('/api/admin/bulk-qr', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchName: batchName.trim() || `Bulk Batch (${quantity})`,
          quantity,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to generate bulk stickers.');
      }

      const slugs = (json.tags || []).map((t: any) => t.publicSlug).join(',');
      router.push(
        `/admin/bulk-print?batch=${encodeURIComponent(json.batchName)}&slugs=${encodeURIComponent(slugs)}`
      );
    } catch (err: any) {
      setBulkError(err.message || 'Could not generate bulk stickers.');
      setGeneratingBulk(false);
    }
  }

  if (loading || !data) {
    return (
      <main className="min-h-screen bg-[#FFFDF2] flex items-center justify-center p-4">
        <div className="bg-yellow-400 border-2 border-neutral-950 px-6 py-4 rounded-2xl font-black shadow-[4px_4px_0px_#0a0a0a]">
          LOADING ADMIN ANALYTICS...
        </div>
      </main>
    );
  }

  const { stats, recentUsers = [], recentVehicles = [], recentAlerts = [] } = data;

  const pendingDispatchCount = dispatchQueue.filter(
    (o) => o.dispatchStatus === 'PENDING_DISPATCH'
  ).length;
  const shippedDispatchCount = dispatchQueue.filter(
    (o) => o.dispatchStatus === 'SHIPPED'
  ).length;
  const deliveredDispatchCount = dispatchQueue.filter(
    (o) => o.dispatchStatus === 'DELIVERED'
  ).length;

  const filteredDispatchQueue = dispatchQueue.filter((o) => {
    const matchesStatus =
      dispatchFilter === 'ALL' || o.dispatchStatus === dispatchFilter;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (o.plateNumber || '').toLowerCase().includes(q) ||
      (o.recipientName || '').toLowerCase().includes(q) ||
      (o.recipientPhone || '').includes(q) ||
      (o.pincode || '').includes(q) ||
      (o.city || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const filteredUsers = recentUsers.filter(
    (u: any) =>
      (u.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.phone || '').includes(search)
  );

  const filteredVehicles = recentVehicles.filter(
    (v: any) =>
      (v.plateNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (v.tagSlug || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#FFFDF2] text-neutral-950 px-4 py-6 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Admin Header */}
        <header className="bg-neutral-950 text-white border-2 border-neutral-950 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-[5px_5px_0px_#FACC15]">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-yellow-400 text-neutral-950 font-black flex items-center justify-center text-lg">
              W
            </span>
            <div>
              <h1 className="text-xl font-black tracking-tight text-yellow-400">
                WHO PARK • ADMIN COMMAND CENTER
              </h1>
              <p className="text-xs text-neutral-400 font-medium">
                Revenue, Physical Sticker Dispatch, Users, Vehicles &amp; Scan Activity
              </p>
            </div>
          </div>

          <button
            onClick={handleAdminLogout}
            className="bg-white hover:bg-yellow-300 text-neutral-950 font-black text-xs px-4 py-2.5 rounded-xl border-2 border-yellow-400 transition"
          >
            Logout Admin
          </button>
        </header>

        {/* KPI Metric Cards (Including Total Revenue) */}
        <section className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-yellow-400 border-2 border-neutral-950 rounded-2xl p-4 shadow-[4px_4px_0px_#0a0a0a] col-span-2 lg:col-span-1">
            <div className="text-xs font-black uppercase text-neutral-900">
              Total Revenue
            </div>
            <div className="text-3xl font-black font-mono mt-1">
              ₹{totalRevenueInr.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] font-bold text-neutral-800 mt-0.5">
              {paidOrdersCount} paid plan{paidOrdersCount === 1 ? '' : 's'}
            </div>
          </div>

          <div className="bg-white border-2 border-neutral-950 rounded-2xl p-4 shadow-[4px_4px_0px_#0a0a0a]">
            <div className="text-xs font-black uppercase text-neutral-500">
              Registered Users
            </div>
            <div className="text-3xl font-black mt-1">{stats.totalUsers}</div>
          </div>

          <div className="bg-white border-2 border-neutral-950 rounded-2xl p-4 shadow-[4px_4px_0px_#0a0a0a]">
            <div className="text-xs font-black uppercase text-neutral-500">
              Registered Vehicles
            </div>
            <div className="text-3xl font-black mt-1">{stats.totalVehicles}</div>
          </div>

          <div className="bg-white border-2 border-neutral-950 rounded-2xl p-4 shadow-[4px_4px_0px_#0a0a0a]">
            <div className="text-xs font-black uppercase text-neutral-500">
              QR Stickers Created
            </div>
            <div className="text-3xl font-black mt-1">{stats.totalQrCreated}</div>
          </div>

          <div className="bg-white border-2 border-neutral-950 rounded-2xl p-4 shadow-[4px_4px_0px_#0a0a0a]">
            <div className="text-xs font-black uppercase text-neutral-500">
              QR Downloaded
            </div>
            <div className="text-3xl font-black mt-1">{stats.totalQrDownloaded}</div>
          </div>

          <div className="bg-white border-2 border-neutral-950 rounded-2xl p-4 shadow-[4px_4px_0px_#0a0a0a]">
            <div className="text-xs font-black uppercase text-neutral-500">
              Alerts Triggered
            </div>
            <div className="text-3xl font-black mt-1">{stats.totalAlerts}</div>
          </div>
        </section>

        {/* Physical Sticker Dispatch Queue (₹299 Plus Plan Doorstep Orders) */}
        <section className="bg-white border-2 border-neutral-950 rounded-3xl p-5 shadow-[5px_5px_0px_#0a0a0a]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-yellow-300 border border-neutral-950 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                  ₹299 Plus Plan Deliveries
                </span>
                {pendingDispatchCount > 0 && (
                  <span className="bg-amber-400 border border-neutral-950 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase animate-pulse">
                    {pendingDispatchCount} Ready to Ship
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black mt-1">
                🚚 Physical Sticker Dispatch Queue ({dispatchQueue.length})
              </h2>
              <p className="text-xs text-neutral-600 font-medium">
                Enter AWB / courier tracking ID and mark orders shipped or delivered.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { key: 'ALL', label: `All (${dispatchQueue.length})` },
                { key: 'PENDING_DISPATCH', label: `Pending (${pendingDispatchCount})` },
                { key: 'SHIPPED', label: `Shipped (${shippedDispatchCount})` },
                { key: 'DELIVERED', label: `Delivered (${deliveredDispatchCount})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setDispatchFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 border-neutral-950 transition ${
                    dispatchFilter === tab.key
                      ? 'bg-yellow-400 shadow-[2px_2px_0px_#0a0a0a]'
                      : 'bg-white hover:bg-neutral-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredDispatchQueue.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-neutral-300 rounded-2xl">
              <p className="text-sm font-black text-neutral-800">
                No physical sticker orders in this filter
              </p>
              <p className="text-xs text-neutral-500 font-medium mt-1">
                When a user purchases the ₹299 Plus plan, their delivery address appears here automatically.
              </p>
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto overflow-x-auto border border-neutral-200 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-yellow-100 z-10 border-b-2 border-neutral-950 text-neutral-700 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Plate</th>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Shipping Address</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Tracking &amp; Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-semibold align-top">
                  {filteredDispatchQueue.map((order) => {
                    const isBusy = updatingOrderId === order.id;

                    return (
                      <tr key={order.id} className="hover:bg-amber-50/60">
                        <td className="py-3 px-3 text-neutral-500 whitespace-nowrap">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          {order.plateNumber ? (
                            <span className="bg-yellow-300 border border-neutral-950 px-2 py-0.5 rounded-md font-mono font-black">
                              {order.plateNumber}
                            </span>
                          ) : (
                            <span className="text-neutral-400 font-bold">Unassigned</span>
                          )}
                        </td>

                        <td className="py-3 px-3">
                          <div className="font-black text-neutral-950">
                            {order.recipientName}
                          </div>
                          <div className="font-mono text-neutral-700 mt-0.5">
                            {order.recipientPhone}
                          </div>
                          {order.accountEmail && (
                            <div className="text-[11px] text-neutral-500">
                              {order.accountEmail}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 max-w-xs">
                          <div className="text-neutral-900">{order.addressLine}</div>
                          <div className="font-bold text-neutral-700 mt-0.5">
                            {order.city}, {order.state} —{' '}
                            <span className="font-mono bg-yellow-200 px-1.5 py-0.5 rounded border border-neutral-950">
                              {order.pincode}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md border border-neutral-950 font-black text-[11px] ${
                              order.dispatchStatus === 'DELIVERED'
                                ? 'bg-emerald-300'
                                : order.dispatchStatus === 'SHIPPED'
                                ? 'bg-sky-300'
                                : 'bg-amber-300'
                            }`}
                          >
                            {order.dispatchStatus === 'PENDING_DISPATCH' && 'PENDING'}
                            {order.dispatchStatus === 'SHIPPED' && 'SHIPPED'}
                            {order.dispatchStatus === 'DELIVERED' && 'DELIVERED'}
                          </span>
                        </td>

                        <td className="py-3 px-3 min-w-[210px]">
                          <input
                            type="text"
                            placeholder="Courier AWB / Tracking #"
                            value={trackingInputs[order.id] ?? ''}
                            onChange={(e) =>
                              setTrackingInputs((prev) => ({
                                ...prev,
                                [order.id]: e.target.value,
                              }))
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg border-2 border-neutral-950 font-mono text-xs font-bold mb-1.5 focus:outline-none focus:bg-yellow-50"
                          />

                          <div className="flex items-center gap-1.5">
                            {order.dispatchStatus === 'PENDING_DISPATCH' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleUpdateDispatchStatus(order.id, 'SHIPPED')
                                }
                                className="flex-1 bg-yellow-400 hover:bg-yellow-300 active:translate-y-0.5 border-2 border-neutral-950 font-black text-[11px] py-1 px-2.5 rounded-lg shadow-[2px_2px_0px_#0a0a0a] disabled:opacity-50"
                              >
                                {isBusy ? 'Saving...' : 'Mark Shipped'}
                              </button>
                            )}

                            {order.dispatchStatus === 'SHIPPED' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleUpdateDispatchStatus(order.id, 'DELIVERED')
                                }
                                className="flex-1 bg-emerald-400 hover:bg-emerald-300 active:translate-y-0.5 border-2 border-neutral-950 font-black text-[11px] py-1 px-2.5 rounded-lg shadow-[2px_2px_0px_#0a0a0a] disabled:opacity-50"
                              >
                                {isBusy ? 'Saving...' : 'Mark Delivered'}
                              </button>
                            )}

                            {order.dispatchStatus !== 'PENDING_DISPATCH' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleUpdateDispatchStatus(
                                    order.id,
                                    order.dispatchStatus as 'SHIPPED' | 'DELIVERED'
                                  )
                                }
                                className="bg-white hover:bg-neutral-100 border-2 border-neutral-950 font-bold text-[11px] py-1 px-2 rounded-lg disabled:opacity-50"
                              >
                                Save AWB
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Bulk Sticker Print Generator (B2B / Society / Garage Batches) */}
        <section className="bg-white border-2 border-neutral-950 rounded-3xl p-5 shadow-[5px_5px_0px_#0a0a0a]">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <span className="bg-yellow-300 border border-neutral-950 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                Scan-to-Activate Bulk Print
              </span>
              <h2 className="text-lg font-black mt-1">
                📦 Generate Bulk Pre-Printed QR Stickers
              </h2>
              <p className="text-xs text-neutral-600 font-medium">
                Print unclaimed QR stickers for housing societies, car washes, or events. Owners scan their sticker to bind their plate number in 10s.
              </p>
            </div>
          </div>

          {bulkError && (
            <div className="mb-3 p-3 rounded-xl bg-rose-100 border-2 border-neutral-950 text-xs font-black text-rose-900">
              💥 {bulkError}
            </div>
          )}

          <form
            onSubmit={handleGenerateBulk}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-6">
              <label className="block text-[11px] font-black uppercase mb-1">
                Batch / Society / Garage Name
              </label>
              <input
                type="text"
                required
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                placeholder="e.g. Ratan Neptune CHS - Hadapsar"
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-neutral-950 text-sm font-bold focus:outline-none focus:bg-yellow-50"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-black uppercase mb-1">
                Quantity (1–200)
              </label>
              <input
                type="number"
                min={1}
                max={200}
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-neutral-950 text-sm font-black focus:outline-none focus:bg-yellow-50"
              />
            </div>

            <div className="sm:col-span-4">
              <button
                type="submit"
                disabled={generatingBulk}
                className="w-full py-2.5 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-300 active:translate-y-0.5 border-2 border-neutral-950 font-black text-sm shadow-[3px_3px_0px_#0a0a0a] transition disabled:opacity-50"
              >
                {generatingBulk
                  ? 'Generating...'
                  : `🖨️ Generate & Print ${quantity} QRs →`}
              </button>
            </div>
          </form>

          {/* Printed Batches Activation Tracker */}
          {batches.length > 0 && (
            <div className="mt-5 max-h-[220px] overflow-y-auto overflow-x-auto border border-neutral-200 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-yellow-100 z-10 border-b-2 border-neutral-950 text-neutral-700 uppercase">
                  <tr>
                    <th className="py-2 px-3">Batch Name</th>
                    <th className="py-2 px-3">Activated / Total</th>
                    <th className="py-2 px-3">Unclaimed Left</th>
                    <th className="py-2 px-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-semibold">
                  {batches.map((b: any, idx: number) => {
                    const unclaimed = Math.max(0, (b.total || 0) - (b.claimed || 0));
                    return (
                      <tr key={idx} className="hover:bg-amber-50/60">
                        <td className="py-2 px-3 font-bold">{b.batchName}</td>
                        <td className="py-2 px-3">
                          <span className="bg-emerald-200 border border-neutral-950 px-2 py-0.5 rounded-md font-black">
                            {b.claimed} / {b.total} Activated
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-neutral-600">
                          {unclaimed} unclaimed
                        </td>
                        <td className="py-2 px-3 text-neutral-500 whitespace-nowrap">
                          {b.createdAt
                            ? new Date(b.createdAt).toLocaleDateString('en-IN')
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Quick Search Bar */}
        <div className="bg-white border-2 border-neutral-950 rounded-2xl p-3 shadow-[3px_3px_0px_#0a0a0a]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search by user name, email, phone, plate number (MH12...), pincode, or QR slug..."
            className="w-full text-sm font-bold px-2 py-1 focus:outline-none"
          />
        </div>

        {/* Two-Column Fixed-Height Scrollable Tables: Users & Vehicles */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users Table */}
          <div className="bg-white border-2 border-neutral-950 rounded-3xl p-5 shadow-[5px_5px_0px_#0a0a0a] flex flex-col">
            <h2 className="text-lg font-black mb-3">
              👥 Registered Users ({filteredUsers.length})
            </h2>

            <div className="max-h-[360px] overflow-y-auto overflow-x-auto border border-neutral-200 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-yellow-100 z-10 border-b-2 border-neutral-950 text-neutral-700 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Plan</th>
                    <th className="py-2.5 px-3">Mobile</th>
                    <th className="py-2.5 px-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-semibold">
                  {filteredUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-amber-50/60">
                      <td className="py-2.5 px-3">
                        <div className="font-bold whitespace-nowrap">
                          {u.fullName || '—'}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          {u.email || '—'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="bg-yellow-200 border border-neutral-950 px-2 py-0.5 rounded-md font-black text-[10px]">
                          {u.plan || 'NONE'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                        {u.phone || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-500 whitespace-nowrap">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString('en-IN')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vehicles & QR Stickers Table */}
          <div className="bg-white border-2 border-neutral-950 rounded-3xl p-5 shadow-[5px_5px_0px_#0a0a0a] flex flex-col">
            <h2 className="text-lg font-black mb-3">
              🚘 Vehicles &amp; QR Tags ({filteredVehicles.length})
            </h2>

            <div className="max-h-[360px] overflow-y-auto overflow-x-auto border border-neutral-200 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-yellow-100 z-10 border-b-2 border-neutral-950 text-neutral-700 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Plate Number</th>
                    <th className="py-2.5 px-3">Model</th>
                    <th className="py-2.5 px-3">QR Tag</th>
                    <th className="py-2.5 px-3">Downloads</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-semibold">
                  {filteredVehicles.map((v: any) => (
                    <tr key={v.id} className="hover:bg-amber-50/60">
                      <td className="py-2.5 px-3 font-mono font-black whitespace-nowrap">
                        {v.plateNumber}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600 whitespace-nowrap">
                        {v.makeModel || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                        <a
                          href={`/v/${v.tagSlug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-yellow-200 border border-neutral-950 px-2 py-0.5 rounded-md font-bold hover:bg-yellow-300"
                        >
                          {v.tagSlug}
                        </a>
                      </td>
                      <td className="py-2.5 px-3 font-black">
                        {v.qrDownloads ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Recent Alerts Feed (Fixed Height + Scrollbar) */}
        {recentAlerts.length > 0 && (
          <section className="bg-white border-2 border-neutral-950 rounded-3xl p-5 shadow-[5px_5px_0px_#0a0a0a]">
            <h2 className="text-lg font-black mb-3">
              🔔 Recent QR Scan Alerts ({recentAlerts.length})
            </h2>

            <div className="max-h-[300px] overflow-y-auto overflow-x-auto border border-neutral-200 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-yellow-100 z-10 border-b-2 border-neutral-950 text-neutral-700 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Vehicle / Tag</th>
                    <th className="py-2.5 px-3">Alert Type</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-semibold">
                  {recentAlerts.map((a: any) => (
                    <tr key={a.id} className="hover:bg-amber-50/60">
                      <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                        {a.plateNumber || a.tagSlug || '—'}
                      </td>
                      <td className="py-2.5 px-3">
                        {a.alertType || 'Alert sent'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="bg-yellow-200 border border-neutral-950 px-2 py-0.5 rounded-md font-bold">
                          {a.ownerReply || a.status || 'SENT'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-500 whitespace-nowrap">
                        {a.createdAt
                          ? new Date(a.createdAt).toLocaleString('en-IN')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}