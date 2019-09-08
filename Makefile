
run:
	go test -coverpkg=./... -coverprofile=c.out
	go tool cover -html=c.out -o coverage.html

clean:
	rm -f c.out coverage.html
