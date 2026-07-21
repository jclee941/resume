package main

import (
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strconv"
)

type Bump string

const (
	BumpNone  Bump = "none"
	BumpPatch Bump = "patch"
	BumpMinor Bump = "minor"
	BumpMajor Bump = "major"
)

type Trigger string

const (
	TriggerAutomated Trigger = "automated"
	TriggerManual    Trigger = "manual"
)

type DecisionKind string

const (
	DecisionPublish    DecisionKind = "publish"
	DecisionNoRelease  DecisionKind = "no-release"
	DecisionSuperseded DecisionKind = "superseded"
)

type CommitMessage struct {
	Subject string
	Body    string
}

type Request struct {
	TargetSHA    string
	RemoteTipSHA string
	Trigger      Trigger
}

type Decision struct {
	TargetSHA   string       `json:"target_sha"`
	PreviousTag string       `json:"previous_tag"`
	Decision    DecisionKind `json:"decision"`
	NextTag     string       `json:"next_tag,omitempty"`
	Reason      string       `json:"reason"`
	Range       string       `json:"range"`
}

type version struct {
	major int
	minor int
	patch int
}

type versionTag struct {
	name    string
	version version
	commit  string
}

var (
	shaPattern      = regexp.MustCompile(`^[0-9a-f]{40}$`)
	semverPattern   = regexp.MustCompile(`^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$`)
	majorPattern    = regexp.MustCompile(`^[a-z][a-z0-9-]*(?:\([^\r\n()]+\))?!:`)
	minorPattern    = regexp.MustCompile(`^feat(?:\([^\r\n()]+\))?:`)
	patchPattern    = regexp.MustCompile(`^(?:fix|perf|refactor)(?:\([^\r\n()]+\))?:`)
	breakingPattern = regexp.MustCompile(`(?m)^BREAKING(?: |-)CHANGE:[ \t]*\S`)
)

func ClassifyBump(messages []CommitMessage) Bump {
	bump := BumpNone
	for _, message := range messages {
		if majorPattern.MatchString(message.Subject) || breakingPattern.MatchString(message.Body) {
			return BumpMajor
		}
		if minorPattern.MatchString(message.Subject) {
			bump = BumpMinor
			continue
		}
		if bump == BumpNone && patchPattern.MatchString(message.Subject) {
			bump = BumpPatch
		}
	}
	return bump
}

func Decide(repository string, request Request) (Decision, error) {
	if !shaPattern.MatchString(request.TargetSHA) || !shaPattern.MatchString(request.RemoteTipSHA) {
		return Decision{}, errors.New("target and remote tip must be lowercase 40-hex SHAs")
	}
	if request.Trigger != TriggerAutomated && request.Trigger != TriggerManual {
		return Decision{}, fmt.Errorf("unsupported trigger %q", request.Trigger)
	}
	if _, err := git(repository, "cat-file", "-e", request.TargetSHA+"^{commit}"); err != nil {
		return Decision{}, fmt.Errorf("resolve target commit: %w", err)
	}
	if request.TargetSHA != request.RemoteTipSHA {
		decision := Decision{TargetSHA: request.TargetSHA, Decision: DecisionSuperseded, Reason: "target is not the current remote master tip"}
		if request.Trigger == TriggerAutomated {
			return decision, nil
		}
		return Decision{}, errors.New("manual target is not the current remote master tip")
	}

	tags, err := listVersionTags(repository)
	if err != nil {
		return Decision{}, err
	}
	global := highestTag(tags)
	reachable := make([]versionTag, 0, len(tags))
	for _, tag := range tags {
		if _, err := git(repository, "merge-base", "--is-ancestor", tag.commit, request.TargetSHA); err == nil {
			reachable = append(reachable, tag)
		}
	}
	previous := highestTag(reachable)
	if global.name != previous.name {
		return Decision{}, fmt.Errorf("highest reachable tag %q differs from global highest published SemVer tag %q", previous.name, global.name)
	}

	rangeSpec := request.TargetSHA
	if previous.name != "" {
		rangeSpec = previous.name + ".." + request.TargetSHA
	}
	messages, err := commitMessages(repository, rangeSpec)
	if err != nil {
		return Decision{}, err
	}
	bump := ClassifyBump(messages)
	decision := Decision{TargetSHA: request.TargetSHA, PreviousTag: previous.name, Decision: DecisionNoRelease, Reason: "range contains no release-bearing commits", Range: rangeSpec}
	if bump == BumpNone {
		return decision, nil
	}
	next := increment(previous.version, bump)
	if compareVersion(next, global.version) <= 0 {
		return Decision{}, errors.New("next version is not globally monotonic")
	}
	decision.Decision = DecisionPublish
	decision.NextTag = formatVersion(next)
	decision.Reason = "highest conventional-commit bump is " + string(bump)
	return decision, nil
}

func parseVersion(tag string) (version, bool) {
	match := semverPattern.FindStringSubmatch(tag)
	if match == nil {
		return version{}, false
	}
	major, _ := strconv.Atoi(match[1])
	minor, _ := strconv.Atoi(match[2])
	patch, _ := strconv.Atoi(match[3])
	return version{major: major, minor: minor, patch: patch}, true
}

func highestTag(tags []versionTag) versionTag {
	sort.Slice(tags, func(i, j int) bool { return compareVersion(tags[i].version, tags[j].version) < 0 })
	if len(tags) == 0 {
		return versionTag{}
	}
	return tags[len(tags)-1]
}

func increment(current version, bump Bump) version {
	switch bump {
	case BumpMajor:
		return version{major: current.major + 1}
	case BumpMinor:
		return version{major: current.major, minor: current.minor + 1}
	case BumpPatch:
		return version{major: current.major, minor: current.minor, patch: current.patch + 1}
	case BumpNone:
		return current
	default:
		return current
	}
}

func compareVersion(left, right version) int {
	if left.major != right.major {
		return left.major - right.major
	}
	if left.minor != right.minor {
		return left.minor - right.minor
	}
	return left.patch - right.patch
}

func formatVersion(value version) string {
	return fmt.Sprintf("v%d.%d.%d", value.major, value.minor, value.patch)
}
