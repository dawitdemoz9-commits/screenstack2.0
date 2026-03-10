/**
 * Assessment page — server shell that resolves params and passes them into a
 * Suspense-wrapped client component. This avoids the Next.js 14 requirement
 * that useSearchParams() must be wrapped in a Suspense boundary.
 */

import { Suspense } from 'react';
import AssessmentClient from './AssessmentClient';

export default async function AssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ t?: string; a?: string }>;
}) {
  const { token } = await params;
  const { t: accessToken = '', a: attemptId = '' } = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading assessment…</p>
          </div>
        </div>
      }
    >
      <AssessmentClient
        token={token}
        accessToken={accessToken}
        attemptId={attemptId}
      />
    </Suspense>
  );
}
