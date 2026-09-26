package main

import (
	"fmt"
	"os"
)

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
