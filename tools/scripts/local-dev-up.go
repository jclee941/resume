package main

import (
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
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

func main() {
	var (
		withPortfolio = flag.Bool("portfolio", false, "start portfolio dev server")
		withJobServer = flag.Bool("job-server", false, "start job-server via docker-compose")
		withN8N       = flag.Bool("n8n", true, "start n8n mock server")
		withAll       = flag.Bool("all", false, "start all services")
	)
	flag.Parse()

	repoRoot, err := ldResolveRepoRoot()
	if err != nil {
		ldFatalf("failed to resolve repository root: %v", err)
	}

	specs, warnings, err := buildServiceSpecs(repoRoot, *withPortfolio, *withJobServer, *withN8N, *withAll)
	if err != nil {
		ldFatalf("service selection failed: %v", err)
	}

	for _, warning := range warnings {
		ldWarnf("%s", warning)
	}

	if len(specs) == 0 {
		ldFatalf("no services selected; use --n8n, --portfolio, --job-server, or --all")
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

func buildServiceSpecs(repoRoot string, withPortfolio, withJobServer, withN8N, withAll bool) ([]serviceSpec, []string, error) {
	if withAll {
		withPortfolio = true
		withJobServer = true
		withN8N = true
	}

	if !withPortfolio && !withJobServer && !withN8N {
		return nil, nil, errors.New("all service flags disabled")
	}

	warnings := make([]string, 0)
	specs := make([]serviceSpec, 0, 3)

	if withN8N {
		specs = append(specs, serviceSpec{
			Name:          "n8n-mock",
			DisplayName:   "n8n-mock",
			URL:           "http://localhost:15678",
			HealthURL:     "http://localhost:15678/health",
			Workdir:       repoRoot,
			Command:       "go",
			Args:          []string{"run", "infrastructure/mocks/n8n-mock-server.go", "--port", "15678"},
			Color:         ldColorCyan,
			HealthTimeout: 25 * time.Second,
		})
	}

	if withPortfolio {
		specs = append(specs, serviceSpec{
			Name:          "portfolio",
			DisplayName:   "portfolio",
			URL:           "http://localhost:8787",
			HealthURL:     "http://localhost:8787",
			Workdir:       filepath.Join(repoRoot, "apps", "portfolio"),
			Command:       "npm",
			Args:          []string{"start"},
			Color:         ldColorBlue,
			HealthTimeout: 40 * time.Second,
		})
	}

	if withJobServer {
		composeBinary, ok := firstAvailableBinary("docker-compose", "docker")
		if !ok {
			warnings = append(warnings, "job-server skipped: docker-compose/docker not found in PATH")
		} else {
			args := []string{"up"}
			if composeBinary == "docker" {
				args = []string{"compose", "up"}
			}
			specs = append(specs, serviceSpec{
				Name:          "job-server",
				DisplayName:   "job-server",
				URL:           "http://localhost:3456",
				HealthURL:     "http://localhost:3456/health",
				Workdir:       filepath.Join(repoRoot, "apps", "job-server"),
				Command:       composeBinary,
				Args:          args,
				Color:         ldColorYellow,
				HealthTimeout: 90 * time.Second,
			})
		}
	}

	if len(specs) == 0 {
		return nil, warnings, errors.New("no startable services after dependency checks")
	}

	return specs, warnings, nil
}

func startSelectedServices(specs []serviceSpec, printer *linePrinter) ([]*serviceProcess, error) {
	resultCh := make(chan startResult, len(specs))
	for _, spec := range specs {
		s := spec
		go func() {
			proc, err := startAndWaitHealthy(s, printer)
			resultCh <- startResult{Process: proc, Err: err}
		}()
	}

	processes := make([]*serviceProcess, 0, len(specs))
	for i := 0; i < len(specs); i++ {
		res := <-resultCh
		if res.Err != nil {
			return processes, res.Err
		}
		processes = append(processes, res.Process)
	}

	return processes, nil
}

func startAndWaitHealthy(spec serviceSpec, printer *linePrinter) (*serviceProcess, error) {
	cmd := exec.Command(spec.Command, spec.Args...)
	cmd.Dir = spec.Workdir
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	stdoutPipe, err := cmd.StdoutPipe()
	if err != nil {
		return nil, fmt.Errorf("%s stdout pipe: %w", spec.DisplayName, err)
	}
	stderrPipe, err := cmd.StderrPipe()
	if err != nil {
		return nil, fmt.Errorf("%s stderr pipe: %w", spec.DisplayName, err)
	}

	spinnerDone := make(chan struct{})
	go renderSpinner(spec, printer, spinnerDone)

	if err := cmd.Start(); err != nil {
		close(spinnerDone)
		return nil, fmt.Errorf("%s start failed: %w", spec.DisplayName, err)
	}

	proc := &serviceProcess{
		Spec:   spec,
		Cmd:    cmd,
		ExitCh: make(chan error, 1),
	}

	infof(printer, spec, "started pid=%d command=%s", cmd.Process.Pid, ldShellJoin(append([]string{spec.Command}, spec.Args...)))

	go streamLogs(spec, stdoutPipe, printer)
	go streamLogs(spec, stderrPipe, printer)

	go func() {
		proc.ExitCh <- cmd.Wait()
	}()

	infof(printer, spec, "health check polling %s", spec.HealthURL)

	healthErr := waitForHealth(spec, proc.ExitCh)
	close(spinnerDone)

	if healthErr != nil {
		gracefulStop(proc, 3*time.Second, printer)
		return nil, fmt.Errorf("%s health check failed: %w", spec.DisplayName, healthErr)
	}

	okf(printer, spec, "ready at %s", spec.URL)
	return proc, nil
}

func renderSpinner(spec serviceSpec, printer *linePrinter, done <-chan struct{}) {
	frames := []string{"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"}
	ticker := time.NewTicker(180 * time.Millisecond)
	defer ticker.Stop()

	idx := 0
	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			printer.print("%s[%s]%s Starting %s... %s\n", spec.Color, spec.DisplayName, ldColorReset, spec.DisplayName, frames[idx])
			idx = (idx + 1) % len(frames)
		}
	}
}

func streamLogs(spec serviceSpec, reader io.Reader, printer *linePrinter) {
	buf := make([]byte, 0, 32*1024)
	chunk := make([]byte, 4096)
	for {
		n, err := reader.Read(chunk)
		if n > 0 {
			buf = append(buf, chunk[:n]...)
			for {
				idx := bytesIndexByte(buf, '\n')
				if idx < 0 {
					break
				}
				line := strings.TrimRight(string(buf[:idx]), "\r")
				printer.print("%s[%s]%s %s\n", spec.Color, spec.DisplayName, ldColorReset, line)
				buf = buf[idx+1:]
			}
		}
		if err != nil {
			if !errors.Is(err, io.EOF) {
				printer.print("%s[%s]%s log stream error: %v\n", ldColorRed, spec.DisplayName, ldColorReset, err)
			}
			if len(buf) > 0 {
				line := strings.TrimRight(string(buf), "\r")
				printer.print("%s[%s]%s %s\n", spec.Color, spec.DisplayName, ldColorReset, line)
			}
			return
		}
	}
}

func waitForHealth(spec serviceSpec, exitCh chan error) error {
	deadline := time.Now().Add(spec.HealthTimeout)
	client := &http.Client{Timeout: 2 * time.Second}

	for {
		select {
		case err := <-exitCh:
			select {
			case exitCh <- err:
			default:
			}
			if err == nil {
				return errors.New("process exited before becoming healthy")
			}
			return fmt.Errorf("process exited before becoming healthy: %w", err)
		default:
		}

		if time.Now().After(deadline) {
			return fmt.Errorf("timeout after %s", spec.HealthTimeout.Round(time.Second))
		}

		resp, err := client.Get(spec.HealthURL)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode >= 200 && resp.StatusCode < 500 {
				return nil
			}
		}

		time.Sleep(600 * time.Millisecond)
	}
}

