"use client";

import { useCallback, useEffect, useState } from "react";
import { repositoryErrorMessage } from "@/lib/repositories";
import { DataTable, type ColumnDef } from "./DataTable";
import { EmptyState, ErrorState, LoadingState } from "./states";
import type { FormValue, FormValues } from "./form";

// Config-driven list + form CRUD used by every admin section. Pages
// provide typed adapters (toForm / onCreate / onUpdate) so all database
// writes stay fully typed against the live schema.

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  name: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "select"
    | "date"
    | "datetime"
    | "checkbox"
    | "roles";
  options?: FieldOption[];
  required?: boolean;
  help?: string;
}

type Editing<Row> = { mode: "create" } | { mode: "edit"; row: Row };

type RowsState<Row> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: Row[] };

const ROLE_OPTIONS = ["guest", "member", "admin"] as const;

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: FormValue;
  onChange: (value: FormValue) => void;
}) {
  const baseClass =
    "w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900";
  const id = `field-${field.name}`;

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          id={id}
          rows={3}
          className={baseClass}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "number":
      return (
        <input
          id={id}
          type="number"
          className={baseClass}
          value={typeof value === "number" ? value : ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? "" : e.target.valueAsNumber)
          }
        />
      );
    case "select":
      return (
        <select
          id={id}
          className={baseClass}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "date":
      return (
        <input
          id={id}
          type="date"
          className={baseClass}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "datetime":
      return (
        <input
          id={id}
          type="datetime-local"
          className={baseClass}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input
            id={id}
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="text-zinc-600 dark:text-zinc-400">
            {field.help ?? "Enabled"}
          </span>
        </label>
      );
    case "roles": {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="flex gap-3">
          {ROLE_OPTIONS.map((role) => (
            <label key={role} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(role)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...selected, role]
                      : selected.filter((r) => r !== role),
                  )
                }
              />
              <span className="uppercase tracking-wider text-xs text-zinc-600 dark:text-zinc-400">
                {role}
              </span>
            </label>
          ))}
        </div>
      );
    }
    default:
      return (
        <input
          id={id}
          type="text"
          className={baseClass}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export function ResourceManager<Row extends { id: string }>({
  title,
  description,
  columns,
  fields,
  emptyLabel,
  load,
  toForm,
  validate,
  onCreate,
  onUpdate,
  onRemove,
  createDisabledNote,
}: {
  title: string;
  description?: string;
  columns: ColumnDef<Row>[];
  fields: FieldDef[];
  emptyLabel: string;
  load: () => Promise<Row[]>;
  toForm: (row: Row | null) => FormValues;
  validate?: (values: FormValues) => string | null;
  onCreate?: (values: FormValues) => Promise<unknown>;
  onUpdate?: (id: string, values: FormValues) => Promise<unknown>;
  onRemove?: (id: string) => Promise<unknown>;
  createDisabledNote?: string;
}) {
  const [rowsState, setRowsState] = useState<RowsState<Row>>({
    status: "loading",
  });
  const [editing, setEditing] = useState<Editing<Row> | null>(null);
  const [values, setValues] = useState<FormValues>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const reload = useCallback(() => {
    setRowsState({ status: "loading" });
    load()
      .then((rows) => setRowsState({ status: "ready", rows }))
      .catch((error: unknown) =>
        setRowsState({
          status: "error",
          message: repositoryErrorMessage(error),
        }),
      );
  }, [load]);

  useEffect(() => {
    reload();
  }, [reload]);

  const openCreate = () => {
    setEditing({ mode: "create" });
    setValues(toForm(null));
    setFormError(null);
    setConfirmingDelete(false);
  };

  const openEdit = (row: Row) => {
    setEditing({ mode: "edit", row });
    setValues(toForm(row));
    setFormError(null);
    setConfirmingDelete(false);
  };

  const closeForm = () => {
    setEditing(null);
    setFormError(null);
    setConfirmingDelete(false);
  };

  const save = async () => {
    if (!editing) return;
    const validationError = validate?.(values) ?? null;
    if (validationError) {
      setFormError(validationError);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing.mode === "create") {
        if (onCreate) await onCreate(values);
      } else if (onUpdate) {
        await onUpdate(editing.row.id, values);
      }
      closeForm();
      reload();
    } catch (error) {
      setFormError(repositoryErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing || editing.mode !== "edit" || !onRemove) return;
    setSaving(true);
    setFormError(null);
    try {
      await onRemove(editing.row.id);
      closeForm();
      reload();
    } catch (error) {
      setFormError(repositoryErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="mb-10"
      data-testid={`resource-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
          ) : null}
        </div>
        {onCreate ? (
          <button
            type="button"
            onClick={openCreate}
            data-testid="resource-new"
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            + New
          </button>
        ) : createDisabledNote ? (
          <p className="text-xs text-zinc-400">{createDisabledNote}</p>
        ) : null}
      </div>

      {rowsState.status === "loading" ? (
        <LoadingState />
      ) : rowsState.status === "error" ? (
        <ErrorState message={rowsState.message} onRetry={reload} />
      ) : rowsState.rows.length === 0 ? (
        <EmptyState label={emptyLabel} />
      ) : (
        <DataTable
          columns={columns}
          rows={rowsState.rows}
          onRowClick={onUpdate ? openEdit : undefined}
        />
      )}

      {editing ? (
        <div
          className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
          data-testid="resource-form"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-wide">
              {editing.mode === "create" ? `New ${title}` : `Edit ${title}`}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Close form"
              className="rounded p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              ✕
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.name}
                className={field.type === "textarea" ? "md:col-span-2" : ""}
              >
                <label
                  htmlFor={`field-${field.name}`}
                  className="mb-1 block text-[11px] font-semibold tracking-wider text-zinc-500"
                >
                  {field.label}
                  {field.required ? (
                    <span className="text-red-500"> *</span>
                  ) : null}
                </label>
                <FieldInput
                  field={field}
                  value={values[field.name] ?? ""}
                  onChange={(v) =>
                    setValues((prev) => ({ ...prev, [field.name]: v }))
                  }
                />
                {field.help && field.type !== "checkbox" ? (
                  <p className="mt-0.5 text-[10px] text-zinc-400">
                    {field.help}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          {formError ? (
            <p
              className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
              data-testid="form-error"
              role="alert"
            >
              {formError}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              data-testid="resource-save"
              className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            {editing.mode === "edit" && onRemove ? (
              confirmingDelete ? (
                <span className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-red-600">本当に削除しますか？</span>
                  <button
                    type="button"
                    onClick={remove}
                    disabled={saving}
                    data-testid="resource-delete-confirm"
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  data-testid="resource-delete"
                  className="ml-auto rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
                >
                  Delete
                </button>
              )
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
