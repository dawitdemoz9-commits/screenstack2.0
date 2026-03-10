import Link from 'next/link';

export default async function CompletePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await params; // unused but required

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-brand-50">
      <div className="card p-10 max-w-lg text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Assessment Submitted!</h1>
        <p className="text-gray-500 mb-2">
          Your answers have been successfully submitted.
        </p>
        <p className="text-gray-500 mb-8">
          The hiring team will review your responses and be in touch with next steps.
          There is nothing more you need to do.
        </p>
        <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p>Powered by <strong>ScreenStack</strong></p>
        </div>
      </div>
    </div>
  );
}
