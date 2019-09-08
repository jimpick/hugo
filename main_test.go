package main

import (
	"testing"

	"github.com/gohugoio/hugo/commands"
)

func TestMain(t *testing.T) {
	args := []string{
		"--cleanDestinationDir",
		"--config",
		"../quickstart/config.toml",
		"--contentDir",
		"../quickstart/content",
		"--layoutDir",
		"../quickstart/themes/ananke/layouts",
		"--themesDir",
		"../quickstart/themes",
	}
	commands.Execute(args)
}
