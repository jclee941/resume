package main

import (
	"bytes"
	"strings"
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

func TestPandocArgumentsPreserveCurrentDefaults(t *testing.T) {
	t.Parallel()

	args := strings.Join(pandocPDFArgs("resume.md", "resume.pdf", fontNanum), "\x00")
	for _, want := range []string{
		"--pdf-engine=xelatex",
		"tools/scripts/build/resume-style.tex",
		"mainfont=NanumGothic",
		"geometry:margin=1.35cm",
		"papersize=a4",
		"fontsize=9pt",
		"linestretch=1.06",
	} {
		if !strings.Contains(args, want) {
			t.Fatalf("pandoc arguments missing %q: %v", want, args)
		}
	}
}

func TestNamedLayoutProfilePreservesPandocArguments(t *testing.T) {
	t.Parallel()

	profile, err := layoutProfileByName("a4-pandoc")
	if err != nil {
		t.Fatalf("resolve layout profile: %v", err)
	}
	args := strings.Join(pandocPDFArgsForProfile("resume.md", "resume.pdf", fontNanum, profile), "\x00")
	for _, want := range []string{
		"geometry:margin=1.35cm",
		"papersize=a4",
		"fontsize=9pt",
		"linestretch=1.06",
	} {
		if !strings.Contains(args, want) {
			t.Fatalf("pandoc arguments missing %q: %v", want, args)
		}
	}
}

func TestLayoutProfileByNameRejectsUnknownProfile(t *testing.T) {
	t.Parallel()

	_, err := layoutProfileByName("missing")
	if err == nil || !strings.Contains(err.Error(), "unknown layout profile: missing") {
		t.Fatalf("unknown profile error = %v", err)
	}
}

func TestVariantsSelectKnownLayoutProfiles(t *testing.T) {
	t.Parallel()

	for name, variant := range resumeVariants {
		if _, err := layoutProfileByName(variant.LayoutProfile); err != nil {
			t.Fatalf("resume variant %q selects an invalid layout profile: %v", name, err)
		}
	}
	for name, variant := range docVariants {
		if _, err := layoutProfileByName(variant.LayoutProfile); err != nil {
			t.Fatalf("document variant %q selects an invalid layout profile: %v", name, err)
		}
	}
}
