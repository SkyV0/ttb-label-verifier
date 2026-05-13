"use client";

import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useI18n, type I18nKey } from "@/components/I18nProvider";
import type { VerificationResult, Verdict } from "@/lib/types";

export interface BatchItem {
  filename: string;
  result?: VerificationResult;
  error?: { code: string; message: string } | string;
}

type SortKey = "filename" | "verdict" | "elapsed";
type SortDir = "asc" | "desc";
type VerdictFilter = "all" | Verdict | "error";

const PAGE_SIZES = [10, 25, 50, 100] as const;
type PageSize = (typeof PAGE_SIZES)[number];

const VERDICT_ORDER: Record<Verdict | "error", number> = {
  rejected: 0,
  error: 1,
  needs_review: 2,
  verified: 3,
};

function errorMessage(item: BatchItem): string {
  if (!item.error) return "";
  return typeof item.error === "string" ? item.error : item.error.message;
}

function rowVerdict(item: BatchItem): Verdict | "error" {
  if (item.error) return "error";
  return item.result?.verdict ?? "error";
}

function rowIssues(item: BatchItem): string {
  if (item.error) return errorMessage(item);
  const r = item.result;
  if (!r) return "";
  const fieldIssues = r.fields.filter((f) => f.status !== "match").map((f) => f.key).join(", ");
  return r.warning.ok ? fieldIssues || "—" : `Warning${fieldIssues ? " + " + fieldIssues : ""}`;
}

function rowElapsed(item: BatchItem): number {
  return item.result?.elapsed_ms ?? 0;
}

