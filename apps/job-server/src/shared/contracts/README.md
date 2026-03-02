# Shared Contracts

Schema definitions and type contracts shared between Go and JavaScript stacks.

## Purpose

- Define data schemas for session state, job data, and application state
- Enable type-safe communication between Go CLI and Node.js MCP server
- Support schema evolution and validation

## Structure

```
contracts/
├── session.schema.json     # Session state format
├── job.schema.json         # Job posting data structure  
├── application.schema.json # Application tracking format
├── resume.schema.json      # Resume data contracts
└── README.md
```

## Usage

### JavaScript
```javascript
import sessionSchema from '../contracts/session.schema.json';
import { validate } from 'jsonschema';

const isValid = validate(sessionData, sessionSchema);
```

### Go
```go
import (
    "encoding/json"
    "github.com/xeipuuv/gojsonschema"
)

schemaLoader := gojsonschema.NewReferenceLoader("file://./contracts/session.schema.json")
documentLoader := gojsonschema.NewGoLoader(sessionData)

result, err := gojsonschema.Validate(schemaLoader, documentLoader)
```
