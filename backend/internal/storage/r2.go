// Package storage menyediakan klien Cloudflare R2 (S3-compatible)
// untuk lampiran pengaduan.
package storage

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// Client membungkus S3 client untuk bucket R2.
type Client struct {
	s3       *s3.Client
	bucket   string
	endpoint string
	enabled  bool
}

// NewR2 membuat Client R2. Jika kredensial kosong, klien tetap dibuat
// namun operasi upload/delete/presign mengembalikan error (fail-closed).
func NewR2(accessKeyID, secretAccessKey, endpoint, bucket string) *Client {
	c := &Client{bucket: bucket, endpoint: endpoint}
	if accessKeyID == "" || secretAccessKey == "" || endpoint == "" || bucket == "" {
		return c
	}
	c.s3 = s3.New(s3.Options{
		BaseEndpoint: aws.String(endpoint),
		Credentials:  credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, ""),
		Region:       "auto",
	})
	c.enabled = true
	return c
}

// Enabled mengembalikan true bila R2 dikonfigurasi lengkap.
func (c *Client) Enabled() bool { return c.enabled }

func (c *Client) requireEnabled() error {
	if !c.enabled {
		return fmt.Errorf("storage R2 belum dikonfigurasi")
	}
	return nil
}

// Upload menyimpan objek dan mengembalikan key-nya.
func (c *Client) Upload(ctx context.Context, key string, data []byte, contentType string) error {
	if err := c.requireEnabled(); err != nil {
		return err
	}
	_, err := c.s3.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(key),
		Body:        bytes.NewReader(data),
		ContentType: aws.String(contentType),
		ContentLength: aws.Int64(int64(len(data))),
	})
	return err
}

// Delete menghapus objek. Tidak error bila objek tidak ada.
func (c *Client) Delete(ctx context.Context, key string) error {
	if err := c.requireEnabled(); err != nil {
		return err
	}
	_, err := c.s3.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	var nsk *types.NoSuchKey
	if err != nil && !errors.As(err, &nsk) {
		return err
	}
	return nil
}

// PresignedURL menghasilkan URL unduhan sementara untuk key.
func (c *Client) PresignedURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	if err := c.requireEnabled(); err != nil {
		return "", err
	}
	presigner := s3.NewPresignClient(c.s3)
	req, err := presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	}, s3.WithPresignExpires(expiry))
	if err != nil {
		return "", err
	}
	return req.URL, nil
}

// ListObjects mengambil semua key objek dengan prefix tertentu.
func (c *Client) ListObjects(ctx context.Context, prefix string) ([]string, error) {
	if err := c.requireEnabled(); err != nil {
		return nil, err
	}
	var keys []string
	paginator := s3.NewListObjectsV2Paginator(c.s3, &s3.ListObjectsV2Input{
		Bucket: aws.String(c.bucket),
		Prefix: aws.String(prefix),
	})
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return nil, err
		}
		for _, obj := range page.Contents {
			if obj.Key != nil {
				keys = append(keys, *obj.Key)
			}
		}
	}
	return keys, nil
}

// DrainBody membaca isi body penuh (untuk upload dari request).
func DrainBody(r io.Reader) ([]byte, error) {
	return io.ReadAll(r)
}