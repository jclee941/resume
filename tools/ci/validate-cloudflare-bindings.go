package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"regexp"
)

type jsonObject map[string]json.RawMessage

type binding struct {
	Binding string `json:"binding"`
	Name    string `json:"name"`
	Queue   string `json:"queue"`
}

type productionBindings struct {
	AI             binding   `json:"ai"`
	Browser        binding   `json:"browser"`
	D1Databases    []binding `json:"d1_databases"`
	KVNamespaces   []binding `json:"kv_namespaces"`
	Workflows      []binding `json:"workflows"`
	DurableObjects struct {
		Bindings []binding `json:"bindings"`
	} `json:"durable_objects"`
	Queues struct {
		Producers []binding `json:"producers"`
		Consumers []binding `json:"consumers"`
	} `json:"queues"`
}

func main() {
	if len(os.Args) != 2 {
		fmt.Fprintln(os.Stderr, "usage: validate-cloudflare-bindings <repository-root>")
		os.Exit(2)
	}
	if err := validateProductionBindings(os.Args[1]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func validateProductionBindings(rootDir string) error {
	rootConfig, err := readJSONCObject(filepath.Join(rootDir, "wrangler.jsonc"))
	if err != nil {
		return err
	}
	portfolioConfig, err := readJSONCObject(filepath.Join(rootDir, "apps/portfolio/wrangler.jsonc"))
	if err != nil {
		return err
	}
	var environments map[string]json.RawMessage
	if err := json.Unmarshal(portfolioConfig["env"], &environments); err != nil {
		return fmt.Errorf("ERROR: parse portfolio env: %w", err)
	}
	var productionConfig jsonObject
	if err := json.Unmarshal(environments["production"], &productionConfig); err != nil {
		return fmt.Errorf("ERROR: parse portfolio env.production: %w", err)
	}

	for _, field := range []string{"ai", "browser", "durable_objects", "d1_databases", "kv_namespaces", "workflows", "queues", "routes", "triggers", "vars"} {
		if !equalJSON(rootConfig[field], productionConfig[field]) {
			return fmt.Errorf("ERROR: root %s differs from portfolio env.production", field)
		}
	}
	for _, field := range []string{"compatibility_date", "compatibility_flags", "migrations", "observability"} {
		if !equalJSON(rootConfig[field], portfolioConfig[field]) {
			return fmt.Errorf("ERROR: root %s differs from portfolio global config", field)
		}
	}
	var rootAssets, productionAssets binding
	if json.Unmarshal(rootConfig["assets"], &rootAssets) != nil ||
		json.Unmarshal(productionConfig["assets"], &productionAssets) != nil ||
		rootAssets.Binding != "ASSETS" || productionAssets.Binding != rootAssets.Binding {
		return fmt.Errorf("ERROR: root and portfolio production ASSETS bindings differ")
	}

	var config productionBindings
	if err := json.Unmarshal(environments["production"], &config); err != nil {
		return fmt.Errorf("ERROR: parse required production bindings: %w", err)
	}
	contracts := []struct {
		kind      string
		available map[string]bool
		required  []string
	}{
		{"D1", bindingSet(config.D1Databases), []string{"DB", "JOB_DB"}},
		{"KV", bindingSet(config.KVNamespaces), []string{"SESSIONS", "RATE_LIMIT_KV", "NONCE_KV"}},
		{"Workflow", bindingSet(config.Workflows), []string{"JOB_CRAWLING_WORKFLOW", "APPLICATION_WORKFLOW", "RESUME_SYNC_WORKFLOW", "DAILY_REPORT_WORKFLOW", "HEALTH_CHECK_WORKFLOW", "BACKUP_WORKFLOW", "CLEANUP_WORKFLOW"}},
		{"Durable Object", nameSet(config.DurableObjects.Bindings), []string{"BROWSER_SESSION"}},
		{"Queue producer", bindingSet(config.Queues.Producers), []string{"CRAWL_TASKS", "NOTIFICATION_QUEUE"}},
	}
	for _, contract := range contracts {
		for _, required := range contract.required {
			if !contract.available[required] {
				return fmt.Errorf("ERROR: production config missing required %s binding %s", contract.kind, required)
			}
		}
	}
	if config.AI.Binding != "AI" || config.Browser.Binding != "MYBROWSER" {
		return fmt.Errorf("ERROR: production config missing required AI or Browser binding")
	}
	consumerQueues := make(map[string]bool, len(config.Queues.Consumers))
	for _, consumer := range config.Queues.Consumers {
		consumerQueues[consumer.Queue] = true
	}
	if !consumerQueues["crawl-tasks"] || !consumerQueues["notifications"] {
		return fmt.Errorf("ERROR: production config missing required Queue consumer")
	}
	return nil
}

func bindingSet(bindings []binding) map[string]bool {
	set := make(map[string]bool, len(bindings))
	for _, item := range bindings {
		set[item.Binding] = true
	}
	return set
}

func nameSet(bindings []binding) map[string]bool {
	set := make(map[string]bool, len(bindings))
	for _, item := range bindings {
		set[item.Name] = true
	}
	return set
}

func readJSONCObject(path string) (jsonObject, error) {
	body, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("ERROR: read %s: %w", path, err)
	}
	withoutComments := stripJSONCComments(body)
	normalized := regexp.MustCompile(`,\s*([}\]])`).ReplaceAll(withoutComments, []byte("$1"))
	var config jsonObject
	if err := json.Unmarshal(normalized, &config); err != nil {
		return nil, fmt.Errorf("ERROR: parse %s: %w", path, err)
	}
	return config, nil
}

func equalJSON(left, right json.RawMessage) bool {
	var leftValue, rightValue any
	return json.Unmarshal(left, &leftValue) == nil &&
		json.Unmarshal(right, &rightValue) == nil &&
		reflect.DeepEqual(leftValue, rightValue)
}

func stripJSONCComments(input []byte) []byte {
	output := make([]byte, 0, len(input))
	for index, inString, escaped := 0, false, false; index < len(input); index++ {
		current := input[index]
		if inString {
			output = append(output, current)
			if escaped {
				escaped = false
			} else if current == '\\' {
				escaped = true
			} else if current == '"' {
				inString = false
			}
			continue
		}
		if current == '"' {
			inString = true
			output = append(output, current)
			continue
		}
		if current == '/' && index+1 < len(input) && input[index+1] == '/' {
			for index < len(input) && input[index] != '\n' {
				index++
			}
			output = append(output, '\n')
			continue
		}
		if current == '/' && index+1 < len(input) && input[index+1] == '*' {
			index += 2
			for index+1 < len(input) && !(input[index] == '*' && input[index+1] == '/') {
				index++
			}
			index++
			continue
		}
		output = append(output, current)
	}
	return output
}
