import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, Filter, History, Loader2, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { PageLayout } from '@/src/components/layout/PageLayout';
import { auditLogService } from '@/src/services/auditLogService';

function asArray(value: any) {
  return Array.isArray(value) ? value : [];
}

function formatDate(value?: string) {
  if (!value) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function actionLabel(action: string) {
  return action.replace(/\./g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function detailsText(details: any) {
  if (!details) return 'No details recorded';

  if (Array.isArray(details.changes) && details.changes.length) {
    return details.changes.map((change: any) => `${change.field}: "${change.from || '-'}" to "${change.to || '-'}"`).join('; ');
  }

  return (
    Object.entries(details)
      .filter(([key]) => key !== 'changes')
      .map(([key, value]) => `${key}: ${String(value || '-')}`)
      .join('; ') || 'No details recorded'
  );
}

function actorLabel(log: any) {
  return log.userName || 'System';
}

function actorFilterValue(log: any) {
  const name = actorLabel(log);
  const email = log.userEmail && log.userEmail !== name ? ` (${log.userEmail})` : '';
  return `${name}${email}`;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [entityFilter, setEntityFilter] = useState('All');
  const [userFilter, setUserFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadLogs() {
      setIsLoading(true);
      try {
        const data = await auditLogService.list({ limit: 1000 });
        if (isMounted) setLogs(asArray(data));
      } catch (error: any) {
        toast.error(error.message || 'Unable to load audit logs');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadLogs();
    return () => {
      isMounted = false;
    };
  }, []);

  const actionOptions = useMemo(() => ['All', ...Array.from(new Set(logs.map((log) => log.action).filter(Boolean)))], [logs]);
  const entityOptions = useMemo(() => ['All', ...Array.from(new Set(logs.map((log) => log.entityType).filter(Boolean)))], [logs]);
  const userOptions = useMemo(() => ['All', ...Array.from(new Set(logs.map(actorFilterValue)))], [logs]);

  const filteredLogs = logs.filter((log) => {
    const searchable = `${log.action} ${log.entityType} ${log.userEmail} ${log.userName} ${log.userRole} ${detailsText(log.details)}`.toLowerCase();
    const matchesSearch = searchable.includes(search.toLowerCase());
    const matchesAction = actionFilter === 'All' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'All' || log.entityType === entityFilter;
    const matchesUser = userFilter === 'All' || actorFilterValue(log) === userFilter;

    return matchesSearch && matchesAction && matchesEntity && matchesUser;
  });

  const exportLogs = () => {
    const rows = filteredLogs.map((log) => ({
      Timestamp: formatDate(log.createdAt),
      Operator: actorLabel(log),
      'Operator Email': log.userEmail || 'System',
      Action: actionLabel(log.action),
      Entity: log.entityType,
      'Entity ID': log.entityId,
      Details: detailsText(log.details),
      IP: log.ipAddress,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
    XLSX.writeFile(wb, 'EIMS_Audit_Logs.xlsx');
    toast.success('Audit logs exported');
  };

  return (
    <PageLayout title="System Audit Logs">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search logs by action, user, record, or field..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm focus:ring-2 focus:ring-[#111827] outline-none"
              />
            </div>
            <FilterSelect label="Action" value={actionFilter} onChange={setActionFilter} options={actionOptions} />
            <FilterSelect label="Entity" value={entityFilter} onChange={setEntityFilter} options={entityOptions} />
            <FilterSelect label="User" value={userFilter} onChange={setUserFilter} options={userOptions} />
          </div>
          <button
            onClick={exportLogs}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#111827] hover:bg-[#F9FAFB] shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export Logs
          </button>
        </div>

        <div className="bg-[#FEF2F2] border border-[#FEE2E2] p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#EF4444] mt-0.5" />
          <div>
            <p className="text-sm font-bold text-[#991B1B]">Security Notice</p>
            <p className="text-xs text-[#B91C1C]">Audit logs show employee additions, edits, and other privileged activity from the database.</p>
          </div>
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full min-w-[980px] text-left border-collapse">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Operator</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Action</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Target</th>
                <th className="px-6 py-4 text-[10px] font-black text-[#9CA3AF] uppercase tracking-widest">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#F9FAFB] transition-colors align-top">
                  <td className="px-6 py-4 text-xs font-bold text-[#111827] whitespace-nowrap">{formatDate(log.createdAt)}</td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-[#111827]">{actorLabel(log)}</p>
                    <p className="text-[10px] text-[#6B7280] uppercase font-bold tracking-tighter">ID: {log.userId || 'n/a'}</p>
                    {log.userEmail && <p className="text-[10px] text-[#9CA3AF] mt-1">{log.userEmail}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter bg-[#F3F4F6] text-[#4B5563]">
                      {actionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-[#111827]">{log.details?.fullName || log.details?.employeeNumber || log.entityType}</p>
                    <p className="text-[10px] text-[#9CA3AF] mt-1">Entity: {log.entityType}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-[#4B5563] leading-relaxed">{detailsText(log.details)}</p>
                    {log.ipAddress && <p className="text-[10px] text-[#9CA3AF] mt-1">IP: {log.ipAddress}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(isLoading || filteredLogs.length === 0) && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-[#F3F4F6] rounded-2xl flex items-center justify-center mx-auto mb-4">
                {isLoading ? <Loader2 className="w-8 h-8 text-[#9CA3AF] animate-spin" /> : <History className="w-8 h-8 text-[#D1D5DB]" />}
              </div>
              <h3 className="text-lg font-bold text-[#111827]">{isLoading ? 'Loading audit logs' : 'No audit logs found'}</h3>
              <p className="text-sm text-[#6B7280]">{isLoading ? 'Fetching activity from the database.' : 'Try changing the filters or search term.'}</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm font-bold text-[#4B5563] outline-none focus:ring-2 focus:ring-[#111827]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === 'All' ? `All ${label}s` : option}
          </option>
        ))}
      </select>
    </label>
  );
}
