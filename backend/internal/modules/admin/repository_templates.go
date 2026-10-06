package admin

import (
	"context"
	"fmt"

	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/database"
)

// ListTemplates mengambil seluruh template tanggapan.
func (r *Repository) ListTemplates(ctx context.Context) ([]Template, error) {
	res, err := database.ListRecords[Template](ctx, r.db, "templates", 1, 500, "", "created_at")
	if err != nil {
		return nil, err
	}
	if res.Items == nil {
		return []Template{}, nil
	}
	return res.Items, nil
}

// FindTemplateByID mengambil template berdasarkan ID atau original_id.
func (r *Repository) FindTemplateByID(ctx context.Context, id string) (*Template, error) {
	tpl, err := database.GetRecord[Template](ctx, r.db, "templates", id)
	if err == nil {
		return tpl, nil
	}
	return database.FindFirst[Template](ctx, r.db, "templates", fmt.Sprintf("original_id = '%s'", id))
}

// CreateTemplate menambahkan template tanggapan baru.
func (r *Repository) CreateTemplate(ctx context.Context, title, statusTarget, content string) (*Template, error) {
	record := map[string]any{
		"title":         title,
		"status_target": statusTarget,
		"content":       content,
	}
	return database.CreateRecord[Template](ctx, r.db, "templates", record)
}

// UpdateTemplate mengubah template tanggapan.
func (r *Repository) UpdateTemplate(ctx context.Context, id string, title, statusTarget, content *string) (*Template, error) {
	existing, err := r.FindTemplateByID(ctx, id)
	if err != nil {
		return nil, err
	}

	updateData := map[string]any{}
	if title != nil {
		updateData["title"] = *title
	}
	if statusTarget != nil {
		updateData["status_target"] = *statusTarget
	}
	if content != nil {
		updateData["content"] = *content
	}

	return database.UpdateRecord[Template](ctx, r.db, "templates", existing.ID, updateData)
}

// DeleteTemplate menghapus template tanggapan.
func (r *Repository) DeleteTemplate(ctx context.Context, id string) error {
	existing, err := r.FindTemplateByID(ctx, id)
	if err != nil {
		return err
	}
	return database.DeleteRecord(ctx, r.db, "templates", existing.ID)
}
