import * as React from "react";
import { AlertTriangle, BarChart3, Download, Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-elements";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { formatOrganisationDateTime } from "@/shared/lib/organisation-display-format.store";
import { toastApiError } from "@/shared/lib/toast";
import { useGlobalLocationScope } from "@/features/locations/hooks/useGlobalLocationScope";
import {
  useFetchAllIncidents,
  useIncidentAnalytics,
  useIncidentCategories,
} from "@/features/incidents/hooks/useIncidents";
import {
  INCIDENT_STATUS_LABELS,
  type IncidentAnalyticsFilters,
  type IncidentSeverity,
  type IncidentStatus,
} from "@/features/incidents/types";
import {
  buildAnalyticsSummaryCsv,
  buildIncidentListCsv,
  downloadCsv,
  formatClosureTime,
  formatTrendMonth,
  severityLabel,
  weekRowsMondayFirst,
} from "@/features/incidents/utils/incident-analytics-export";

const SEVERITIES: IncidentSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
/** Workflow order; REOPENED is legacy and only shown when present. */
const STATUSES: IncidentStatus[] = [
  "REPORTED",
  "UNDER_REVIEW",
  "UNDER_INVESTIGATION",
  "ACTIONS_REQUIRED",
  "AWAITING_CLOSURE",
  "CLOSED",
];

const selectClass =
  "h-9 rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function BarList({
  title,
  hint,
  rows,
}: {
  title: string;
  hint?: string;
  rows: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  const empty = rows.length === 0 || rows.every((r) => r.count === 0);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {hint ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {empty ? (
        <p className="mt-3 text-sm text-muted-foreground">No data.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <span
                className="w-36 shrink-0 truncate text-muted-foreground"
                title={r.label}
              >
                {r.label}
              </span>
              <div className="h-3.5 flex-1 overflow-hidden rounded-sm bg-muted">
                <div
                  className="h-full rounded-sm bg-primary/70"
                  style={{ width: `${Math.round((r.count / max) * 100)}%` }}
                  aria-hidden
                />
              </div>
              <span className="w-8 shrink-0 text-right tabular-nums">
                {r.count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function IncidentAnalyticsPage() {
  const { locationId } = useGlobalLocationScope();
  const [filters, setFilters] = React.useState<IncidentAnalyticsFilters>({});
  const effective: IncidentAnalyticsFilters = {
    ...filters,
    locationId: locationId ?? filters.locationId,
  };
  const { data, isLoading, isError } = useIncidentAnalytics(effective);
  const { data: categories = [] } = useIncidentCategories();
  const fetchAllIncidents = useFetchAllIncidents();
  const [exportingList, setExportingList] = React.useState(false);

  const t = data?.totals;
  const hasFilter = Boolean(
    filters.dateFrom ||
    filters.dateTo ||
    filters.categoryId ||
    filters.severity ||
    filters.status,
  );
  const rangeReversed = Boolean(
    filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo,
  );
  const set = (patch: Partial<IncidentAnalyticsFilters>) =>
    setFilters((f) => ({ ...f, ...patch }));

  const exportContext = () => {
    const period =
      filters.dateFrom || filters.dateTo
        ? `${filters.dateFrom ?? "start"} to ${filters.dateTo ?? "today"}`
        : "All dates";
    const parts = [
      effective.locationId
        ? `Branch: ${data?.byLocation.find((l) => l.id === effective.locationId)?.name ?? "selected branch"}`
        : null,
      filters.categoryId
        ? `Category: ${categories.find((c) => c.id === filters.categoryId)?.label ?? filters.categoryId}`
        : null,
      filters.severity ? `Severity: ${severityLabel(filters.severity)}` : null,
      filters.status
        ? `Status: ${INCIDENT_STATUS_LABELS[filters.status]}`
        : null,
    ].filter(Boolean);
    return {
      generatedAt: formatOrganisationDateTime(new Date()),
      period,
      filters: parts.length ? parts.join("; ") : "None",
    };
  };
  const fileStem = `incidents-${filters.dateFrom ?? "all"}-${filters.dateTo ?? "to-date"}`;

  const onExportSummary = () => {
    if (!data) return;
    downloadCsv(
      `${fileStem}-summary.csv`,
      buildAnalyticsSummaryCsv(data, exportContext()),
    );
  };

  const onExportList = async () => {
    setExportingList(true);
    try {
      // Same date field as analytics (when it happened), so the row count matches "Total".
      const items = await fetchAllIncidents({
        ...effective,
        dateField: "occurredAt",
      });
      downloadCsv(
        `${fileStem}-list.csv`,
        buildIncidentListCsv(items, (iso) => formatOrganisationDateTime(iso)),
      );
    } catch (e) {
      toastApiError(e, "Could not export the incident list");
    } finally {
      setExportingList(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Incident Analytics"
        description="Patterns across incidents in the selected period. Times are UK time."
        icon={
          <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />
        }
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Accident & Incident" },
          { label: "Analytics" },
        ]}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={onExportSummary}
          disabled={!data || rangeReversed}
          data-testid="incident-analytics-export-summary"
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Summary CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void onExportList()}
          disabled={!data || rangeReversed || exportingList || t?.total === 0}
          data-testid="incident-analytics-export-list"
        >
          {exportingList ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-3.5 w-3.5" />
          )}
          Incident list CSV
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          From
          <Input
            type="date"
            value={filters.dateFrom ?? ""}
            max={filters.dateTo || undefined}
            onChange={(e) => set({ dateFrom: e.target.value || undefined })}
            className="h-9 w-40"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          To
          <Input
            type="date"
            value={filters.dateTo ?? ""}
            min={filters.dateFrom || undefined}
            onChange={(e) => set({ dateTo: e.target.value || undefined })}
            className="h-9 w-40"
          />
        </label>
        <select
          className={selectClass}
          value={filters.categoryId ?? ""}
          onChange={(e) => set({ categoryId: e.target.value || undefined })}
          aria-label="Category filter"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={filters.severity ?? ""}
          onChange={(e) =>
            set({
              severity: (e.target.value || undefined) as
                IncidentSeverity | undefined,
            })
          }
          aria-label="Severity filter"
        >
          <option value="">All severities</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {severityLabel(s)}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={filters.status ?? ""}
          onChange={(e) =>
            set({
              status: (e.target.value || undefined) as
                IncidentStatus | undefined,
            })
          }
          aria-label="Status filter"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {INCIDENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {hasFilter ? (
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => setFilters({})}
          >
            Clear filters
          </button>
        ) : null}
      </div>
      {rangeReversed ? (
        <p className="text-sm text-destructive">
          “From” is after “To”, so no incidents can match. Adjust the dates.
        </p>
      ) : null}

      {data && data.warnings.length > 0 ? (
        <div className="space-y-1.5">
          {data.warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {w.label}
            </div>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Loading analytics…
        </p>
      ) : isError || !data || !t ? (
        <p className="py-10 text-center text-sm text-destructive">
          Could not load analytics.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total" value={t.total} />
            <StatCard label="Open" value={t.open} />
            <StatCard
              label="High / Critical (all)"
              value={t.highCritical}
              hint="Open and closed, in this period"
            />
            <StatCard label="Overdue actions" value={t.overdueActions} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Falls" value={t.falls} />
            <StatCard label="Medication" value={t.medication} />
            <StatCard label="Near misses" value={t.nearMiss} />
            <StatCard label="Involving staff" value={t.involvingEmployees} />
            <StatCard
              label="Repeat service users"
              value={t.repeatServiceUsers}
              hint="2+ incidents in this period"
            />
            <StatCard
              label="Average time to close"
              value={formatClosureTime(t.averageClosureHours)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <BarList
              title="By category"
              rows={data.byCategory.map((c) => ({
                label: c.label,
                count: c.count,
              }))}
            />
            <BarList
              title="Top subtypes"
              rows={data.bySubtype.map((s) => ({
                label: s.label,
                count: s.count,
              }))}
            />
            <BarList
              title="By severity"
              rows={SEVERITIES.map((s) => ({
                label: severityLabel(s),
                count: data.bySeverity[s] ?? 0,
              }))}
            />
            <BarList
              title="By status"
              rows={[
                ...STATUSES.map((s) => ({
                  label: INCIDENT_STATUS_LABELS[s],
                  count: data.byStatus[s] ?? 0,
                })),
                ...(data.byStatus.REOPENED
                  ? [
                      {
                        label: INCIDENT_STATUS_LABELS.REOPENED,
                        count: data.byStatus.REOPENED,
                      },
                    ]
                  : []),
              ]}
            />
            <BarList
              title="Time of day"
              hint="UK time"
              rows={data.byTimeOfDay.map((b) => ({
                label: b.label,
                count: b.count,
              }))}
            />
            <BarList
              title="Day of week"
              hint="UK time"
              rows={weekRowsMondayFirst(data.byDayOfWeek).map((d) => ({
                label: d.day,
                count: d.count,
              }))}
            />
            <BarList
              title="By branch"
              hint="Incidents with no branch recorded are not shown"
              rows={data.byLocation.map((l) => ({
                label: l.name,
                count: l.count,
              }))}
            />
            <BarList
              title="Service users with most incidents"
              hint="Counts every incident a service user was involved in"
              rows={data.byServiceUser.map((s) => ({
                label: s.name,
                count: s.count,
              }))}
            />
            <BarList
              title="Reported by"
              hint="Carers who reported the most incidents"
              rows={(data.byReporter ?? []).map((r) => ({ label: r.name, count: r.count }))}
            />
            <BarList
              title="Reported from"
              rows={[
                { label: 'Carer app', count: data.bySource?.carerApp ?? 0 },
                { label: 'Recorded by the office', count: data.bySource?.office ?? 0 },
              ]}
            />
            <BarList
              title="Injury types"
              rows={data.injuryTypes.map((i) => ({
                label: i.type,
                count: i.count,
              }))}
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Monthly trend
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Last 12 months, by when it happened
            </p>
            <div
              className="mt-3 flex items-end gap-1.5"
              style={{ height: 140 }}
            >
              {data.monthlyTrend.map((m) => {
                const max = Math.max(
                  1,
                  ...data.monthlyTrend.map((x) => x.count),
                );
                const label = formatTrendMonth(m.month);
                return (
                  <div
                    key={m.month}
                    className="flex flex-1 flex-col items-center gap-1"
                    title={`${label}: ${m.count}`}
                  >
                    <span className="text-[11px] tabular-nums text-foreground">
                      {m.count || ""}
                    </span>
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-sm bg-primary/70"
                        style={{
                          height: `${Math.round((m.count / max) * 100)}%`,
                        }}
                        aria-hidden
                      />
                    </div>
                    <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
