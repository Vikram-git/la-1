import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Alert, Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { ProductForm } from "../product-form";
import { NewVariantForm, VariantRow } from "../variant-forms";
import { ArchiveProductButton } from "./archive-button";
import { ProductPhoto } from "./photo-card";
import {
  createVariant,
  setProductArchived,
  setVariantArchived,
  updateProduct,
  updateVariant,
} from "../actions";

export const metadata: Metadata = { title: "Edit product" };

export default async function ProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  const staff = await requireRole(["admin", "counter"]);
  const isAdmin = staff.role === "admin";
  const { id } = await params;
  const { created } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data: product }, { data: categories }, { data: variants }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name, is_active").order("sort_order").order("name"),
    supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", id)
      .order("archived_at", { nullsFirst: true })
      .order("sort_order")
      .order("created_at"),
  ]);
  if (!product) notFound();


  return (
    <>
      <PageHeader
        title={product.name}
        description={
          <>
            <Link href="/admin/products" className="text-brand hover:underline">Products</Link> / {product.name}
            {product.archived_at && <Badge className="ml-2">Archived</Badge>}
          </>
        }
        actions={isAdmin && <ArchiveProductButton archived={Boolean(product.archived_at)} action={setProductArchived.bind(null, product.id)} />}
      />

      <div className="flex flex-col gap-6">
        {created === "1" && (
          <Alert tone="ok" title="Product created">
            Now add at least one variant with a price, and a photo.
          </Alert>
        )}

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Photo</h2>
          <ProductPhoto productId={product.id} name={product.name} url={product.image_url} canEdit={isAdmin && !product.archived_at} />
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Variants and prices</h2>
          {variants && variants.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {variants.map((v) => (
                <VariantRow
                  key={v.id}
                  variant={v}
                  canEdit={isAdmin && !product.archived_at}
                  saveAction={updateVariant.bind(null, v.id)}
                  archiveAction={setVariantArchived.bind(null, v.id)}
                />
              ))}
            </ul>
          ) : (
            <EmptyState title="No variants yet">
              Add sizes or options such as “500 g”, “1 kg”, or “Regular”. Each variant has its own price and lead time.
            </EmptyState>
          )}

          {isAdmin && !product.archived_at && (
            <div className="mt-6 border-t border-line pt-6">
              <h3 className="mb-4 font-medium">Add a variant</h3>
              <NewVariantForm action={createVariant.bind(null, product.id)} />
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Product details</h2>
          <ProductForm
            action={updateProduct.bind(null, product.id)}
            categories={categories ?? []}
            product={product}
            readOnly={!isAdmin || Boolean(product.archived_at)}
            submitLabel="Save product"
          />
        </Card>
      </div>
    </>
  );
}