func shutdownProcesses(processes []*serviceProcess, printer *linePrinter) {
	if len(processes) == 0 {
		return
	}

	ldWarnfWithPrinter(printer, "stopping %d service(s)...", len(processes))
	for i := len(processes) - 1; i >= 0; i-- {
		gracefulStop(processes[i], 10*time.Second, printer)
	}
}

func gracefulStop(proc *serviceProcess, timeout time.Duration, printer *linePrinter) {
	if proc == nil || proc.Cmd == nil || proc.Cmd.Process == nil {
		return
	}

	pid := proc.Cmd.Process.Pid
	infof(printer, proc.Spec, "stopping pid=%d", pid)

	if err := syscall.Kill(-pid, syscall.SIGINT); err != nil {
		_ = proc.Cmd.Process.Signal(os.Interrupt)
	}

	select {
	case err := <-proc.ExitCh:
		if err != nil {
			ldWarnfWithPrinter(printer, "%s stopped with error: %v", proc.Spec.DisplayName, err)
		} else {
			okf(printer, proc.Spec, "stopped")
		}
		return
	case <-time.After(timeout):
		ldWarnfWithPrinter(printer, "%s did not stop within %s, forcing kill", proc.Spec.DisplayName, timeout)
		_ = syscall.Kill(-pid, syscall.SIGKILL)
		select {
		case <-proc.ExitCh:
		case <-time.After(2 * time.Second):
		}
	}
}

