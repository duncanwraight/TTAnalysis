import React, { useState, useEffect } from 'react';
import { ShotCategory, Shot } from '../types/database.types';
import { useApi } from '../lib/useApi';
import Button from '../components/ui/Button';
import Layout from '../components/Layout';

interface EditingCategory {
  id?: string;
  name: string;
  display_order: number;
}

interface EditingShot {
  id?: string;
  category_id: string;
  name: string;
  display_name: string;
  description: string;
  display_order: number;
}

const AdminShots: React.FC = () => {
  const api = useApi();
  const [categories, setCategories] = useState<ShotCategory[]>([]);
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Category editing state
  const [editingCategory, setEditingCategory] = useState<EditingCategory | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  // Shot editing state
  const [editingShot, setEditingShot] = useState<EditingShot | null>(null);
  const [showShotForm, setShowShotForm] = useState(false);

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesData, shotsData] = await Promise.all([
        api.shot.getCategories(),
        api.shot.getShots()
      ]);
      setCategories(categoriesData || []);
      setShots(shotsData || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Category handlers
  const handleSaveCategory = async () => {
    if (!editingCategory) return;

    try {
      if (editingCategory.id) {
        await api.shot.updateCategory(editingCategory.id, {
          name: editingCategory.name,
          display_order: editingCategory.display_order
        });
      } else {
        await api.shot.createCategory({
          name: editingCategory.name,
          display_order: editingCategory.display_order
        });
      }
      
      await loadData();
      setEditingCategory(null);
      setShowCategoryForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category and every shot in it?')) return;

    try {
      await api.shot.deleteCategory(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const startEditCategory = (category?: ShotCategory) => {
    setEditingCategory(category ? {
      id: category.id,
      name: category.name,
      display_order: category.display_order
    } : {
      name: '',
      display_order: Math.max(...categories.map(c => c.display_order), 0) + 1
    });
    setShowCategoryForm(true);
  };

  // Shot handlers
  const handleSaveShot = async () => {
    if (!editingShot) return;

    try {
      if (editingShot.id) {
        await api.shot.updateShot(editingShot.id, {
          category_id: editingShot.category_id,
          name: editingShot.name,
          display_name: editingShot.display_name,
          description: editingShot.description,
          display_order: editingShot.display_order
        });
      } else {
        await api.shot.createShot({
          category_id: editingShot.category_id,
          name: editingShot.name,
          display_name: editingShot.display_name,
          description: editingShot.description,
          display_order: editingShot.display_order
        });
      }
      
      await loadData();
      setEditingShot(null);
      setShowShotForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save shot');
    }
  };

  const handleDeleteShot = async (id: string) => {
    if (!confirm('Delete this shot?')) return;

    try {
      await api.shot.deleteShot(id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete shot');
    }
  };

  const startEditShot = (shot?: Shot, categoryId?: string) => {
    const targetCategoryId = categoryId || shot?.category_id || categories[0]?.id || '';
    const categoryShots = shots.filter(s => s.category_id === targetCategoryId);
    
    setEditingShot(shot ? {
      id: shot.id,
      category_id: shot.category_id,
      name: shot.name,
      display_name: shot.display_name,
      description: shot.description || '',
      display_order: shot.display_order
    } : {
      category_id: targetCategoryId,
      name: '',
      display_name: '',
      description: '',
      display_order: Math.max(...categoryShots.map(s => s.display_order), 0) + 1
    });
    setShowShotForm(true);
  };

  const getShotsByCategory = (categoryId: string) => {
    return shots.filter(shot => shot.category_id === categoryId)
      .sort((a, b) => a.display_order - b.display_order);
  };

  const categoryLabel = (name: string) => name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');

  return (
    <Layout>
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Shots</h1>
            <p>The shot list every user picks from in the tracker. Changes apply straight away.</p>
          </div>
          <div className="page-head-actions">
            <Button onClick={() => startEditCategory()}>Add category</Button>
          </div>
        </div>

        {error && <div className="notice error" role="alert">{error}</div>}

        {loading ? (
          <div className="state" role="status"><p>Loading shots...</p></div>
        ) : (
          categories.map(category => (
            <section key={category.id} className="card table-card admin-category" aria-labelledby={`cat-${category.id}`}>
              <div className="admin-category-head">
                <h2 id={`cat-${category.id}`}>
                  {categoryLabel(category.name)} <span className="faint">· order {category.display_order}</span>
                </h2>
                <div className="page-head-actions">
                  <Button variant="secondary" className="small" onClick={() => startEditShot(undefined, category.id)}>Add shot</Button>
                  <Button variant="secondary" className="small" onClick={() => startEditCategory(category)}>Edit</Button>
                  <Button variant="danger" className="small" onClick={() => handleDeleteCategory(category.id)}>Delete</Button>
                </div>
              </div>
              <table className="data-table" style={{ minWidth: 560 }}>
                <thead>
                  <tr>
                    <th scope="col">Shot</th>
                    <th scope="col">Internal name</th>
                    <th scope="col">Description</th>
                    <th scope="col" className="actions"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {getShotsByCategory(category.id).map(shot => (
                    <tr key={shot.id}>
                      <th scope="row">{shot.display_name}</th>
                      <td className="muted"><code>{shot.name}</code></td>
                      <td className="muted">{shot.description}</td>
                      <td className="actions">
                        <Button variant="secondary" className="small" onClick={() => startEditShot(shot)}>Edit</Button>
                        <Button variant="danger" className="small" onClick={() => handleDeleteShot(shot.id)}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {getShotsByCategory(category.id).length === 0 && <p className="faint admin-empty">No shots in this category yet.</p>}
            </section>
          ))
        )}
      </div>

      {showCategoryForm && editingCategory && (
        <div className="dialog-backdrop">
          <form
            className="card dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-dialog-title"
            onSubmit={(e) => { e.preventDefault(); handleSaveCategory(); }}
          >
            <h2 id="category-dialog-title">{editingCategory.id ? 'Edit category' : 'Add category'}</h2>
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={editingCategory.name}
                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                required
                autoFocus
              />
            </label>
            <label className="field">
              <span>Display order</span>
              <input
                type="number"
                value={editingCategory.display_order}
                onChange={(e) => setEditingCategory({ ...editingCategory, display_order: parseInt(e.target.value) || 0 })}
              />
            </label>
            <div className="form-actions end">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingCategory(null);
                  setShowCategoryForm(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </div>
      )}

      {showShotForm && editingShot && (
        <div className="dialog-backdrop">
          <form
            className="card dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shot-dialog-title"
            onSubmit={(e) => { e.preventDefault(); handleSaveShot(); }}
          >
            <h2 id="shot-dialog-title">{editingShot.id ? 'Edit shot' : 'Add shot'}</h2>
            <label className="field">
              <span>Category</span>
              <select
                value={editingShot.category_id}
                onChange={(e) => setEditingShot({ ...editingShot, category_id: e.target.value })}
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{categoryLabel(category.name)}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Display name</span>
              <input
                type="text"
                value={editingShot.display_name}
                onChange={(e) => setEditingShot({ ...editingShot, display_name: e.target.value })}
                required
                autoFocus
              />
            </label>
            <label className="field">
              <span>Internal name</span>
              <input
                type="text"
                value={editingShot.name}
                onChange={(e) => setEditingShot({ ...editingShot, name: e.target.value })}
                required
              />
              <span className="field-hint">Lower case with underscores. serve, service_fault and no_shot have special handling.</span>
            </label>
            <label className="field">
              <span>Description</span>
              <textarea
                value={editingShot.description}
                onChange={(e) => setEditingShot({ ...editingShot, description: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Display order</span>
              <input
                type="number"
                value={editingShot.display_order}
                onChange={(e) => setEditingShot({ ...editingShot, display_order: parseInt(e.target.value) || 0 })}
              />
            </label>
            <div className="form-actions end">
              <Button
                variant="secondary"
                onClick={() => {
                  setEditingShot(null);
                  setShowShotForm(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
};

export default AdminShots;
