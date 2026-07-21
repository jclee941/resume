package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
)

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(arguments []string) error {
	flags := flag.NewFlagSet("next-version", flag.ContinueOnError)
	flags.SetOutput(os.Stderr)
	repository := flags.String("repo", ".", "path to the Git repository")
	target := flags.String("target", "", "immutable 40-hex target commit SHA")
	remoteTip := flags.String("remote-tip", "", "current remote master tip SHA")
	trigger := flags.String("trigger", "", "trigger kind: automated or manual")
	output := flags.String("output", "release-decision.json", "decision JSON output path")
	if err := flags.Parse(arguments); err != nil {
		return fmt.Errorf("parse flags: %w", err)
	}
	if flags.NArg() != 0 {
		return errors.New("unexpected positional arguments")
	}
	decision, err := Decide(*repository, Request{TargetSHA: *target, RemoteTipSHA: *remoteTip, Trigger: Trigger(*trigger)})
	if err != nil {
		return err
	}
	encoded, err := json.MarshalIndent(decision, "", "  ")
	if err != nil {
		return fmt.Errorf("encode decision: %w", err)
	}
	encoded = append(encoded, '\n')
	if err := os.WriteFile(*output, encoded, 0o600); err != nil {
		return fmt.Errorf("write decision: %w", err)
	}
	_, err = os.Stdout.Write(encoded)
	if err != nil {
		return fmt.Errorf("write decision output: %w", err)
	}
	return nil
}
