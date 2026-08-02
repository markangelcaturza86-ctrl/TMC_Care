import { useMemo, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export default function DataTable({
  columns,
  rows,
  searchable = true,
  searchPlaceholder = 'Search...',
  searchKeys,
  filters,
  pageSize = 8,
  rowKey = 'id',
  emptyMessage = 'No records found.',
  toolbarRight,
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState({});

  const filtered = useMemo(() => {
    let data = rows;
    if (query.trim() && searchKeys?.length) {
      const q = query.trim().toLowerCase();
      data = data.filter((row) =>
        searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(q))
      );
    }
    if (filters) {
      Object.entries(activeFilters).forEach(([key, val]) => {
        if (val && val !== 'All') {
          data = data.filter((row) => row[key] === val);
        }
      });
    }
    return data;
  }, [rows, query, searchKeys, activeFilters, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleFilterChange = (key, value) => {
    setActiveFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  return (
    <div className="data-table-wrap">
      {(searchable || filters || toolbarRight) && (
        <div className="table-toolbar">
          {searchable && (
            <div className="search-input">
              <Search size={16} />
              <input
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
          )}
          <div className="table-toolbar-filters">
            {filters?.map((f) => (
              <select
                key={f.key}
                value={activeFilters[f.key] || 'All'}
                onChange={(e) => handleFilterChange(f.key, e.target.value)}
                className="select-filter"
              >
                <option value="All">{f.label}: All</option>
                {f.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ))}
          </div>
          {toolbarRight && <div className="table-toolbar-right">{toolbarRight}</div>}
        </div>
      )}

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} style={{ width: col.width }}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="empty-state">
                    <Inbox size={28} strokeWidth={1.5} />
                    <p>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row[rowKey]}>
                  {columns.map((col) => (
                    <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="table-pagination">
          <span>
            Showing {(page - 1) * pageSize + 1}
            {'\u2013'}
            {Math.min(page * pageSize, filtered.length)} of {filtered.length}
          </span>
          <div className="pagination-controls">
            <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft size={16} />
            </button>
            <span className="pagination-page">{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
