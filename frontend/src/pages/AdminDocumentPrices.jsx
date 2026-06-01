import { useCallback, useEffect, useMemo, useState } from 'react';
import '../styles/AdminDocumentPrices.css';
import { API_BASE, authHeaders, formatPhp } from '../api';
import AdminShell from '../components/AdminShell';

const toTextValue = (value) => (value === null || value === undefined ? '' : String(value));

const parseNonNegativeNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
};

const AdminDocumentPrices = () => {
  const [prices, setPrices] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [deliveryFee, setDeliveryFee] = useState('');
  const [deliveryFeeInitial, setDeliveryFeeInitial] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusIsError, setStatusIsError] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [savingDelivery, setSavingDelivery] = useState(false);

  const activePrices = useMemo(
    () => prices.filter((price) => price.active !== false),
    [prices]
  );

  const deliveryFeePreview = useMemo(() => {
    if (deliveryFee === '') return 'N/A';
    const n = Number(deliveryFee);
    if (!Number.isFinite(n)) return 'N/A';
    return formatPhp(n);
  }, [deliveryFee]);

  const loadPrices = useCallback(async () => {
    setLoadError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/prices`, {
        headers: authHeaders(false),
      });
      const data = await res.json();

      if (!res.ok) {
        setLoadError(data.message || 'Failed to load document prices.');
        return;
      }

      const rows = data.prices || [];
      setPrices(rows);

      const nextDrafts = {};
      rows.forEach((price) => {
        nextDrafts[price._id] = {
          basePrice: toTextValue(price.basePrice),
          perSucceedingPageFee: toTextValue(price.perSucceedingPageFee),
        };
      });
      setDrafts(nextDrafts);

      const nextFee = rows.length ? toTextValue(rows[0].deliveryFee) : '150';
      setDeliveryFee(nextFee);
      setDeliveryFeeInitial(nextFee);
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

  const handleDraftChange = (id, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const hasRowChanges = (price) => {
    const draft = drafts[price._id] || {};
    const baseDraft = draft.basePrice ?? '';
    const perDraft = draft.perSucceedingPageFee ?? '';
    return (
      String(baseDraft) !== toTextValue(price.basePrice) ||
      String(perDraft) !== toTextValue(price.perSucceedingPageFee)
    );
  };

  const resetRow = (price) => {
    setDrafts((prev) => ({
      ...prev,
      [price._id]: {
        basePrice: toTextValue(price.basePrice),
        perSucceedingPageFee: toTextValue(price.perSucceedingPageFee),
      },
    }));
  };

  const saveRow = async (price) => {
    setStatusMessage('');
    setStatusIsError(false);

    const draft = drafts[price._id] || {};
    const basePrice = parseNonNegativeNumber(draft.basePrice);
    if (basePrice === null) {
      setStatusIsError(true);
      setStatusMessage('Base price must be a non-negative number.');
      return;
    }

    const perSucceedingPageFee = parseNonNegativeNumber(draft.perSucceedingPageFee);
    if (perSucceedingPageFee === null) {
      setStatusIsError(true);
      setStatusMessage('Succeeding page fee must be a non-negative number.');
      return;
    }

    setSavingId(price._id);
    try {
      const res = await fetch(`${API_BASE}/api/admin/prices/${price._id}`, {
        method: 'PATCH',
        headers: authHeaders(true),
        body: JSON.stringify({
          basePrice,
          perSucceedingPageFee,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatusIsError(true);
        setStatusMessage(data.message || 'Failed to update price.');
        return;
      }

      setPrices((prev) =>
        prev.map((row) => (row._id === price._id ? data.price : row))
      );
      setDrafts((prev) => ({
        ...prev,
        [price._id]: {
          basePrice: toTextValue(data.price.basePrice),
          perSucceedingPageFee: toTextValue(data.price.perSucceedingPageFee),
        },
      }));
      setStatusIsError(false);
      setStatusMessage('Price updated.');
    } catch (err) {
      console.error('Failed to update price', err);
      setStatusIsError(true);
      setStatusMessage('Cannot connect to server.');
    } finally {
      setSavingId('');
    }
  };

  const deliveryFeeDirty = String(deliveryFee) !== String(deliveryFeeInitial);

  const saveDeliveryFee = async () => {
    setStatusMessage('');
    setStatusIsError(false);

    const feeValue = parseNonNegativeNumber(deliveryFee);
    if (feeValue === null) {
      setStatusIsError(true);
      setStatusMessage('Delivery fee must be a non-negative number.');
      return;
    }

    setSavingDelivery(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/prices/delivery-fee`, {
        method: 'PATCH',
        headers: authHeaders(true),
        body: JSON.stringify({ deliveryFee: feeValue }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatusIsError(true);
        setStatusMessage(data.message || 'Failed to update delivery fee.');
        return;
      }

      setPrices((prev) =>
        prev.map((row) => ({
          ...row,
          deliveryFee: feeValue,
        }))
      );
      const nextValue = String(data.deliveryFee ?? feeValue);
      setDeliveryFee(nextValue);
      setDeliveryFeeInitial(nextValue);
      setStatusIsError(false);
      setStatusMessage('Delivery fee updated.');
    } catch (err) {
      console.error('Failed to update delivery fee', err);
      setStatusIsError(true);
      setStatusMessage('Cannot connect to server.');
    } finally {
      setSavingDelivery(false);
    }
  };

  return (
    <AdminShell>
      <main className="admin-main">
        <section className="prices-header">
          <h1>Manage Document Prices</h1>
          <p>Update base fees, succeeding page fees, and the global delivery fee.</p>
        </section>

        {loadError ? <p className="prices-status error">{loadError}</p> : null}
        {statusMessage ? (
          <p className={`prices-status ${statusIsError ? 'error' : ''}`}>
            {statusMessage}
          </p>
        ) : null}

        <div className="prices-top-row">
          <div className="prices-card">
            <div className="prices-card-header">
              <div>
                <h2>Global Delivery Fee</h2>
                <p>Applied to all document requests.</p>
              </div>
              <span className="fee-preview">{deliveryFeePreview}</span>
            </div>
            <div className="delivery-form">
              <label className="price-field">
                Delivery fee (PHP)
                <input
                  className="price-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={deliveryFee}
                  onChange={(event) => setDeliveryFee(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="price-action-btn primary"
                onClick={saveDeliveryFee}
                disabled={!deliveryFeeDirty || savingDelivery}
              >
                {savingDelivery ? 'Saving...' : 'Update Fee'}
              </button>
            </div>
          </div>
        </div>

        <section className="prices-table-card">
          <div className="prices-table-header">
            <div>
              <h2>Active Document Types</h2>
              <p>Adjust base price and succeeding page fee per document.</p>
            </div>
            <button
              type="button"
              className="price-action-btn ghost"
              onClick={loadPrices}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {loading ? (
            <p className="prices-empty">Loading prices...</p>
          ) : activePrices.length === 0 ? (
            <p className="prices-empty">No active document types yet.</p>
          ) : (
            <div className="prices-table-scroll">
              <table className="prices-table">
                <thead>
                  <tr>
                    <th>Document Type</th>
                    <th>Base Price (PHP)</th>
                    <th>Succeeding Page Fee (PHP)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activePrices.map((price) => {
                    const draft = drafts[price._id] || {
                      basePrice: toTextValue(price.basePrice),
                      perSucceedingPageFee: toTextValue(price.perSucceedingPageFee),
                    };
                    const isDirty = hasRowChanges(price);
                    const isSaving = savingId === price._id;
                    return (
                      <tr key={price._id}>
                        <td className="price-doc">{price.documentType}</td>
                        <td>
                          <input
                            className="price-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft.basePrice}
                            onChange={(event) =>
                              handleDraftChange(price._id, 'basePrice', event.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            className="price-input"
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft.perSucceedingPageFee}
                            onChange={(event) =>
                              handleDraftChange(
                                price._id,
                                'perSucceedingPageFee',
                                event.target.value
                              )
                            }
                          />
                        </td>
                        <td>
                          <div className="price-actions">
                            <button
                              type="button"
                              className="price-action-btn primary"
                              onClick={() => saveRow(price)}
                              disabled={!isDirty || isSaving}
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              className="price-action-btn ghost"
                              onClick={() => resetRow(price)}
                              disabled={!isDirty || isSaving}
                            >
                              Reset
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </AdminShell>
  );
};

export default AdminDocumentPrices;
