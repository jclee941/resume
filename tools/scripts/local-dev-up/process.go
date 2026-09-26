package main

import (
	"fmt"
	"os"
	"os/exec"
	"syscall"
	"time"
)

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
	if len(spec.Env) > 0 {
		cmd.Env = append(os.Environ(), spec.Env...)
	}
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
