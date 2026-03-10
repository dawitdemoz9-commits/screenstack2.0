'use client';

import { useRouter } from 'next/navigation';

interface Props {
  roles: { roleType: string }[];
  roleFilter: string;
  statusFilter: string;
}

export default function ReportsFilter({ roles, roleFilter, statusFilter }: Props) {
  const router = useRouter();

  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams();
    if (e.target.value) params.set('role', e.target.value);
    if (statusFilter) params.set('status', statusFilter);
    router.push(`/admin/reports?${params.toString()}`);
  }

  return (
    <div className="flex gap-3 mb-6 flex-wrap">
      <select
        name="role"
        defaultValue={roleFilter}
        className="input w-auto text-sm"
        onChange={handleRoleChange}
      >
        <option value="">All Roles</option>
        {roles.map((r) => (
          <option key={r.roleType} value={r.roleType}>
            {r.roleType.replace(/-/g, ' ')}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        {(['', 'COMPLETED', 'FLAGGED'] as const).map((s) => {
          const params = new URLSearchParams();
          if (s) params.set('status', s);
          if (roleFilter) params.set('role', roleFilter);
          const isActive = statusFilter === s;
          return (
            <a
              key={s}
              href={`/admin/reports?${params.toString()}`}
              className={`btn-${isActive ? 'primary' : 'secondary'} text-sm`}
            >
              {s === '' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </a>
          );
        })}
      </div>
    </div>
  );
}
