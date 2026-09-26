package main

import (
	"fmt"
	"os/exec"
	"sync"
	"time"
)

const (
	ldColorReset  = "\033[0m"
	ldColorRed    = "\033[31m"
	ldColorGreen  = "\033[32m"
	ldColorYellow = "\033[33m"
	ldColorBlue   = "\033[34m"
	ldColorCyan   = "\033[36m"
)

type serviceSpec struct {
	Name          string
	DisplayName   string
	URL           string
	HealthURL     string
	Workdir       string
	Command       string
	Args          []string
	Color         string
	HealthTimeout time.Duration
	Env           []string
}

type serviceProcess struct {
	Spec   serviceSpec
	Cmd    *exec.Cmd
	ExitCh chan error
}

type startResult struct {
	Process *serviceProcess
	Err     error
}

type linePrinter struct {
	mu sync.Mutex
}

func (p *linePrinter) print(format string, args ...any) {
	p.mu.Lock()
	defer p.mu.Unlock()
	fmt.Printf(format, args...)
}
