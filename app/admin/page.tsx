// src/app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats', { credentials: 'include', cache: 'no-store' })
      .then(async (res) => {
        if (res.status === 401) {
          router.replace('/admin/login');
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json?.success) setData(json);
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
                Live Users, Vehicles, QR Stickers &amp; Scan Activity
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

        {/* KPI Metric Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-yellow-400 border-2 border-neutral-950 rounded-2xl p-4 shadow-[4px_4px_0px_#0a0a0a]">
            <div className="text-xs font-black uppercase text-neutral-800">
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
              QR Stickers Downloaded
            </div>
            <div className="text-3xl font-black mt-1">{stats.totalQrDownloaded}</div>
          </div>

          <div className="bg-white border-2 border-neutral-950 rounded-2xl p-4 shadow-[4px_4px_0px_#0a0a0a] col-span-2 lg:col-span-1">
            <div className="text-xs font-black uppercase text-neutral-500">
              Total Alerts Triggered
            </div>
            <div className="text-3xl font-black mt-1">{stats.totalAlerts}</div>
          </div>
        </section>

        {/* Quick Search Bar */}
        <div className="bg-white border-2 border-neutral-950 rounded-2xl p-3 shadow-[3px_3px_0px_#0a0a0a]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search by user name, email, phone, plate number (MH12...), or QR slug..."
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
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Mobile</th>
                    <th className="py-2.5 px-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 font-semibold">
                  {filteredUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-amber-50/60">
                      <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                        {u.fullName || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600">
                        {u.email || '—'}
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