package main

import (
	"bytes"
	"testing"
)

func TestResumeVariantsExposeRecruiterSummaryAndFullCV(t *testing.T) {
	t.Parallel()
	summary, summaryOK := resumeVariants["master"]
	full, fullOK := resumeVariants["full"]
	if !summaryOK || !fullOK {
		t.Fatal("master and full variants must both exist")
	}
	if summary.Source != "packages/data/resumes/master/resume_summary.md" {
		t.Fatalf("master source = %q", summary.Source)
	}
	if full.Source != "packages/data/resumes/master/resume_master.md" {
		t.Fatalf("full source = %q", full.Source)
	}
	if summary.Output == full.Output {
		t.Fatal("summary and full variants must use separate outputs")
	}
}

func TestNormalizePDFIDIsDeterministic(t *testing.T) {
	t.Parallel()
	input := []byte("%PDF-1.7\ntrailer\n/ID [<ABCDEF><123456>]\n%%EOF")
	first := normalizePdfID(input)
	second := normalizePdfID(input)
	if !bytes.Equal(first, second) {
		t.Fatal("normalized PDF IDs differ for identical input")
	}
	if bytes.Contains(first, []byte("ABCDEF")) || bytes.Contains(first, []byte("123456")) {
		t.Fatal("source PDF ID was not replaced")
	}
}
