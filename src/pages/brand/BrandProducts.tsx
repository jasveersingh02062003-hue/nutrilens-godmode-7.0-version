import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { inr } from "@/lib/admin-metrics";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const CATEGORIES = ["protein_drink", "protein_bar", "ready_to_eat", "frozen", "spread", "supplement", "beverage", "snack"] as const;

interface Brand { id: string; brand_name: string; }
interface Product {
  id: string;
  brand: string;
  product_name: string;
  category: string;
  mrp: number;
  selling_price: number | null;
  protein: number | null;
  calories: number | null;
  is_verified: boolean;
}

export default function BrandProducts() {
  const { user } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    brand: "",
    product_name: "",
    category: "protein_drink" as (typeof CATEGORIES)[number],
    mrp: 0,
    selling_price: 0,
    protein: 0,
    calories: 0,
    carbs: 0,
    fat: 0,
    serving_size: "100g",
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: members } = await supabase.from("brand_members").select("brand_id").eq("user_id", user.id);
    const ids = (members ?? []).map((m: any) => m.brand_id);
    if (!ids.length) {
      setLoading(false);
      return;
    }
    const { data: bs } = await supabase.from("brand_accounts").select("id, brand_name").in("id", ids);
    const names = (bs ?? []).map((b: any) => b.brand_name);
    setBrands((bs ?? []) as Brand[]);
    if (bs?.[0]) setForm((f) => ({ ...f, brand: bs[0].brand_name }));
    if (names.length) {
      const { data: ps } = await supabase
        .from("packed_products")
        .select("id, brand, product_name, category, mrp, selling_price, protein, calories, is_verified")
        .in("brand", names)
        .order("created_at", { ascending: false });
      setProducts((ps ?? []) as Product[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const submit = async () => {
    if (!form.brand || !form.product_name || !form.mrp) {
      toast.error("Brand, name, and MRP are required");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("packed_products").insert({
      brand: form.brand,
      product_name: form.product_name,
      category: form.category,
      mrp: form.mrp,
      selling_price: form.selling_price || form.mrp,
      protein: form.protein,
      calories: form.calories,
      carbs: form.carbs,
      fat: form.fat,
      serving_size: form.serving_size,
      is_verified: false,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Submitted for admin review");
    setOpen(false);
    load();
  };

  if (loading)
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Products</h1>
          <p className="text-sm text-muted-foreground">Submit packaged products for the marketplace</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Submit product
        </Button>
      </div>

      <Card className="p-4">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="text-left py-2">Name</th>
              <th className="text-left">Brand</th>
              <th className="text-left">Category</th>
              <th className="text-right">MRP</th>
              <th className="text-right">Protein</th>
              <th className="text-right">Cal</th>
              <th className="text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="py-2 font-medium">{p.product_name}</td>
                <td className="text-xs text-muted-foreground">{p.brand}</td>
                <td className="text-xs text-muted-foreground">{p.category}</td>
                <td className="text-right tabular-nums">{inr(Number(p.mrp))}</td>
                <td className="text-right tabular-nums">{p.protein ?? 0}g</td>
                <td className="text-right tabular-nums">{p.calories ?? 0}</td>
                <td>
                  <Badge variant={p.is_verified ? "default" : "secondary"} className="text-[10px]">
                    {p.is_verified ? "verified" : "pending"}
                  </Badge>
                </td>
              </tr>
            ))}
            {!products.length && (
              <tr><td colSpan={7} className="py-8 text-center text-muted-foreground text-xs">No products submitted yet</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Submit product</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 mt-4">
            <div>
              <Label>Brand</Label>
              <Select value={form.brand} onValueChange={(v) => setForm({ ...form, brand: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {brands.map((b) => <SelectItem key={b.id} value={b.brand_name}>{b.brand_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Product name</Label>
              <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>MRP (INR)</Label>
                <Input type="number" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Selling price</Label>
                <Input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Serving size</Label>
              <Input value={form.serving_size} onChange={(e) => setForm({ ...form, serving_size: e.target.value })} placeholder="100g, 30g scoop, etc." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Protein (g)</Label>
                <Input type="number" value={form.protein} onChange={(e) => setForm({ ...form, protein: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Calories</Label>
                <Input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Carbs (g)</Label>
                <Input type="number" value={form.carbs} onChange={(e) => setForm({ ...form, carbs: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Fat (g)</Label>
                <Input type="number" value={form.fat} onChange={(e) => setForm({ ...form, fat: Number(e.target.value) })} />
              </div>
            </div>
            <Button className="w-full" onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Submit for review
            </Button>
            <p className="text-xs text-muted-foreground">Admins will verify and publish within 48 hours.</p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
