GOROOT:=$(shell go env GOROOT)

run:
	go test -coverpkg=./... -coverprofile=c.out
	go tool cover -html=c.out -o coverage.html

wasm:
	GOOS=js GOARCH=wasm go build -o ./hugowasm/hugo.wasm ./hugowasm

run-wasm-node:
	GOOS=js GOARCH=wasm go run -exec="$(GOROOT)/misc/wasm/go_js_wasm_exec" ./hugowasm

cmd:
	./hugo --cleanDestinationDir --config ../quickstart/config.toml --contentDir ../quickstart/content --layoutDir ../quickstart/themes/ananke/layouts --themesDir ../quickstart/themes

clean:
	rm -f c.out coverage.html
