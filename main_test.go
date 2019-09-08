package main

import (
	"os"
	"testing"

	"github.com/gohugoio/hugo/commands"
)

func TestMain(t *testing.T) {
	commands.Execute(os.Args[1:])
}
