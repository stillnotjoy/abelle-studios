import { useEffect, useState } from "react";
import { getSavedAdminPin } from "./adminConfig";

const EMPTY_FORM = {
  name: "",
  description: "",
  defaultPrice: "",
  defaultDeposit: "",
  durationMinutes: "60",
  inclusions: "",
  imageUrl: "",
  color: "#4F46E5",
  isActive: true,
  displayOrder: "0",
};

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`The server returned an invalid response: ${text}`);
  }
}

function PackagesTab() {
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingPackageId, setUpdatingPackageId] = useState(null);
  const [editingPackageId, setEditingPackageId] = useState(null);
  const adminPin = getSavedAdminPin();

  const loadPackages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin-packages", {
        headers: { "x-admin-pin": adminPin },
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || "Could not load packages.");
      setPackages(data.packages || []);
    } catch (error) {
      console.error("Package load failed:", error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const updateForm = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const startEditingPackage = (pkg) => {
  setEditingPackageId(pkg.id);

  setForm({
    name: pkg.name || "",
    description: pkg.description || "",
    defaultPrice: String(pkg.default_price ?? ""),
    defaultDeposit: String(pkg.default_deposit ?? ""),
    durationMinutes: String(pkg.duration_minutes ?? 60),
    inclusions: pkg.inclusions || "",
    imageUrl: pkg.image_url || "",
    color: pkg.color || "#4F46E5",
    isActive: Boolean(pkg.is_active),
    displayOrder: String(pkg.display_order ?? 0),
  });

  setShowForm(true);

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

const cancelEditingPackage = () => {
  setEditingPackageId(null);
  setForm(EMPTY_FORM);
  setShowForm(false);
};

const savePackage = async (event) => {
  event.preventDefault();

  if (!form.name.trim()) {
    alert("Please enter a package name.");
    return;
  }

  if (form.defaultPrice === "") {
    alert("Please enter the package price.");
    return;
  }

  const isEditing = Boolean(editingPackageId);

  try {
    setIsSaving(true);

    const response = await fetch("/api/admin-packages", {
      method: isEditing ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-pin": adminPin,
      },
      body: JSON.stringify(
        isEditing
          ? {
              id: editingPackageId,
              ...form,
            }
          : form
      ),
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(
        data.error ||
          (isEditing
            ? "Could not update package."
            : "Could not save package.")
      );
    }

    setEditingPackageId(null);
    setForm(EMPTY_FORM);
    setShowForm(false);

    await loadPackages();

    alert(isEditing ? "Package updated." : "Package saved.");
  } catch (error) {
    console.error(
      isEditing ? "Package update failed:" : "Package save failed:",
      error
    );

    alert(error.message);
  } finally {
    setIsSaving(false);
  }
};
 

  const togglePackageStatus = async (pkg) => {
    const nextStatus = !pkg.is_active;
    const action = nextStatus ? "enable" : "disable";
    if (!window.confirm(`Are you sure you want to ${action} "${pkg.name}"?`)) return;

    try {
      setUpdatingPackageId(pkg.id);
      const response = await fetch("/api/admin-packages", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": adminPin,
        },
        body: JSON.stringify({ id: pkg.id, isActive: nextStatus }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || `Could not ${action} package.`);
      setPackages((current) =>
        current.map((item) =>
          item.id === pkg.id ? { ...item, is_active: nextStatus } : item
        )
      );
    } catch (error) {
      console.error("Package status update failed:", error);
      alert(error.message);
    } finally {
      setUpdatingPackageId(null);
    }
  };

  const deletePackage = async (pkg) => {
  const confirmed = window.confirm(
    `Permanently delete "${pkg.name}"?\n\nThis cannot be undone. Packages with booking history cannot be deleted.`
  );

  if (!confirmed) {
    return;
  }

  try {
    setUpdatingPackageId(pkg.id);

    const response = await fetch("/api/admin-packages", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-admin-pin": adminPin,
      },
      body: JSON.stringify({
        id: pkg.id,
      }),
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(
        data.error || "Could not delete package."
      );
    }

    if (editingPackageId === pkg.id) {
      setEditingPackageId(null);
      setForm(EMPTY_FORM);
      setShowForm(false);
    }

    await loadPackages();

    alert("Package deleted successfully.");
  } catch (error) {
    console.error("Package deletion failed:", error);
    alert(error.message);
  } finally {
    setUpdatingPackageId(null);
  }
};

  return (
    <section className="admin-panel">
      <div className="packages-top-actions">
  <button
    type="button"
    className="admin-btn admin-btn-primary"
    onClick={() => {
      setEditingPackageId(null);
      setForm(EMPTY_FORM);
      setShowForm(true);
    }}
  >
    + Add Package
  </button>
</div>

      {showForm && (
        <form className="package-admin-form" onSubmit={savePackage}>
          <div className="admin-form-grid">
            <label>Package Name<input name="name" value={form.name} onChange={updateForm} placeholder="Example: Graduation Portrait" required /></label>
            <label>Package Price<input name="defaultPrice" type="number" min="0" step="0.01" value={form.defaultPrice} onChange={updateForm} placeholder="499" required /></label>
          </div>
          <div className="admin-form-grid">
            <label>Required Deposit<input name="defaultDeposit" type="number" min="0" step="0.01" value={form.defaultDeposit} onChange={updateForm} placeholder="0" /></label>
            <label>Duration in Minutes<input name="durationMinutes" type="number" min="1" value={form.durationMinutes} onChange={updateForm} /></label>
          </div>
          <label>Short Description<textarea name="description" value={form.description} onChange={updateForm} placeholder="A short description of this package." /></label>
          <label>Package Inclusions<textarea name="inclusions" value={form.inclusions} onChange={updateForm} placeholder="Example: 1-hour session, 10 edited photos, one backdrop..." /></label>
          <div className="admin-form-grid">
            <label>Image URL<input name="imageUrl" type="text" value={form.imageUrl} onChange={updateForm} placeholder="https://..." /></label>
            <label>Card Colour<input name="color" type="color" value={form.color} onChange={updateForm} /></label>
          </div>
          <div className="admin-form-grid">
            <label>Display Order<input name="displayOrder" type="number" min="0" value={form.displayOrder} onChange={updateForm} /></label>
            <label className="admin-checkbox-field"><input name="isActive" type="checkbox" checked={form.isActive} onChange={updateForm} />Active and available for bookings</label>
          </div>
          <button
  type="submit"
  className="admin-btn admin-btn-primary"
  disabled={isSaving}
>
  {isSaving
    ? editingPackageId
      ? "Updating..."
      : "Saving..."
    : editingPackageId
      ? "Update Package"
      : "Save Package"}
</button>

<button
  type="button"
  className="admin-btn admin-btn-secondary"
  onClick={cancelEditingPackage}
  disabled={isSaving}
>
  Cancel
</button>
        </form>
      )}

      {isLoading ? (
        <div className="admin-empty">Loading packages...</div>
      ) : packages.length === 0 ? (
        <div className="admin-empty">No packages found. Add your first package above.</div>
      ) : (
        <div className="package-admin-grid">
          {packages.map((pkg) => (
            <article className="package-admin-card" key={pkg.id} style={{ borderTopColor: pkg.color || "#4F46E5" }}>
              {pkg.image_url && <img className="package-admin-image" src={pkg.image_url} alt={pkg.name} />}
              <div className="package-admin-content">
                <div className="package-admin-title-row">
                  <div>
                    <h3>{pkg.name}</h3>
                    <span className={pkg.is_active ? "package-status active" : "package-status inactive"}>{pkg.is_active ? "Active" : "Inactive"}</span>
                  </div>
                  <strong>₱{Number(pkg.default_price || 0).toLocaleString()}</strong>
                </div>
                {pkg.description && <p>{pkg.description}</p>}
                <div className="package-admin-details">
                  <span>Duration: {Number(pkg.duration_minutes || 60)} minutes</span>
                  <span>Deposit: ₱{Number(pkg.default_deposit || 0).toLocaleString()}</span>
                </div>
                {pkg.inclusions && <div className="package-admin-inclusions"><strong>Inclusions</strong><p>{pkg.inclusions}</p></div>}
               
               <div className="package-admin-actions">
  <button
    type="button"
    className="admin-btn admin-btn-secondary"
    onClick={() => startEditingPackage(pkg)}
    disabled={updatingPackageId === pkg.id}
  >
    Edit
  </button>

  <button
    type="button"
    className={
      pkg.is_active
        ? "admin-btn admin-btn-warning"
        : "admin-btn admin-btn-success"
    }
    disabled={updatingPackageId === pkg.id}
    onClick={() => togglePackageStatus(pkg)}
  >
    {updatingPackageId === pkg.id
      ? "Updating..."
      : pkg.is_active
        ? "Disable"
        : "Enable"}
  </button>

  <button
    type="button"
    className="admin-btn admin-btn-danger"
    onClick={() => deletePackage(pkg)}
    disabled={updatingPackageId === pkg.id}
  >
    {updatingPackageId === pkg.id
      ? "Please wait..."
      : "Delete"}
  </button>
</div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default PackagesTab;
