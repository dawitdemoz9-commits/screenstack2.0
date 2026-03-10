'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Assessment {
  id: string; title: string; description: string; roleType: string;
  timeLimit: number; passingScore: number; instructions: string;
  monitoringEnabled: boolean; requireCamera: boolean;
  requireMicrophone: boolean; requireScreen: boolean;
  sections: { id: string; title: string; _count: { questions: number } }[];
}
interface Invite {
  id: string; token: string;
  candidate: { name: string; email: string };
  assessment: Assessment;
}

export default function AssessLanding({
  invite,
  accessToken,
  expired,
}: {
  invite: Invite;
  accessToken: string;
  expired: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<'identity' | 'consent' | 'permissions' | 'ready'>('identity');
  const [identityName, setIdentityName] = useState(invite.candidate.name);
  const [identityEmail, setIdentityEmail] = useState(invite.candidate.email);
  const [consentGiven, setConsentGiven] = useState(false);
  const [permissions, setPermissions] = useState<{ camera?: boolean; mic?: boolean; screen?: boolean }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const a = invite.assessment;
  const totalQuestions = a.sections.reduce((s, sec) => s + sec._count.questions, 0);
  const needsPermissions = a.monitoringEnabled && (a.requireCamera || a.requireMicrophone || a.requireScreen);

  async function requestPermission(type: 'camera' | 'mic' | 'screen') {
    try {
      if (type === 'camera') {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setPermissions((p) => ({ ...p, camera: true }));
      } else if (type === 'mic') {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setPermissions((p) => ({ ...p, mic: true }));
      } else if (type === 'screen') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
        setPermissions((p) => ({ ...p, screen: true }));
      }
    } catch {
      setPermissions((p) => ({ ...p, [type]: false }));
      setError(`${type} permission denied. ${a[`require${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof a] ? 'This is required to start the assessment.' : ''}`);
    }
  }

  const canProceedPermissions = !needsPermissions || (
    (!a.requireCamera      || permissions.camera     === true) &&
    (!a.requireMicrophone  || permissions.mic        === true) &&
    (!a.requireScreen      || permissions.screen     === true)
  );

  async function startAssessment() {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/candidate/attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteId:     invite.id,
          accessToken,
          identityData: { name: identityName, email: identityEmail },
          consentGiven: true,
          permissions,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to start assessment'); return; }
      router.push(`/assess/${invite.id}/assessment?t=${accessToken}&a=${data.attempt.id}`);
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card p-8 max-w-md text-center">
          <div className="text-5xl mb-4">⏰</div>
          <h1 className="text-xl font-bold text-gray-900">This Link Has Expired</h1>
          <p className="text-gray-500 mt-2">Please contact the recruiter to get a new assessment link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{a.title}</h1>
          <p className="text-gray-500 mt-1">{a.description}</p>
        </div>

        {/* Assessment details */}
        <div className="card p-6 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{a.timeLimit}</p>
              <p className="text-sm text-gray-500">Minutes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalQuestions}</p>
              <p className="text-sm text-gray-500">Questions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{a.passingScore}%</p>
              <p className="text-sm text-gray-500">To Pass</p>
            </div>
          </div>
          {a.sections.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">Sections</p>
              <div className="space-y-1">
                {a.sections.map((sec) => (
                  <div key={sec.id} className="flex justify-between text-sm text-gray-600">
                    <span>{sec.title}</span>
                    <span>{sec._count.questions} questions</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {a.instructions && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">Instructions</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{a.instructions}</p>
            </div>
          )}
        </div>

        {/* Step: Identity */}
        {step === 'identity' && (
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Confirm Your Identity</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input className="input" value={identityName}
                  onChange={(e) => setIdentityName(e.target.value)} />
              </div>
              <div>
                <label className="label">Email Address</label>
                <input type="email" className="input" value={identityEmail}
                  onChange={(e) => setIdentityEmail(e.target.value)} />
              </div>
              <button
                className="btn-primary w-full"
                onClick={() => setStep('consent')}
                disabled={!identityName || !identityEmail}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step: Consent */}
        {step === 'consent' && (
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Assessment Agreement</h2>
            <div className="prose text-sm text-gray-600 mb-6 space-y-3">
              <p>By proceeding you agree to the following:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>This assessment must be completed independently and in one sitting.</li>
                <li>You may not use AI tools, external references, or ask others for help unless explicitly permitted.</li>
                <li>Your answers and activity will be recorded and reviewed by the hiring team.</li>
                {a.monitoringEnabled && (
                  <li>
                    <strong>Integrity monitoring is enabled.</strong> Browser events (tab switches,
                    copy/paste, window focus changes) will be logged as integrity signals.
                    These are indicators only and will be reviewed fairly.
                  </li>
                )}
              </ul>
            </div>
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
            <label className="flex items-start gap-3 cursor-pointer mb-4">
              <input type="checkbox" className="mt-1 w-4 h-4 text-brand-600"
                checked={consentGiven} onChange={(e) => setConsentGiven(e.target.checked)} />
              <span className="text-sm text-gray-700">
                I understand and agree to the above terms.
              </span>
            </label>
            <div className="flex gap-3">
              <button className="btn-secondary" onClick={() => setStep('identity')}>← Back</button>
              <button
                className="btn-primary flex-1"
                disabled={!consentGiven}
                onClick={() => needsPermissions ? setStep('permissions') : setStep('ready')}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step: Permissions */}
        {step === 'permissions' && (
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-2">Browser Permissions</h2>
            <p className="text-sm text-gray-500 mb-6">
              This assessment requires the following permissions. Click each button to grant access.
              Your browser controls what access is allowed.
            </p>
            {error && <p className="text-orange-600 text-sm mb-4">{error}</p>}
            <div className="space-y-3 mb-6">
              {a.requireCamera && (
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Camera <span className="text-red-500">*</span></p>
                    <p className="text-xs text-gray-500">Required for identity monitoring</p>
                  </div>
                  {permissions.camera === true
                    ? <span className="badge bg-green-100 text-green-700">Granted ✓</span>
                    : <button className="btn-secondary text-sm" onClick={() => requestPermission('camera')}>
                        Grant Camera
                      </button>
                  }
                </div>
              )}
              {a.requireMicrophone && (
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Microphone <span className="text-red-500">*</span></p>
                    <p className="text-xs text-gray-500">Required for audio monitoring</p>
                  </div>
                  {permissions.mic === true
                    ? <span className="badge bg-green-100 text-green-700">Granted ✓</span>
                    : <button className="btn-secondary text-sm" onClick={() => requestPermission('mic')}>
                        Grant Microphone
                      </button>
                  }
                </div>
              )}
              {a.requireScreen && (
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Screen Share <span className="text-red-500">*</span></p>
                    <p className="text-xs text-gray-500">Required for screen monitoring</p>
                  </div>
                  {permissions.screen === true
                    ? <span className="badge bg-green-100 text-green-700">Granted ✓</span>
                    : <button className="btn-secondary text-sm" onClick={() => requestPermission('screen')}>
                        Share Screen
                      </button>
                  }
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button className="btn-secondary" onClick={() => setStep('consent')}>← Back</button>
              <button
                className="btn-primary flex-1"
                disabled={!canProceedPermissions}
                onClick={() => setStep('ready')}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step: Ready */}
        {step === 'ready' && (
          <div className="card p-6 text-center">
            <div className="text-5xl mb-4">🚀</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ready to Begin</h2>
            <p className="text-gray-500 mb-6">
              You have <strong>{a.timeLimit} minutes</strong> to complete this assessment.
              Your progress is saved automatically.
            </p>
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
            <button
              className="btn-primary w-full text-base py-3"
              onClick={startAssessment}
              disabled={loading}
            >
              {loading ? 'Starting…' : 'Start Assessment'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
