import { useCallback, useEffect, useMemo, useState } from 'react';
import '../styles/AdminDocumentTypes.css';
import { API_BASE, authHeaders, formatPhp } from '../api';
import AdminShell from '../components/AdminShell';

const parseNonNegativeNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
};

const AdminDocumentTypes = () => {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({
    documentType: '',
    basePrice: '',
    perSucceedingPageFee: '',
  });
  const [submitMessage, setSubmitMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toggleId, setToggleId] = useState('');

  const loadPrices = useCallback(async () => {
    setLoadError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/prices`, {
        headers: authHeaders(false),
      });
      const data = await res.json();

      if (!res.ok) {
        setLoadError(data.message || 'Failed to load document types.');
        return;
      }

      setPrices(data.prices || []);
    } catch (err) {
      console.error('Failed to load prices', err);
      setLoadError('Cannot connect to server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  const deliveryFee = useMemo(() => {
    const row = prices.find((price) => price.deliveryFee != null);
    return row ? Number(row.deliveryFee) : 150;
  }, [prices]);

  const deliveryFeeLabel = useMemo(() => {
    if (!Number.isFinite(deliveryFee)) return 'N/A';
    return formatPhp(deliveryFee);
  }, [deliveryFee]);

  const sortedPrices = useMemo(
    () => prices.slice().sort((a, b) => a.documentType.localeCompare(b.documentType)),
    [prices]
  );

  const updateForm = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      documentType: '',
      basePrice: '',
      perSucceedingPageFee: '',
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitMessage('');
    setSubmitError('');

    const documentType = String(form.documentType || '').trim();
    if (!documentType) {
      setSubmitError('Document type is required.');
      return;
    }

    const basePrice = parseNonNegativeNumber(form.basePrice);
    if (basePrice === null) {
      setSubmitError('Base price must be a non-negative number.');
      return;
    }

    const perSucceedingPageFee = parseNonNegativeNumber(form.perSucceedingPageFee);
    if (perSucceedingPageFee === null) {
      setSubmitError('Succeeding page fee must be a non-negative number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/prices`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({
          documentType,
          basePrice,
          perSucceedingPageFee,
          deliveryFee: Number.isFinite(deliveryFee) ? deliveryFee : 0,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.message || 'Failed to add document type.');
        return;
      }

      setPrices((prev) => {
        const next = [...prev, data.price];
        return next.sort((a, b) => a.documentType.localeCompare(b.documentType));
      });
      setSubmitMessage('Document type added.');
      resetForm();
    } catch (err) {
      console.error('Failed to add document type', err);
      setSubmitError('Cannot connect to server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (price) => {
    setSubmitMessage('');
    setSubmitError('');
    setToggleId(price._id);

    try {
      const res = await fetch(`${API_BASE}/api/admin/prices/${price._id}`, {
        method: 'PATCH',
        headers: authHeaders(true),
        body: JSON.stringify({ active: !price.active }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.message || 'Failed to update status.');
        return;
      }

      setPrices((prev) =>
        prev.map((row) => (row._id === price._id ? data.price : row))
      );
      setSubmitMessage(data.price.active ? 'Document type activated.' : 'Document type deactivated.');
    } catch (err) {
      console.error('Failed to update status', err);
      setSubmitError('Cannot connect to server.');
    } finally {
      setToggleId('');
    }
  };

  return (
    <AdminShell>
      <main className="admin-main">
        <section className="types-header">
          <h1>Add or Remove Document Types</h1>
          <p>Maintain the document list and toggle availability for student requests.</p>
        </section>

        {loadError ? <p className="types-status error">{loadError}</p> : null}
        {submitMessage ? <p className="types-status">{submitMessage}</p> : null}
        {submitError ? <p className="types-status error">{submitError}</p> : null}

        <div className="types-grid">
          <section className="types-card">
            <div className="types-card-header">
              <div>
                <h2>Add Document Type</h2>
                <p>Delivery fee uses the global value: {deliveryFeeLabel}</p>
              </div>
            </div>
            <form className="types-form" onSubmit={handleSubmit}>
              <label className="types-field">
                Document Type
                <input
                  className="types-input"
                  type="text"
                  value={form.documentType}
                  onChange={updateForm('documentType')}
                  placeholder="e.g., Transcript of Records"
                />
              </label>
              <label className="types-field">
                Base Price (PHP)
                <input
                  className="types-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.basePrice}
                  onChange={updateForm('basePrice')}
                />
              </label>
              <label className="types-field">
                Succeeding Page Fee (PHP)
                <input
                  className="types-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.perSucceedingPageFee}
                  onChange={updateForm('perSucceedingPageFee')}
                />
              </label>
              <div className="types-actions">
                <button type="submit" className="types-btn primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Document'}
                </button>
                <button type="button" className="types-btn ghost" onClick={resetForm}>
                  Clear
                </button>
              </div>
            </form>
          </section>

          <section className="types-card">
            <div className="types-card-header">
              <div>
                <h2>Existing Document Types</h2>
                <p>Toggle availability for the student request form.</p>
              </div>
              <button
                type="button"
                className="types-btn ghost"
                onClick={loadPrices}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            {loading ? (
              <p className="types-empty">Loading document types...</p>
            ) : sortedPrices.length === 0 ? (
              <p className="types-empty">No document types found.</p>
            ) : (
              <div className="types-table-scroll">
                <table className="types-table">
                  <thead>
                    <tr>
                      <th>Document Type</th>
                      <th>Base Price</th>
                      <th>Page Fee</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPrices.map((price) => {
                      const isInactive = price.active === false;
                      const isToggling = toggleId === price._id;
                      return (
                        <tr key={price._id}>
                          <td className="types-doc">{price.documentType}</td>
                          <td>{formatPhp(price.basePrice)}</td>
                          <td>{formatPhp(price.perSucceedingPageFee || 0)}</td>
                          <td>
                            <span className={`types-pill ${isInactive ? 'inactive' : 'active'}`}>
                              {isInactive ? 'Inactive' : 'Active'}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className={`types-btn ${isInactive ? 'primary' : 'warning'}`}
                              onClick={() => toggleActive(price)}
                              disabled={isToggling}
                            >
                              {isToggling
                                ? 'Updating...'
                                : isInactive
                                  ? 'Activate'
                                  : 'Deactivate'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </AdminShell>
  );
};

export default AdminDocumentTypes;
