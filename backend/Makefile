.PHONY: run build test vet tidy migrate

run:
	go run ./cmd/api

build:
	go build -o bin/api ./cmd/api

test:
	go test ./... -count=1

vet:
	go vet ./...

tidy:
	go mod tidy