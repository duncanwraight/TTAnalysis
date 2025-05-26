import React, { useState, useEffect } from 'react';
import { ShotCategory, Shot } from '../types/database.types';
import { useApi } from '../lib/useApi';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import '../styles/components/AdminShots.css';

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
    if (!confirm('Are you sure? This will delete all shots in this category.')) return;

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
    if (!confirm('Are you sure you want to delete this shot?')) return;

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

  if (loading) return <div className="admin-shots-loading">Loading...</div>;

  return (
    <div className="admin-shots">
      <div className="admin-shots-header">
        <h1>Shot Management</h1>
        <Button onClick={() => startEditCategory()}>Add Category</Button>
      </div>

      {error && <div className="admin-shots-error">Error: {error}</div>}

      <div className="admin-shots-content">
        {categories.map(category => (
          <Card key={category.id} className="category-card">
            <div className="category-header">
              <h2>{category.name}</h2>
              <div className="category-actions">
                <Button 
                  variant="secondary" 
                  className="btn-small"
                  onClick={() => startEditShot(undefined, category.id)}
                >
                  Add Shot
                </Button>
                <Button 
                  variant="secondary" 
                  className="btn-small"
                  onClick={() => startEditCategory(category)}
                >
                  Edit
                </Button>
                <Button 
                  variant="secondary" 
                  className="btn-small btn-danger"
                  onClick={() => handleDeleteCategory(category.id)}
                >
                  Delete
                </Button>
              </div>
            </div>

            <div className="shots-list">
              {getShotsByCategory(category.id).map(shot => (
                <div key={shot.id} className="shot-item">
                  <div className="shot-info">
                    <div className="shot-name">{shot.display_name}</div>
                    <div className="shot-description">{shot.description}</div>
                  </div>
                  <div className="shot-actions">
                    <Button 
                      variant="secondary" 
                      className="btn-small"
                      onClick={() => startEditShot(shot)}
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="btn-small btn-danger"
                      onClick={() => handleDeleteShot(shot.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Category Form Modal */}
      {showCategoryForm && editingCategory && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editingCategory.id ? 'Edit Category' : 'Add Category'}</h3>
            <div className="form-group">
              <label>Name:</label>
              <input
                type="text"
                value={editingCategory.name}
                onChange={(e) => setEditingCategory({
                  ...editingCategory,
                  name: e.target.value
                })}
              />
            </div>
            <div className="form-group">
              <label>Display Order:</label>
              <input
                type="number"
                value={editingCategory.display_order}
                onChange={(e) => setEditingCategory({
                  ...editingCategory,
                  display_order: parseInt(e.target.value) || 0
                })}
              />
            </div>
            <div className="modal-actions">
              <Button onClick={handleSaveCategory}>Save</Button>
              <Button 
                variant="secondary"
                onClick={() => {
                  setEditingCategory(null);
                  setShowCategoryForm(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Shot Form Modal */}
      {showShotForm && editingShot && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>{editingShot.id ? 'Edit Shot' : 'Add Shot'}</h3>
            <div className="form-group">
              <label>Category:</label>
              <select
                value={editingShot.category_id}
                onChange={(e) => setEditingShot({
                  ...editingShot,
                  category_id: e.target.value
                })}
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Name (internal):</label>
              <input
                type="text"
                value={editingShot.name}
                onChange={(e) => setEditingShot({
                  ...editingShot,
                  name: e.target.value
                })}
              />
            </div>
            <div className="form-group">
              <label>Display Name:</label>
              <input
                type="text"
                value={editingShot.display_name}
                onChange={(e) => setEditingShot({
                  ...editingShot,
                  display_name: e.target.value
                })}
              />
            </div>
            <div className="form-group">
              <label>Description:</label>
              <textarea
                value={editingShot.description}
                onChange={(e) => setEditingShot({
                  ...editingShot,
                  description: e.target.value
                })}
              />
            </div>
            <div className="form-group">
              <label>Display Order:</label>
              <input
                type="number"
                value={editingShot.display_order}
                onChange={(e) => setEditingShot({
                  ...editingShot,
                  display_order: parseInt(e.target.value) || 0
                })}
              />
            </div>
            <div className="modal-actions">
              <Button onClick={handleSaveShot}>Save</Button>
              <Button 
                variant="secondary"
                onClick={() => {
                  setEditingShot(null);
                  setShowShotForm(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminShots;