import { prisma } from '@/lib/db';
import Link from 'next/link';

async function getAssessments(showTemplates: boolean) {
  return prisma.assessment.findMany({
    where: { isActive: true, isTemplate: showTemplates ? undefined : false },
    include: {
      _count: { select: { invites: true, attempts: true, sections: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

const ROLE_COLORS: Record<string, string> = {
  'react-developer':              'bg-cyan-100 text-cyan-700',
  'backend-engineer':             'bg-purple-100 text-purple-700',
  'data-analyst':                 'bg-yellow-100 text-yellow-700',
  'data-engineer':                'bg-orange-100 text-orange-700',
  'salesforce-developer':         'bg-blue-100 text-blue-700',
  'salesforce-admin':             'bg-blue-100 text-blue-700',
  'servicenow-developer':         'bg-green-100 text-green-700',
  'netsuite-developer':           'bg-indigo-100 text-indigo-700',
  'sap-consultant':               'bg-pink-100 text-pink-700',
  'workday-integration':          'bg-teal-100 text-teal-700',
};

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ templates?: string }>;
}) {
  const sp = await searchParams;
  const showTemplates = sp.templates === 'true';
  const assessments = await getAssessments(showTemplates);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {showTemplates ? 'Starter Templates' : 'Assessments'}
          </h1>
          <p className="text-gray-500 mt-1">
            {showTemplates
              ? 'Pre-built assessments for common roles. Clone to customise.'
              : 'Manage your technical assessments.'}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={showTemplates ? '/admin/assessments' : '/admin/assessments?templates=true'}
            className="btn-secondary"
          >
            {showTemplates ? '← My Assessments' : 'View Templates'}
          </Link>
          <Link href="/admin/assessments/new" className="btn-primary">
            + New Assessment
          </Link>
        </div>
      </div>

      {assessments.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No assessments yet</h3>
          <p className="text-gray-500 mb-6">
            Start from a template or create a new assessment from scratch.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/admin/assessments?templates=true" className="btn-secondary">View Templates</Link>
            <Link href="/admin/assessments/new" className="btn-primary">Create Assessment</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {assessments.map((a) => (
            <Link
              key={a.id}
              href={`/admin/assessments/${a.id}`}
              className="card p-6 hover:shadow-md transition-shadow flex items-center gap-6"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-gray-900">{a.title}</h3>
                  {a.isTemplate && (
                    <span className="badge bg-amber-100 text-amber-700">Template</span>
                  )}
                  <span className={`badge ${ROLE_COLORS[a.roleType] || 'bg-gray-100 text-gray-700'}`}>
                    {a.roleType.replace(/-/g, ' ')}
                  </span>
                </div>
                {a.description && (
                  <p className="text-sm text-gray-500 line-clamp-1">{a.description}</p>
                )}
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <span>{a._count.sections} sections</span>
                <span>{a._count.invites} invites</span>
                <span>{a._count.attempts} attempts</span>
                <span>{a.timeLimit} min</span>
                <span className="text-brand-600 font-medium">View →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
