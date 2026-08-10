import { useEffect, useState } from "react";
import { adminFetch } from "./adminApi";

function DiscountCodesTab() {
  const [discounts, setDiscounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ code: "", description: "", discountType: "fixed", discountValue: "", isActive: true, startsAt: "", endsAt: "", maxTotalUses: "", oneUsePerCustomer: false });
  const loadDiscounts = async () => {
    try {
      setIsLoading(true);
      const response = await adminFetch("/api/admin-discounts");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load discount codes.");
      setDiscounts(data.discounts || []);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadDiscounts(); }, []);
  const updateForm = (event) => { const { name, value, type, checked } = event.target; setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value })); };
  const saveDiscount = async (event) => {
    event.preventDefault();
    try {
      const response = await adminFetch("/api/admin-discounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save discount code.");
      setForm({ code: "", description: "", discountType: "fixed", discountValue: "", isActive: true, startsAt: "", endsAt: "", maxTotalUses: "", oneUsePerCustomer: false });
      await loadDiscounts();
      alert("Discount code saved.");
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  return (
    <section className="admin-panel">
      <div className="admin-panel-heading"><h2>Discount Codes</h2></div>
      <form className="discount-admin-form" onSubmit={saveDiscount}>
        <label>Code<input name="code" value={form.code} onChange={updateForm} placeholder="Example: ABELLEJULY5" required /></label>
        <label>Description<input name="description" value={form.description} onChange={updateForm} placeholder="Example: July promo" /></label>
        <div className="admin-form-grid"><label>Discount Type<select name="discountType" value={form.discountType} onChange={updateForm}><option value="fixed">Fixed Amount</option><option value="percent">Percentage</option></select></label><label>Value<input name="discountValue" type="number" min="1" value={form.discountValue} onChange={updateForm} required /></label></div>
        <div className="admin-form-grid"><label>Start Date<input name="startsAt" type="date" value={form.startsAt} onChange={updateForm} /></label><label>End Date<input name="endsAt" type="date" value={form.endsAt} onChange={updateForm} /></label></div>
        <label>Maximum Total Uses<input name="maxTotalUses" type="number" min="1" value={form.maxTotalUses} onChange={updateForm} placeholder="Leave blank for unlimited" /></label>
        <div className="admin-checkbox-row"><label><input type="checkbox" name="isActive" checked={form.isActive} onChange={updateForm} />Active</label><label><input type="checkbox" name="oneUsePerCustomer" checked={form.oneUsePerCustomer} onChange={updateForm} />One use per customer</label></div>
        <button type="submit" className="admin-primary-btn">Save Discount Code</button>
      </form>
      <div className="discount-list"><h3>Saved Discount Codes</h3>{isLoading ? <div className="admin-empty">Loading discount codes...</div> : discounts.length === 0 ? <div className="admin-empty">No discount codes yet.</div> : <div className="discount-table">{discounts.map((discount) => <div className="discount-row" key={discount.id}><div><strong>{discount.code}</strong><span>{discount.description || "No description"}</span></div><div><strong>{discount.discount_type === "fixed" ? `₱${Number(discount.discount_value).toLocaleString()} off` : `${Number(discount.discount_value)}% off`}</strong><span>{discount.is_active ? "Active" : "Inactive"}</span></div></div>)}</div>}</div>
    </section>
  );
}

export default DiscountCodesTab;