function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(items: BatchItem[], filename = "ttb-batch-results.csv") {
  const header = ["filename", "verdict", "issues", "elapsed_ms"];
  const rows = items.map((it) => [
    csvEscape(it.filename),
    csvEscape(rowVerdict(it)),
    csvEscape(rowIssues(it)),
    csvEscape(rowElapsed(it)),
  ]);
  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SortHeader({
  active,
  dir,
  onClick,
  children,
}: {
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <th
      scope="col"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button type="button" className="batch-sort-btn" onClick={onClick}>
        <span>{children}</span>
        <span aria-hidden className="batch-sort-indicator">
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

const Row = memo(function Row({
  item,
  verdictLabel,
}: {
  item: BatchItem;
  verdictLabel: string;
}) {
  const verdict = rowVerdict(item);
  return (
    <tr>
      <td title={item.filename} style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.filename}
      </td>
      <td className={`batch-row-status ${verdict === "error" ? "rejected" : verdict}`}>
        {verdict === "error" ? "ERROR" : verdictLabel}
      </td>
      <td>{rowIssues(item) || "—"}</td>
      <td>{item.error ? "—" : `${rowElapsed(item)} ms`}</td>
    </tr>
  );
});

interface Props {
  items: BatchItem[];
}

export function BatchResultsTable({ items }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("verdict");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [page, setPage] = useState(1);

  const deferredQuery = useDeferredValue(query);

  const summary = useMemo(() => {
    const c = { verified: 0, needs_review: 0, rejected: 0, error: 0 };
    for (const it of items) {
      const v = rowVerdict(it);
      c[v] += 1;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return items.filter((it) => {
      if (verdictFilter !== "all" && rowVerdict(it) !== verdictFilter) return false;
      if (!q) return true;
      if (it.filename.toLowerCase().includes(q)) return true;
      const issues = rowIssues(it).toLowerCase();
      if (issues.includes(q)) return true;
      const r = it.result;
      if (r) {
        for (const f of r.fields) {
          if ((f.application || "").toLowerCase().includes(q)) return true;
          if ((f.label || "").toLowerCase().includes(q)) return true;
        }
      }
      return false;
    });
  }, [items, deferredQuery, verdictFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "filename") {
        cmp = a.filename.localeCompare(b.filename);
      } else if (sortKey === "verdict") {
        cmp = VERDICT_ORDER[rowVerdict(a)] - VERDICT_ORDER[rowVerdict(b)];
      } else if (sortKey === "elapsed") {
        cmp = rowElapsed(a) - rowElapsed(b);
      }
      return cmp * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Snap back to page 1 whenever filters/search/page-size change the result set.
  useEffect(() => {
    setPage(1);
  }, [deferredQuery, verdictFilter, pageSize, items]);

  const safePage = Math.min(page, pageCount);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const visible = sorted.slice(start, end);

  const toggleSort = useCallback(
    (key: SortKey) => {
      setSortKey((prev) => {
        if (prev === key) {
          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          return prev;
        }
        setSortDir("asc");
        return key;
      });
    },
    [],
  );

  const onSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const onClear = useCallback(() => {
    setQuery("");
    setVerdictFilter("all");
  }, []);

  const onExport = useCallback(() => {
    downloadCsv(sorted);
  }, [sorted]);

  return (
    <>
      <div className="batch-summary">
        <button
          type="button"
          aria-pressed={verdictFilter === "all"}
          className="batch-stat batch-stat--all"
          onClick={() => setVerdictFilter("all")}
        >
          <div className="batch-stat__value">{items.length}</div>
          <div className="batch-stat__label">{t("batch.filter_all")}</div>
        </button>
        <button
          type="button"
          aria-pressed={verdictFilter === "verified"}
          className="batch-stat verified"
          onClick={() => setVerdictFilter("verified")}
        >
          <div className="batch-stat__value">{summary.verified}</div>
          <div className="batch-stat__label">{t("verdict.verified")}</div>
        </button>
        <button
          type="button"
          aria-pressed={verdictFilter === "needs_review"}
          className="batch-stat needs_review"
          onClick={() => setVerdictFilter("needs_review")}
        >
          <div className="batch-stat__value">{summary.needs_review}</div>
          <div className="batch-stat__label">{t("verdict.needs_review")}</div>
        </button>
        <button
          type="button"
          aria-pressed={verdictFilter === "rejected"}
          className="batch-stat rejected"
          onClick={() => setVerdictFilter("rejected")}
        >
          <div className="batch-stat__value">{summary.rejected + summary.error}</div>
          <div className="batch-stat__label">{t("verdict.rejected")}</div>
        </button>
      </div>

      <div className="batch-toolbar" role="search">
        <label htmlFor="batch-search" className="sr-only">
          {t("batch.search_label")}
        </label>
        <input
          id="batch-search"
          type="search"
          className="batch-search"
          value={query}
          onChange={onSearch}
          placeholder={t("batch.search_placeholder")}
          autoComplete="off"
        />
        <button
          type="button"
          className="batch-toolbar__action"
          onClick={onClear}
          disabled={!query && verdictFilter === "all"}
        >
          {t("action.dismiss")}
        </button>
        <button
          type="button"
          className="batch-toolbar__action"
          onClick={onExport}
          disabled={total === 0}
        >
          {t("batch.export_csv")}
        </button>
      </div>

      <div className="batch-table-wrap">
        <table className="batch-table" aria-busy={false} aria-rowcount={total}>
          <thead>
            <tr>
              <SortHeader
                active={sortKey === "filename"}
                dir={sortDir}
                onClick={() => toggleSort("filename")}
              >
                {t("batch.col_file")}
              </SortHeader>
              <SortHeader
                active={sortKey === "verdict"}
                dir={sortDir}
                onClick={() => toggleSort("verdict")}
              >
                {t("batch.col_verdict")}
              </SortHeader>
              <th scope="col">{t("batch.col_issues")}</th>
              <SortHeader
                active={sortKey === "elapsed"}
                dir={sortDir}
                onClick={() => toggleSort("elapsed")}
              >
                {t("batch.col_elapsed")}
              </SortHeader>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={4} className="batch-empty">
                  {t("batch.no_matches")}
                </td>
              </tr>
            ) : (
              visible.map((item, idx) => {
                const v = rowVerdict(item);
                const label =
                  v === "error" ? "ERROR" : t(`verdict.${v}` as I18nKey);
                return <Row key={`${start + idx}-${item.filename}`} item={item} verdictLabel={label} />;
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="batch-pagination">
        <div className="batch-pagination__info" aria-live="polite">
          {t("batch.showing", { start: total === 0 ? 0 : start + 1, end, total })}
        </div>
        <div className="batch-pagination__controls">
          <label className="batch-pagination__page-size">
            <span className="sr-only">{t("batch.page_size")}</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} / {t("batch.page_size").toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            aria-label={t("batch.page_prev")}
          >
            ‹
          </button>
          <span className="batch-pagination__indicator">
            {t("batch.page_indicator", { page: safePage, pages: pageCount })}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={safePage >= pageCount}
            aria-label={t("batch.page_next")}
          >
            ›
          </button>
        </div>
      </div>
    </>
  );
}

// Default export for next/dynamic ergonomics.
export default BatchResultsTable;
