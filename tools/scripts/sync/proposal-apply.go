package main

import (
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
)

func applyProposal(root map[string]any, proposal approvedProposal) error {
	for _, change := range proposal.AllowedChanges {
		if err := applyChange(root, change); err != nil {
			return err
		}
	}
	return nil
}

func applyChange(root map[string]any, change ProposalChange) error {
	var proposed any
	if err := json.Unmarshal(change.ProposedValue, &proposed); err != nil {
		return err
	}
	switch change.Target.Operation {
	case "add":
		return addAtPointer(root, change.Target.Path, proposed)
	case "replace":
		return replaceAtPointer(root, change.Target.Path, proposed)
	default:
		return fmt.Errorf("unsupported operation %q", change.Target.Operation)
	}
}

func addAtPointer(root map[string]any, pointer string, value any) error {
	parent, key, err := pointerParent(root, pointer)
	if err != nil {
		return err
	}
	if key == "-" {
		array, ok := parent.container.([]any)
		if !ok {
			return fmt.Errorf("target parent is not an array: %s", pointer)
		}
		if containsEquivalentAddition(array, value) {
			return fmt.Errorf("duplicate add at %s", pointer)
		}
		return parent.assign(append(array, value))
	}
	object, ok := parent.container.(map[string]any)
	if !ok {
		return fmt.Errorf("target parent is not an object: %s", pointer)
	}
	object[key] = value
	return nil
}

func containsEquivalentAddition(values []any, proposed any) bool {
	proposedName, hasName := additionName(proposed)
	for _, value := range values {
		if existingName, existingHasName := additionName(value); hasName && existingHasName {
			if existingName == proposedName {
				return true
			}
			continue
		}
		if reflect.DeepEqual(value, proposed) {
			return true
		}
	}
	return false
}

func additionName(value any) (string, bool) {
	record, ok := value.(map[string]any)
	if !ok {
		return "", false
	}
	name, ok := record["name"].(string)
	if !ok {
		return "", false
	}
	return normalizeAdditionName(name), true
}

func normalizeAdditionName(value string) string {
	replacer := strings.NewReplacer(".", "", " ", "", "_", "", "-", "")
	return strings.ToLower(replacer.Replace(value))
}

func replaceAtPointer(root map[string]any, pointer string, value any) error {
	parent, key, err := pointerParent(root, pointer)
	if err != nil {
		return err
	}
	object, ok := parent.container.(map[string]any)
	if !ok {
		return fmt.Errorf("replace parent is not an object: %s", pointer)
	}
	object[key] = value
	return nil
}

type pointerParentRef struct {
	container any
	assign    func(any) error
}

func pointerParent(root map[string]any, pointer string) (pointerParentRef, string, error) {
	parts := strings.Split(strings.TrimPrefix(pointer, "/"), "/")
	if len(parts) == 0 || parts[0] == "" {
		return pointerParentRef{}, "", fmt.Errorf("invalid pointer %q", pointer)
	}
	for index := range parts {
		parts[index] = strings.ReplaceAll(strings.ReplaceAll(parts[index], "~1", "/"), "~0", "~")
	}

	var current any = root
	var parentObject map[string]any
	var parentKey string
	for _, part := range parts[:len(parts)-1] {
		object, ok := current.(map[string]any)
		if !ok {
			return pointerParentRef{}, "", fmt.Errorf("non-object path segment %q", part)
		}
		next, ok := object[part]
		if !ok {
			return pointerParentRef{}, "", fmt.Errorf("missing path segment %q", part)
		}
		parentObject = object
		parentKey = part
		current = next
	}

	return pointerParentRef{container: current, assign: func(value any) error {
		if parentObject == nil {
			return fmt.Errorf("cannot replace root container")
		}
		parentObject[parentKey] = value
		return nil
	}}, parts[len(parts)-1], nil
}
