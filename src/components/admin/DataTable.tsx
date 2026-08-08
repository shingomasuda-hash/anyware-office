"use client";

export interface ColumnDef<Row> {
  key: string;
  label: string;
  render: (row: Row) => React.ReactNode;
}

export function DataTable<Row extends { id: string }>({
  columns,
  rows,
  onRowClick,
}: {
  columns: ColumnDef<Row>[];
  rows: Row[];
  onRowClick?: (row: Row) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            {columns.map((c) => (
              <th
                key={c.key}
                className="whitespace-nowrap px-4 py-2.5 text-[11px] font-semibold tracking-wider text-zinc-500"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={
                onRowClick
                  ? "cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  : undefined
              }
            >
              {columns.map((c) => (
                <td key={c.key} className="whitespace-nowrap px-4 py-2.5">
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
