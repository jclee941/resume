package main

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestGeneratePDFAtomicallyPublishesNormalizedOutput(t *testing.T) {
	t.Parallel()

	outputPath := filepath.Join(t.TempDir(), "resume.pdf")
	if err := os.WriteFile(outputPath, []byte("previous output"), 0o644); err != nil {
		t.Fatalf("write existing output: %v", err)
	}

	err := generatePDFAtomically(outputPath, func(temporaryOutputPath string) error {
		return os.WriteFile(
			temporaryOutputPath,
			[]byte("%PDF-1.7\ntrailer\n/ID [<ABCDEF><123456>]\n%%EOF"),
			0o644,
		)
	})
	if err != nil {
		t.Fatalf("generate PDF atomically: %v", err)
	}

	generated, err := os.ReadFile(outputPath)
	if err != nil {
		t.Fatalf("read generated output: %v", err)
	}
	if bytes.Contains(generated, []byte("ABCDEF")) || bytes.Contains(generated, []byte("123456")) {
		t.Fatal("published PDF retained a nondeterministic ID")
	}
}

func TestGeneratePDFAtomicallyRetainsOutputWhenGenerationFails(t *testing.T) {
	t.Parallel()

	outputPath := filepath.Join(t.TempDir(), "resume.pdf")
	previousOutput := []byte("previous output")
	if err := os.WriteFile(outputPath, previousOutput, 0o644); err != nil {
		t.Fatalf("write existing output: %v", err)
	}

	err := generatePDFAtomically(outputPath, func(temporaryOutputPath string) error {
		if err := os.WriteFile(temporaryOutputPath, []byte("partial output"), 0o644); err != nil {
			return err
		}
		return errors.New("generator failed")
	})
	if err == nil {
		t.Fatal("generation failure must be returned")
	}

	actualOutput, readErr := os.ReadFile(outputPath)
	if readErr != nil {
		t.Fatalf("read preserved output: %v", readErr)
	}
	if !bytes.Equal(actualOutput, previousOutput) {
		t.Fatalf("output changed after failed generation: %q", actualOutput)
	}
}

func TestGeneratePDFAtomicallyUsesPDFTemporaryOutput(t *testing.T) {
	t.Parallel()

	outputPath := filepath.Join(t.TempDir(), "resume.pdf")
	err := generatePDFWithNormalizer(
		outputPath,
		func(temporaryOutputPath string) error {
			if filepath.Ext(temporaryOutputPath) != ".pdf" {
				return errors.New("temporary output does not retain the PDF extension")
			}
			return os.WriteFile(temporaryOutputPath, []byte("%PDF-1.7"), 0o644)
		},
		func(string) error { return nil },
	)
	if err != nil {
		t.Fatalf("generate PDF with a PDF temporary output: %v", err)
	}
}

func TestGeneratePDFAtomicallyRetainsOutputWhenGeneratedFileIsNotPDF(t *testing.T) {
	t.Parallel()

	outputPath := filepath.Join(t.TempDir(), "resume.pdf")
	previousOutput := []byte("previous output")
	if err := os.WriteFile(outputPath, previousOutput, 0o644); err != nil {
		t.Fatalf("write existing output: %v", err)
	}

	err := generatePDFAtomically(outputPath, func(temporaryOutputPath string) error {
		return os.WriteFile(temporaryOutputPath, []byte("<html>not a PDF</html>"), 0o644)
	})
	if err == nil {
		t.Fatal("non-PDF generator output must be rejected")
	}

	actualOutput, readErr := os.ReadFile(outputPath)
	if readErr != nil {
		t.Fatalf("read preserved output: %v", readErr)
	}
	if !bytes.Equal(actualOutput, previousOutput) {
		t.Fatalf("output changed after invalid PDF generation: %q", actualOutput)
	}
}

func TestGeneratePDFAtomicallyRetainsOutputWhenNormalizationFails(t *testing.T) {
	t.Parallel()

	outputPath := filepath.Join(t.TempDir(), "resume.pdf")
	previousOutput := []byte("previous output")
	if err := os.WriteFile(outputPath, previousOutput, 0o644); err != nil {
		t.Fatalf("write existing output: %v", err)
	}

	err := generatePDFWithNormalizer(
		outputPath,
		func(temporaryOutputPath string) error {
			return os.WriteFile(temporaryOutputPath, []byte("generated output"), 0o644)
		},
		func(string) error { return errors.New("normalization failed") },
	)
	if err == nil {
		t.Fatal("normalization failure must be returned")
	}

	actualOutput, readErr := os.ReadFile(outputPath)
	if readErr != nil {
		t.Fatalf("read preserved output: %v", readErr)
	}
	if !bytes.Equal(actualOutput, previousOutput) {
		t.Fatalf("output changed after failed normalization: %q", actualOutput)
	}
}
