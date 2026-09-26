package main

import (
	"flag"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	var (
		withPortfolio = flag.Bool("portfolio", false, "start portfolio dev server")
		withJobServer = flag.Bool("job-server", false, "start job-server via docker-compose")
		withAll       = flag.Bool("all", false, "start all services")
	)
	flag.Parse()

	repoRoot, err := ldResolveRepoRoot()
	if err != nil {
		ldFatalf("failed to resolve repository root: %v", err)
	}

	specs, warnings, err := buildServiceSpecs(repoRoot, *withPortfolio, *withJobServer, *withAll)
	if err != nil {
		ldFatalf("service selection failed: %v", err)
	}

	for _, warning := range warnings {
		ldWarnf("%s", warning)
	}

	if len(specs) == 0 {
		ldFatalf("no services selected; use --portfolio, --job-server, or --all")
	}

	printer := &linePrinter{}
	printer.print("%sLocal development orchestrator%s\n", ldColorBlue, ldColorReset)
	printer.print("repo root: %s\n", repoRoot)
	printer.print("services: %s\n\n", joinServiceNames(specs))

	processes, err := startSelectedServices(specs, printer)
	if err != nil {
		shutdownProcesses(processes, printer)
		ldFatalf("startup failed: %v", err)
	}

	printer.print("\n%sAll selected services are ready.%s\n", ldColorGreen, ldColorReset)
	for _, proc := range processes {
		infof(printer, proc.Spec, "ready at %s", proc.Spec.URL)
	}
	printer.print("\n%sAggregated logs follow. Press Ctrl+C to stop.%s\n\n", ldColorCyan, ldColorReset)

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)

	exitEventCh := make(chan struct {
		name string
		err  error
	}, len(processes))

	for _, proc := range processes {
		p := proc
		go func() {
			err := <-p.ExitCh
			exitEventCh <- struct {
				name string
				err  error
			}{name: p.Spec.DisplayName, err: err}
		}()
	}

	select {
	case sig := <-sigCh:
		ldWarnfWithPrinter(printer, "shutdown signal received: %s", sig.String())
	case evt := <-exitEventCh:
		if evt.err != nil {
			ldErrorfWithPrinter(printer, "service exited unexpectedly: %s (%v)", evt.name, evt.err)
		} else {
			ldWarnfWithPrinter(printer, "service exited: %s", evt.name)
		}
	}

	shutdownProcesses(processes, printer)
	printer.print("%sLocal development environment stopped.%s\n", ldColorGreen, ldColorReset)
}
