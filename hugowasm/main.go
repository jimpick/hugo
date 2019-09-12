package main

import (
	"fmt"

	"github.com/gohugoio/hugo/commands"
)

func main() {
	fmt.Println("Jim1")
	args := []string{
		// "--cleanDestinationDir",
		"--config",
		"../quickstart/config.toml",
		"--contentDir",
		"../quickstart/content",
		"--layoutDir",
		"../quickstart/themes/ananke/layouts",
		"--themesDir",
		"../quickstart/themes",
		"--noChmod",
		"--noTimes",
	}
	commands.Execute(args)
}