func ldResolveRepoRoot() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}

	cur := wd
	for {
		if hasPath(cur, "infrastructure/mocks/n8n-mock-server.go") && hasPath(cur, "apps/portfolio") && hasPath(cur, "apps/job-server") {
			return cur, nil
		}
		parent := filepath.Dir(cur)
		if parent == cur {
			return "", errors.New("repository root not found")
		}
		cur = parent
	}
}

func hasPath(base, rel string) bool {
	_, err := os.Stat(filepath.Join(base, rel))
	return err == nil
}

func firstAvailableBinary(candidates ...string) (string, bool) {
	for _, c := range candidates {
		if _, err := exec.LookPath(c); err == nil {
			return c, true
		}
	}
	return "", false
}

func joinServiceNames(specs []serviceSpec) string {
	names := make([]string, 0, len(specs))
	for _, spec := range specs {
		names = append(names, spec.DisplayName)
	}
	return strings.Join(names, ", ")
}

func ldShellJoin(parts []string) string {
	if len(parts) == 0 {
		return ""
	}
	out := make([]string, len(parts))
	for i, p := range parts {
		if p == "" {
			out[i] = "\"\""
			continue
		}
		if strings.ContainsAny(p, " \t\n\"'") {
			out[i] = "\"" + strings.ReplaceAll(p, "\"", "\\\"") + "\""
			continue
		}
		out[i] = p
	}
	return strings.Join(out, " ")
}

func bytesIndexByte(b []byte, c byte) int {
	for i := range b {
		if b[i] == c {
			return i
		}
	}
	return -1
}

func infof(printer *linePrinter, spec serviceSpec, format string, args ...any) {
	printer.print("%s[%s]%s %s\n", spec.Color, spec.DisplayName, ldColorReset, fmt.Sprintf(format, args...))
}

func okf(printer *linePrinter, spec serviceSpec, format string, args ...any) {
	printer.print("%s[%s]%s %s%s%s\n", spec.Color, spec.DisplayName, ldColorReset, ldColorGreen, fmt.Sprintf(format, args...), ldColorReset)
}

func ldWarnf(format string, args ...any) {
	fmt.Printf("%sWARN%s %s\n", ldColorYellow, ldColorReset, fmt.Sprintf(format, args...))
}

func ldWarnfWithPrinter(printer *linePrinter, format string, args ...any) {
	printer.print("%sWARN%s %s\n", ldColorYellow, ldColorReset, fmt.Sprintf(format, args...))
}

func ldErrorfWithPrinter(printer *linePrinter, format string, args ...any) {
	printer.print("%sERROR%s %s\n", ldColorRed, ldColorReset, fmt.Sprintf(format, args...))
}

func ldFatalf(format string, args ...any) {
	fmt.Fprintf(os.Stderr, "%sERROR%s %s\n", ldColorRed, ldColorReset, fmt.Sprintf(format, args...))
	os.Exit(1)
}
