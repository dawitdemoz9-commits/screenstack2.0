'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UseTemplateButton({ assessmentId }: { assessmentId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleUse() {
    setLoading(true);
    const res = await fetch(`/api/admin/assessments/${assessmentId}/clone`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      router.push(`/admin/assessments/${data.assessment.id}`);
    } else {
      alert('Failed to clone template');
      setLoading(false);
    }
  }

  return (
    <button onClick={handleUse} disabled={loading} className="btn-primary">
      {loading ? 'Cloning...' : 'Use Template'}
    </button>
  );
}
