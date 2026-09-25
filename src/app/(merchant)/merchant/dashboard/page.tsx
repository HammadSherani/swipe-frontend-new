'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { auth, merchant as merchantApi } from '@/lib/apiClient';
import { getRefreshToken, clearTokens } from '@/lib/tokenStorage';

const PURPLE = '#7C5CFC';

interface QrCodeRow {
  id: string;
  type: 'STATIC' | 'DYNAMIC';
  imageUrl?: string | null;
  reference: string;
  isActive: boolean;
}

interface MerchantData {
  businessName: string;
  tradeName?: string | null;
  businessType: string;
  mccCategory?: string | null;
  status: string;
  kycLevel?: string;
  rejectionReason?: string | null;
  ownerName: string;
  email: string;
  mobile: string;
  addressLine1?: string;
  addressCity?: string;
  addressState?: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  qrCodes?: QrCodeRow[];
}

const SIDEBAR_MAIN = [
  { label: 'Dashboard', icon: 'solar:home-2-linear', active: true },
  { label: 'Transactions', icon: 'solar:transfer-horizontal-linear' },
  { label: 'Settlements', icon: 'solar:check-read-linear' },
  { label: 'Reports', icon: 'solar:clipboard-list-linear' },
];

const SIDEBAR_PRODUCTS = [
  { label: 'Payment Links', icon: 'solar:link-linear' },
  { label: 'Payment Pages', icon: 'solar:document-linear' },
  { label: 'Swipe.me Link', icon: 'solar:users-group-rounded-linear' },
];

function comingSoon() {
  toast('Coming soon');
}

function prettify(value?: string | null) {
  return value ? value.replace(/_/g, ' ').toLowerCase().replace(/^\w|\s\w/g, (c) => c.toUpperCase()) : '-';
}

function maskAccount(num: string) {
  return num && num.length > 4 ? `•••• ${num.slice(-4)}` : num;
}

function initials(name?: string) {
  if (!name) return 'M';
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || 'M';
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-t border-gray-100 first:border-t-0">
      <span className="text-xs font-medium text-gray-400 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-right break-words">{value || '-'}</span>
    </div>
  );
}

