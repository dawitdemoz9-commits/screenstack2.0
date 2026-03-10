'use client';

export default function AssessError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="card p-8 max-w-md text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-500">
          Unable to load this assessment. Please try refreshing or contact the recruiter.
        </p>
      </div>
    </div>
  );
}
