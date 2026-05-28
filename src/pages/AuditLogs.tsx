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

function formatFieldName(field: string) {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value: any) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function detailsText(details: any) {
  if (!details) return [];

  if (Array.isArray(details.changes) && details.changes.length) {
    return details.changes.map((change: any) => ({
      field: formatFieldName(change.field),
      from: formatValue(change.from),
      to: formatValue(change.to),
    }));
  }

  return Object.entries(details)
    .filter(([key]) => key !== 'changes')
    .map(([key, value]) => ({
      field: formatFieldName(key),
      value: formatValue(value),
    }));
}

function detailsSearchText(details: any) {
  const items = detailsText(details);
  if (!items.length) return 'No details recorded';

  return items
    .map((item: any) => ('to' in item ? `${item.field}: ${item.from} to ${item.to}` : `${item.field}: ${item.value}`))
    .join('; ');
}

function actorLabel(log: any) {
  return log.userName || log.userEmail || 'System';
}

function actorFilterValue(log: any) {
  const name = actorLabel(log);
  const email = log.userEmail && log.userEmail !== name ? ` (${log.userEmail})` : '';
  return `${name}${email}`;
}

function entityLabel(log: any) {
  return log.entityLabel || log.details?.fullName || log.details?.employeeNumber || log.entityId || log.entityType;
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
    const searchable =
      `${log.action} ${log.entityType} ${entityLabel(log)} ${log.userEmail} ${log.userName} ${log.userRole} ${log.userAgent} ${detailsSearchText(log.details)}`.toLowerCase();
    const matchesSearch = searchable.includes(search.toLowerCase());
    const matchesAction = actionFilter === 'All' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'All' || log.entityType === entityFilter;
    const matchesUser = userFilter === 'All' || actorFilterValue(log) === userFilter;

    return matchesSearch && matchesAction && matchesEntity && matchesUser;
  });

  const exportLogs = () => {
    const rows = filteredLogs.map((log) => ({
      Timestamp: formatDate(log.createdAt),
      'Actor Name': actorLabel(log),
      'Actor Email': log.userEmail || 'System',
      'Actor ID': log.userId || 'n/a',
      'Actor Role': log.userRole || 'n/a',
      Action: actionLabel(log.action),
      Entity: log.entityType,
      'Entity Label': entityLabel(log),
      'Entity ID': log.entityId,
      Details: detailsSearchText(log.details),
      IP: log.ipAddress,
      'User Agent': log.userAgent,
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

        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm">
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-5">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-black text-[#111827]">{actionLabel(log.action)}</p>
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter bg-white border border-[#E5E7EB] text-[#4B5563]">
                        {log.entityType}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#6B7280] mt-1">by {actorLabel(log)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[#9CA3AF] uppercase font-bold tracking-tighter">
                      <span>ID: {log.userId || 'n/a'}</span>
                      <span>Role: {log.userRole || 'n/a'}</span>
                      {log.userEmail && <span>Email: {log.userEmail}</span>}
                    </div>
                  </div>

                  <div className="lg:text-right">
                    <p className="text-[10px] font-black text-[#9CA3AF] uppercase tracking-wider">{formatDate(log.createdAt)}</p>
                    <p className="text-xs font-bold text-[#4B5563] mt-2">{entityLabel(log)}</p>
                    {log.ipAddress && <p className="text-[10px] text-[#9CA3AF] mt-1">IP: {log.ipAddress}</p>}
                    {log.userAgent && <p className="text-[10px] text-[#9CA3AF] mt-1 break-all">UA: {log.userAgent}</p>}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {detailsText(log.details).length ? (
                    detailsText(log.details).map((item: any, index: number) => (
                      <div key={index} className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
                        {'to' in item ? (
                          <div className="flex flex-col gap-1 text-sm">
                            <span className="font-black text-[#111827]">{item.field}</span>
                            <div className="flex flex-wrap items-center gap-2 text-[#6B7280]">
                              <span className="line-through text-red-500">{item.from}</span>
                              <span className="font-bold text-[#9CA3AF]">-&gt;</span>
                              <span className="font-bold text-green-600">{item.to}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-sm">
                            <span className="font-black text-[#111827]">{item.field}</span>
                            <span className="text-[#4B5563] font-medium break-words">{item.value}</span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm font-bold text-[#9CA3AF]">No details recorded</p>
                  )}
                </div>
              </div>
            ))}
          </div>

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