function SidebarItem({ label, icon, active, onClick }: { label: string; icon: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick ?? comingSoon}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
        active ? 'text-white' : 'text-gray-600 hover:bg-gray-50'
      }`}
      style={active ? { backgroundColor: PURPLE } : undefined}
    >
      <Icon icon={icon} width={16} />
      {label}
    </button>
  );
}

interface ChecklistItem {
  key: string;
  title: string;
  hint: string;
  done: boolean;
  content: React.ReactNode;
}

const GATE: Record<string, { title: string; text: string; icon: string; color: string }> = {
  PENDING_REVIEW: {
    title: 'Your application is under review',
    text: 'Thanks for completing verification. Our team is reviewing your details and you will get access to your dashboard as soon as your account is approved. This usually takes 1-2 business days.',
    icon: 'solar:clock-circle-bold',
    color: 'text-amber-500',
  },
  REJECTED: {
    title: 'Your application was not approved',
    text: 'Unfortunately we could not approve your account.',
    icon: 'solar:close-circle-bold',
    color: 'text-rose-500',
  },
  SUSPENDED: {
    title: 'Your account is suspended',
    text: 'Please contact support to restore access to your dashboard.',
    icon: 'solar:danger-circle-bold',
    color: 'text-rose-500',
  },
};

// The dashboard is only for approved (ACTIVE) merchants. Everyone else lands here.
function ApprovalGate({
  status,
  reason,
  onLogout,
  loggingOut,
}: {
  status: string;
  reason?: string | null;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const g = GATE[status];
  return (
    <div className="min-h-screen bg-gray-200 p-3 sm:p-6 flex">
      <div className="max-w-6xl w-full mx-auto bg-white rounded-3xl shadow-sm flex flex-col min-h-[calc(100vh-3rem)]">
        <header className="flex items-center justify-between px-5 sm:px-8 h-16 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black" style={{ backgroundColor: PURPLE }}>S</span>
            <span className="text-lg font-extrabold text-gray-900 tracking-tight">Swipe</span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50 rounded-lg disabled:opacity-50"
          >
            <Icon icon="solar:logout-3-linear" width={16} />
            {loggingOut ? 'Logging out...' : 'Log out'}
          </button>
        </header>
        <div className="flex-1 flex items-center justify-center px-6 text-center">
          {g ? (
            <div className="max-w-md">
              <Icon icon={g.icon} width={60} className={`${g.color} mx-auto mb-4`} />
              <h1 className="text-xl font-bold text-gray-900 mb-2">{g.title}</h1>
              <p className="text-sm text-gray-500">{g.text}</p>
              {status === 'REJECTED' && reason && (
                <p className="text-sm text-rose-600 mt-3"><span className="font-semibold">Reason:</span> {reason}</p>
              )}
              {status === 'PENDING_REVIEW' && (
                <p className="text-xs text-gray-400 mt-6 flex items-center justify-center gap-1.5">
                  <Icon icon="line-md:loading-twotone-loop" width={14} /> This page updates automatically once you are approved.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Taking you to complete your verification...</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MerchantDashboard() {
  const [data, setData] = useState<MerchantData | null>(null);
  const [bankName, setBankName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await merchantApi.me();
        const me: MerchantData = res.data?.data ?? res.data;
        setData(me);

        try {
          const banksRes = await merchantApi.getBanks();
          const banks: { name: string; code: string }[] = banksRes.data?.data ?? banksRes.data ?? [];
          setBankName(banks.find((b) => b.code === me.bankCode)?.name ?? null);
        } catch {
          /* bank name is decorative; the code still shows */
        }
      } catch (error) {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 404) {
          clearTokens();
          window.location.href = '/auth/login';
          return;
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Only ACTIVE (admin-approved) merchants may see the dashboard. A merchant who
  // hasn't finished verification goes back to the wizard; one who has submitted
  // waits here, and this checks every 15s so approval takes effect without a refresh.
  useEffect(() => {
    if (!data || data.status === 'ACTIVE') return;
    if (!['PENDING_REVIEW', 'REJECTED', 'SUSPENDED'].includes(data.status)) {
      window.location.href = '/merchant/businessRegistration';
      return;
    }
    if (data.status !== 'PENDING_REVIEW') return;
    const timer = setInterval(async () => {
      try {
        const res = await merchantApi.me();
        const me: MerchantData = res.data?.data ?? res.data;
        if (me?.status !== 'PENDING_REVIEW') setData(me);
      } catch {
        /* keep waiting; a transient error shouldn't matter */
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [data]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await auth.logout(getRefreshToken() ?? undefined);
    } catch {
      // Clear the local session regardless so a dead token can't block logout.
    } finally {
      clearTokens();
      window.location.href = '/auth/login';
    }
  };

  const staticQr = data?.qrCodes?.find((q) => q.type === 'STATIC' && q.isActive);
  const hasBank = !!data && data.accountName !== 'Pending Verification';
  const kycIncomplete = !!data && !['ACTIVE', 'PENDING_REVIEW', 'REJECTED', 'SUSPENDED'].includes(data.status);

  const verifyHint = !data
    ? ''
    : data.status === 'ACTIVE' ? 'Verified'
    : data.status === 'PENDING_REVIEW' ? 'Under review, usually 1-2 business days'
    : data.status === 'REJECTED' ? 'Application rejected'
    : data.status === 'SUSPENDED' ? 'Account suspended'
    : 'Verification in progress';

  const checklist: ChecklistItem[] = data
    ? [
        {
          key: 'verify',
          title: 'Verify your business',
          hint: verifyHint,
          done: data.status === 'ACTIVE',
          content: (
            <div>
              {data.status === 'REJECTED' && data.rejectionReason && (
                <p className="text-sm text-rose-600 mb-3"><span className="font-semibold">Reason:</span> {data.rejectionReason}</p>
              )}
              {kycIncomplete && (
                <a
                  href="/merchant/businessRegistration"
                  className="inline-flex mb-4 px-4 py-2 text-white rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: PURPLE }}
                >
                  Continue verification
                </a>
              )}
              <DetailRow label="Business name" value={data.businessName === 'Pending Onboarding' ? '' : data.businessName} />
              <DetailRow label="Trade name" value={data.tradeName} />
              <DetailRow label="Business type" value={prettify(data.businessType)} />
              <DetailRow label="Category" value={prettify(data.mccCategory)} />
              <DetailRow label="Owner" value={data.ownerName === 'Pending Onboarding' ? '' : data.ownerName} />
              <DetailRow label="Email" value={data.email} />
              <DetailRow label="Mobile" value={data.mobile} />
              <DetailRow
                label="Address"
                value={data.addressLine1 && data.addressLine1 !== 'Not Provided'
                  ? [data.addressLine1, data.addressCity, data.addressState].filter(Boolean).join(', ')
                  : ''}
              />
            </div>
          ),
        },
        {
          key: 'bank',
          title: 'Set up your settlement account',
          hint: hasBank ? `${data.accountName} · ${maskAccount(data.accountNumber)}` : 'Not added yet',
          done: hasBank,
          content: hasBank ? (
            <div>
              <DetailRow label="Bank" value={bankName ?? `Bank code ${data.bankCode}`} />
              <DetailRow label="Account name" value={data.accountName} />
              <DetailRow label="Account number" value={maskAccount(data.accountNumber)} />
            </div>
          ) : (
            <p className="text-sm text-gray-500">Add your bank account while completing verification.</p>
          ),
        },
        {
          key: 'qr',
          title: 'Get your payment QR code',
          hint: staticQr ? 'Ready to use' : 'Available once your account is approved',
          done: !!staticQr,
          content: staticQr?.imageUrl ? (
            <div className="flex flex-col sm:flex-row items-center gap-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={staticQr.imageUrl} alt="Your payment QR code" className="w-44 rounded-lg border border-gray-100" />
              <div className="text-center sm:text-left">
                <p className="text-xs text-gray-400 break-all">Ref: {staticQr.reference}</p>
                <a
                  href={staticQr.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-white rounded-lg text-xs font-semibold"
                  style={{ backgroundColor: PURPLE }}
                >
                  <Icon icon="solar:download-minimalistic-bold" width={14} />
                  Download QR
                </a>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              {data.status === 'ACTIVE' ? 'Your QR code is being prepared.' : 'Your QR code appears here once your account is approved.'}
            </p>
          ),
        },
      ]
    : [];

  const doneCount = checklist.filter((c) => c.done).length;
  const activeKey = openKey ?? checklist.find((c) => !c.done)?.key ?? null;
  const displayName = data && data.ownerName !== 'Pending Onboarding' ? data.ownerName.split(' ')[0] : 'there';

  if (data && data.status !== 'ACTIVE') {
    return <ApprovalGate status={data.status} reason={data.rejectionReason} onLogout={handleLogout} loggingOut={loggingOut} />;
  }

  return (
    <div className="min-h-screen bg-gray-200">
      <div className=" bg-white  shadow-sm overflow-hidden min-h-[calc(100vh-3rem)] flex flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 sm:px-8 h-16 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black" style={{ backgroundColor: PURPLE }}>S</span>
            <span className="text-lg font-extrabold text-gray-900 tracking-tight">Swipe</span>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-[13px] font-medium text-gray-500">
            <button type="button" className="flex items-center gap-1.5 text-gray-900"><Icon icon="solar:home-2-linear" width={15} />Swipe Home</button>
            <button type="button" onClick={comingSoon} className="flex items-center gap-1.5 hover:text-gray-900"><Icon icon="solar:card-linear" width={15} />Payments</button>
            <button type="button" onClick={comingSoon} className="flex items-center gap-1.5 hover:text-gray-900"><Icon icon="solar:menu-dots-linear" width={15} />More</button>
          </nav>

          <div className="flex items-center gap-2 relative">
            {['solar:magnifer-linear', 'solar:pulse-linear', 'solar:muted-linear'].map((icon) => (
              <button key={icon} type="button" onClick={comingSoon} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50">
                <Icon icon={icon} width={15} />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-700 hover:bg-gray-50"
            >
              {initials(data?.ownerName === 'Pending Onboarding' ? data?.businessName : data?.ownerName)}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-20 w-44 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5">
                <div className="px-3 py-2 text-xs text-gray-400 truncate">{data?.email}</div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg disabled:opacity-50"
                >
                  <Icon icon="solar:logout-3-linear" width={16} />
                  {loggingOut ? 'Logging out...' : 'Log out'}
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="flex flex-1">
          {/* Sidebar */}
          <aside className="hidden lg:flex w-52 shrink-0 border-r border-gray-100 flex-col p-4">
            <div className="flex flex-col gap-1">
              {SIDEBAR_MAIN.map((item) => <SidebarItem key={item.label} {...item} onClick={item.active ? () => {} : undefined} />)}
            </div>
            <div className="mt-6 mb-2 px-3 text-xs font-medium text-gray-400">Payment Product</div>
            <div className="flex flex-col gap-1">
              {SIDEBAR_PRODUCTS.map((item) => <SidebarItem key={item.label} {...item} />)}
              <button type="button" onClick={comingSoon} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] font-medium text-gray-600 hover:bg-gray-50">
                <span className="flex items-center gap-2.5"><Icon icon="solar:add-circle-linear" width={16} />More</span>
                <Icon icon="solar:alt-arrow-down-linear" width={12} />
              </button>
            </div>
            <div className="mt-auto pt-4 border-t border-gray-100">
              <SidebarItem label="Account & Setting" icon="solar:settings-linear" />
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-w-0">
            <div className="px-5 sm:px-8 py-3 flex items-center justify-between text-white text-xs sm:text-[13px]" style={{ backgroundColor: PURPLE }}>
              <span className="flex items-center gap-2">
                You are currently in test mode. No real money is involved.
                <Icon icon="solar:info-circle-linear" width={14} />
              </span>
              <button type="button" onClick={comingSoon} className="hidden sm:flex items-center gap-1 font-medium">
                Switch to live mode <Icon icon="solar:arrow-right-linear" width={14} />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-32">
                <Icon icon="line-md:loading-twotone-loop" className="text-4xl" style={{ color: PURPLE }} />
              </div>
            ) : !data ? (
              <p className="text-center text-sm text-gray-500 py-32">Could not load your dashboard. Please refresh.</p>
            ) : (
              <div className="px-5 sm:px-8 py-8">
                <div className="text-center">
                  <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900">Hey {displayName}, welcome to Swipe</h1>
                  <p className="text-sm text-gray-500 mt-3">Finish these steps and you are ready to accept payments.</p>
                </div>

                <div className="border-t border-gray-200 mt-7 pt-7 flex items-center justify-between gap-6">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900 mb-2">Set up your account</h2>
                    <span className="inline-block px-3 py-1 rounded-md bg-gray-100 text-[11px] font-semibold text-gray-600">
                      {doneCount}/{checklist.length} COMPLETE
                    </span>
                  </div>
                  <div className="hidden sm:flex items-end justify-center w-40 h-24 rounded-t-3xl bg-gradient-to-t from-purple-50 to-transparent">
                    <div className="w-20 h-24 rounded-t-2xl border-[3px] border-blue-500 bg-white flex items-center justify-center gap-1.5">
                      <span className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center text-white"><Icon icon="solar:card-bold" width={15} /></span>
                      <span className="w-7 h-7 rounded-md bg-emerald-500 flex items-center justify-center text-white"><Icon icon="solar:qr-code-bold" width={15} /></span>
                    </div>
                  </div>
                </div>

                {/* Checklist */}
                <div className="mt-5 border border-gray-200 rounded-2xl overflow-hidden">
                  {checklist.map((item, i) => {
                    const open = activeKey === item.key;
                    return (
                      <div key={item.key} className={i > 0 ? 'border-t border-gray-200' : ''}>
                        <button
                          type="button"
                          onClick={() => setOpenKey(open ? '' : item.key)}
                          className="w-full flex items-center gap-3 px-5 py-4 text-left"
                        >
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-emerald-100 text-emerald-600' : 'border-2 border-gray-300'}`}>
                            {item.done && <Icon icon="solar:check-read-linear" width={12} />}
                          </span>
                          <span className="flex-1">
                            <span className="block text-sm font-semibold text-gray-900">{item.title}</span>
                            <span className="block text-xs text-gray-400 mt-0.5">{item.hint}</span>
                          </span>
                          <Icon icon={open ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} width={14} className="text-gray-500" />
                        </button>
                        {open && <div className="px-5 pb-5 pl-[3.25rem]">{item.content}</div>}
                      </div>
                    );
                  })}
                </div>

                {/* Ways to collect payments */}
                <div className="mt-5 border border-gray-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-xl p-5 bg-purple-50 border border-purple-100 flex flex-col">
                    <div className="text-xs text-gray-500">Accept payments in person</div>
                    <div className="text-base font-bold text-gray-900 mt-2">Start collecting with your QR</div>
                    <p className="text-xs text-gray-500 mt-2 flex-1">Customers scan your Swipe QR code and pay straight into your settlement account.</p>
                    <button
                      type="button"
                      onClick={() => (staticQr?.imageUrl ? setOpenKey('qr') : comingSoon())}
                      className="mt-4 self-start px-4 py-2 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      style={{ backgroundColor: PURPLE }}
                    >
                      {staticQr ? 'View QR' : 'Available after approval'} <Icon icon="solar:arrow-right-linear" width={13} />
                    </button>
                  </div>
                  {[
                    { tag: 'Share a link', title: 'Get paid with Payment Links', text: 'Create a link and send it over chat or email.', cta: 'Coming soon' },
                    { tag: 'Technical step', title: 'Need help to integrate?', text: 'Connect Swipe to your website or app.', cta: 'Coming soon' },
                  ].map((card) => (
                    <div key={card.title} className="rounded-xl p-5 border border-gray-200 flex flex-col">
                      <div className="text-xs text-gray-500">{card.tag}</div>
                      <div className="text-base font-bold text-gray-900 mt-2">{card.title}</div>
                      <p className="text-xs text-gray-500 mt-2 flex-1">{card.text}</p>
                      <button type="button" onClick={comingSoon} className="mt-4 self-start px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">
                        {card.cta}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Settlement info */}
                <div className="mt-5 border border-gray-200 rounded-2xl p-4 flex items-center gap-4">
                  <span className="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <Icon icon="solar:wallet-money-bold" width={22} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900">How money reaches your bank account?</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Money is transferred to your settlement account based on your settlement schedule, after deducting applicable fees and charges.
                    </div>
                  </div>
                  <button type="button" onClick={comingSoon} className="hidden sm:block shrink-0 px-3.5 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50">
                    Learn how it work
                  </button>
                </div>

                <div className="text-center mt-8 text-sm font-semibold text-gray-700 flex items-center justify-center gap-2">
                  <Icon icon="solar:link-round-linear" width={16} style={{ color: PURPLE }} />
                  More ways to accept payments
                </div>

                <h3 className="mt-8 text-base font-semibold text-gray-900">Ready-to-use products. No setup needed</h3>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SIDEBAR_PRODUCTS.map((p) => (
                    <button key={p.label} type="button" onClick={comingSoon} className="border border-gray-200 rounded-xl p-4 text-left hover:bg-gray-50">
                      <Icon icon={p.icon} width={20} style={{ color: PURPLE }} />
                      <div className="text-sm font-semibold text-gray-900 mt-3">{p.label}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Coming soon</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default MerchantDashboard
