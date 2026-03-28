// apply-assets.go applies Elasticsearch monitoring assets (ingest pipeline, index template, indices).
package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	esURL := os.Getenv("ELASTICSEARCH_URL")
	if esURL == "" {
		return fmt.Errorf("ELASTICSEARCH_URL is required")
	}

	esAPIKey := os.Getenv("ELASTICSEARCH_API_KEY")
	if esAPIKey == "" {
		return fmt.Errorf("ELASTICSEARCH_API_KEY is required")
	}

	// Determine script directory (where the Go binary resides)
	execPath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("failed to get executable path: %w", err)
	}
	scriptDir := filepath.Dir(execPath)

	pipelineFile := filepath.Join(scriptDir, "pipeline.json")
	pipelineTmp, err := os.CreateTemp("", "pipeline-*.json")
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	pipelineTmpPath := pipelineTmp.Name()
	pipelineTmp.Close()

	defer os.Remove(pipelineTmpPath)

	// Extract elasticsearch_ingest_pipeline from pipeline.json using Node.js
	nodeScript := `const fs=require('fs'); const src=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); fs.writeFileSync(process.argv[2], JSON.stringify(src.elasticsearch_ingest_pipeline));`
	cmd := exec.Command("node", "-e", nodeScript, pipelineFile, pipelineTmpPath)
	if output, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to extract pipeline with node: %s, %w", string(output), err)
	}

	fmt.Println("Applying resume Elasticsearch ingest pipeline...")

	// Apply ingest pipeline
	if err := applyPipeline(esURL, esAPIKey, pipelineTmpPath); err != nil {
		return err
	}

	fmt.Println()
	fmt.Println("Applying resume Elasticsearch index template...")

	indexTemplateFile := filepath.Join(scriptDir, "index-template.json")
	if err := applyIndexTemplate(esURL, esAPIKey, indexTemplateFile); err != nil {
		return err
	}

	indices := []string{
		"resume-logs-worker",
		"resume-logs-worker-preview",
		"resume-logs-job-worker",
		"resume-logs-job-worker-staging",
	}

	for _, index := range indices {
		fmt.Println()
		fmt.Printf("Ensuring index exists: %s\n", index)
		ensureIndex(esURL, esAPIKey, index)
	}

	fmt.Println()
	fmt.Println("Done.")

	return nil
}

func applyPipeline(esURL, apiKey, pipelineFile string) error {
	url := esURL + "/_ingest/pipeline/resume-logs-ingest"
	cmd := exec.Command("curl", "-fsS", "-X", "PUT", url,
		"-H", "Authorization: ApiKey "+apiKey,
		"-H", "Content-Type: application/json",
		"-d", "@"+pipelineFile)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func applyIndexTemplate(esURL, apiKey, templateFile string) error {
	url := esURL + "/_index_template/resume-logs-template"
	cmd := exec.Command("curl", "-fsS", "-X", "PUT", url,
		"-H", "Authorization: ApiKey "+apiKey,
		"-H", "Content-Type: application/json",
		"-d", "@"+templateFile)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func ensureIndex(esURL, apiKey, index string) {
	url := esURL + "/" + index
	payload := `{"settings":{"index":{"number_of_shards":1,"number_of_replicas":0}}}`

	cmd := exec.Command("curl", "-fsS", "-X", "PUT", url,
		"-H", "Authorization: ApiKey "+apiKey,
		"-H", "Content-Type: application/json",
		"-d", payload)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Run() // Ignore errors (|| true behavior)
}
