
run:
	go test -coverpkg=./... -coverprofile=c.out
	go tool cover -html=c.out -o coverage.html

cmd:
	./hugo --cleanDestinationDir --config ../quickstart/config.toml --contentDir ../quickstart/content --layoutDir ../quickstart/themes/ananke/layouts --themesDir ../quickstart/themes

clean:
	rm -f c.out coverage.html
