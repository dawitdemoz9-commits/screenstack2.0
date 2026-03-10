import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import Link from 'next/link';

async function getStats() {
  const [assessments, candidates, invites, attempts] = await Promise.all([
    prisma.assessment.count({ where: { isActive: true, isTemplate: false } }),
    prisma.candidate.count(),
    prisma.invite.count(),
    prisma.attempt.count({ where: { status: 'COMPLETED' } }),
  ]);

  const recent = await prisma.attempt.findMany({
    where: { status: 'COMPLETED' },
    include: {
      candidate:  { select: { name: true, email: true } },
      assessment: { select: { title: true, roleType: true } },
    },
    orderBy: { completedAt: 'desc' },
    take: 5,
  });

  return { assessments, candidates, invites, attempts, recent };
}

export default async function AdminDashboard() {
  const user = await getAuthUser();
  const stats = await getStats();

  const statCards = [
    { label: 'Assessments',        value: stats.assessments, href: '/admin/assessments', color: 'brand' },
    { label: 'Candidates Invited', value: stats.candidates,  href: '/admin/candidates',  color: 'blue'  },
    { label: 'Invites Sent',       value: stats.invites,     href: '/admin/invites',     color: 'indigo' },
    { label: 'Completed',          value: stats.attempts,    href: '/admin/candidates',  color: 'green'  },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your assessments.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href}>
            <div className="card p-6 hover:shadow-md transition-shadow cursor-pointer">
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-1">Create Assessment</h3>
          <p className="text-sm text-gray-500 mb-4">Build a new assessment from scratch or use a starter template.</p>
          <Link href="/admin/assessments/new" className="btn-primary text-sm">
            New Assessment
          </Link>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-1">Invite Candidate</h3>
          <p className="text-sm text-gray-500 mb-4">Send a secure assessment link to a candidate via email.</p>
          <Link href="/admin/invites" className="btn-primary text-sm">
            Send Invite
          </Link>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold text-gray-900 mb-1">Starter Templates</h3>
          <p className="text-sm text-gray-500 mb-4">10 pre-built assessments for common engineering roles.</p>
          <Link href="/admin/assessments?templates=true" className="btn-secondary text-sm">
            View Templates
          </Link>
        </div>
      </div>

      {/* Recent completions */}
      {stats.recent.length > 0 && (
        <div className="card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Recent Completions</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {stats.recent.map((attempt) => (
              <div key={attempt.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{attempt.candidate.name}</p>
                  <p className="text-xs text-gray-500">{attempt.assessment.title}</p>
                </div>
                <div className="flex items-center gap-3">
                  {attempt.score !== null && attempt.maxScore !== null && (
                    <span className={`badge ${
                      attempt.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {Math.round(((attempt.score ?? 0) / (attempt.maxScore ?? 1)) * 100)}%
                      {attempt.passed ? ' · Pass' : ' · Fail'}
                    </span>
                  )}
                  <Link
                    href={`/admin/reports/${attempt.id}`}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    View report →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
