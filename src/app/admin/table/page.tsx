"use client";

import { getRepositories } from "@/lib/repositories";
import { ResourceManager } from "@/components/admin/ResourceManager";
import {
  fbool,
  fnum,
  fstr,
  urlFieldError,
  type FormValues,
} from "@/components/admin/form";
import type { TableMenuItem, TableStoreMetric } from "@/lib/repositories";

const DEFAULT_STORE = "なら和ポケ日和";

const repos = () => getRepositories();

const loadStoreMetrics = () => repos().tableStoreMetrics.list();
function storeMetricFromForm(values: FormValues) {
  return {
    store_name: fstr(values, "store_name"),
    business_date: fstr(values, "business_date"),
    sales: Math.max(0, fnum(values, "sales")),
    customers: Math.max(0, fnum(values, "customers")),
    average_spend: Math.max(0, fnum(values, "average_spend")),
    store_status: fstr(values, "store_status") || "open",
  };
}
const validateStoreMetric = (values: FormValues): string | null => {
  if (fstr(values, "store_name").trim() === "") return "Store name is required";
  if (fstr(values, "business_date").trim() === "")
    return "Business date is required";
  return null;
};

const loadMenuItems = () => repos().tableMenuItems.list();
function menuItemFromForm(values: FormValues) {
  return {
    store_name: fstr(values, "store_name"),
    name: fstr(values, "name"),
    category: fstr(values, "category"),
    price: Math.max(0, fnum(values, "price")),
    sales_count: Math.max(0, fnum(values, "sales_count")),
    image_url: fstr(values, "image_url").trim() || null,
    is_active: fbool(values, "is_active"),
    display_order: fnum(values, "display_order"),
  };
}
const validateMenuItem = (values: FormValues): string | null => {
  if (fstr(values, "store_name").trim() === "") return "Store name is required";
  if (fstr(values, "name").trim() === "") return "Name is required";
  return urlFieldError(fstr(values, "image_url"), "Image URL");
};

export default function TableAdminPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <ResourceManager<TableStoreMetric>
        title="TABLE Store Metrics"
        description="店舗の日次実績（store_name + business_dateはDB上ユニーク）"
        emptyLabel="No store metrics yet"
        columns={[
          { key: "store", label: "STORE", render: (r) => r.store_name },
          { key: "date", label: "DATE", render: (r) => r.business_date },
          {
            key: "sales",
            label: "SALES",
            render: (r) => `¥${r.sales.toLocaleString()}`,
          },
          { key: "customers", label: "CUSTOMERS", render: (r) => r.customers },
          { key: "status", label: "STATUS", render: (r) => r.store_status },
        ]}
        fields={[
          {
            name: "store_name",
            label: "Store name",
            type: "text",
            required: true,
          },
          {
            name: "business_date",
            label: "Business date",
            type: "date",
            required: true,
          },
          { name: "sales", label: "Sales (円)", type: "number" },
          { name: "customers", label: "Customers", type: "number" },
          { name: "average_spend", label: "Average spend (円)", type: "number" },
          {
            name: "store_status",
            label: "Store status",
            type: "select",
            options: [
              { value: "open", label: "open" },
              { value: "closed", label: "closed" },
            ],
          },
        ]}
        load={loadStoreMetrics}
        toForm={(row: TableStoreMetric | null): FormValues => ({
          store_name: row?.store_name ?? DEFAULT_STORE,
          business_date: row?.business_date ?? "",
          sales: row?.sales ?? 0,
          customers: row?.customers ?? 0,
          average_spend: row?.average_spend ?? 0,
          store_status: row?.store_status ?? "open",
        })}
        validate={validateStoreMetric}
        onCreate={(values) =>
          repos().tableStoreMetrics.create(storeMetricFromForm(values))
        }
        onUpdate={(id, values) =>
          repos().tableStoreMetrics.update(id, storeMetricFromForm(values))
        }
        onRemove={(id) => repos().tableStoreMetrics.remove(id)}
      />

      <ResourceManager<TableMenuItem>
        title="TABLE Menu Items"
        description="メニューの管理（実メニューのみ登録してください）"
        emptyLabel="No menu items yet"
        columns={[
          { key: "name", label: "NAME", render: (r) => r.name },
          { key: "store", label: "STORE", render: (r) => r.store_name },
          { key: "category", label: "CATEGORY", render: (r) => r.category || "—" },
          {
            key: "price",
            label: "PRICE",
            render: (r) => `¥${r.price.toLocaleString()}`,
          },
          {
            key: "active",
            label: "ACTIVE",
            render: (r) => (r.is_active ? "yes" : "no"),
          },
        ]}
        fields={[
          {
            name: "store_name",
            label: "Store name",
            type: "text",
            required: true,
          },
          { name: "name", label: "Name", type: "text", required: true },
          { name: "category", label: "Category", type: "text" },
          { name: "price", label: "Price (円)", type: "number" },
          { name: "sales_count", label: "Sales count", type: "number" },
          { name: "image_url", label: "Image URL", type: "text" },
          { name: "is_active", label: "Active", type: "checkbox" },
          { name: "display_order", label: "Display order", type: "number" },
        ]}
        load={loadMenuItems}
        toForm={(row: TableMenuItem | null): FormValues => ({
          store_name: row?.store_name ?? DEFAULT_STORE,
          name: row?.name ?? "",
          category: row?.category ?? "",
          price: row?.price ?? 0,
          sales_count: row?.sales_count ?? 0,
          image_url: row?.image_url ?? "",
          is_active: row?.is_active ?? true,
          display_order: row?.display_order ?? 100,
        })}
        validate={validateMenuItem}
        onCreate={(values) =>
          repos().tableMenuItems.create(menuItemFromForm(values))
        }
        onUpdate={(id, values) =>
          repos().tableMenuItems.update(id, menuItemFromForm(values))
        }
        onRemove={(id) => repos().tableMenuItems.remove(id)}
      />
    </div>
  );
}
