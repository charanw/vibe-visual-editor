## Function Registry

This document describes the centralized function registry for Studio X.

### Overview

The function registry is the single source of truth that defines what each StudioX function is and how the editor should treat it. It replaces the previous ad-hoc `stepFunctionTemplates.ts` approach with a well-structured, extensible system.

### Structure

```
src/lib/visual-vibes/functions/
├── index.ts              # Central exports
├── types.ts             # Core type definitions
├── categories.ts        # Function categories (AI, Communication, Data, etc)
├── fieldSchemas.ts      # Reusable input field schema definitions
└── registry.ts          # Main function registry and query functions
```

### Files and Responsibilities

#### `types.ts`

Defines the core TypeScript types:

- `FunctionDefinition` - Metadata about a single function
- `FieldSchema` - Input field schema for describing function parameters
- `FunctionCategory` - A category grouping functions
- `FunctionLookup` - Result object combining definition and schemas

#### `categories.ts`

Defines all available function categories:

- AI
- Communication
- Data
- ControlFlow
- FileAndFormat
- Integration

Provides utility functions:

- `getCategories()` - Get all categories
- `getCategory(id)` - Get a specific category

#### `fieldSchemas.ts`

Reusable input field schemas for common parameter types:

- `prompt`, `text`, `imageBuffer`, `imageMimetype`, `outputType` (AI)
- `message`, `responseType`, `emailAddress`, `emailSubject`, `emailBody` (Communication)
- `query`, `resourceId`, `returnFormat` (Data)
- `condition`, `items`, `steps` (Control Flow)
- `endpoint`, `method`, `headers`, `authType` (Integration)
- `filename`, `data` (File/Format)
- `startDateTime`, `timeZone`, `isRecurring` (Scheduling)

Provides utility functions:

- `getFieldSchema(id)` - Get a field schema by ID
- `getFieldSchemas(ids)` - Get multiple field schemas

#### `registry.ts`

The main registry containing all function definitions and query functions:

**Main Data:**

- `FUNCTION_REGISTRY` - Private map of all functions

**Query Functions:**

- `getFunctionDefinition(functionId)` - Get a single function
- `getAllFunctionDefinitions()` - Get all functions
- `getFunctionsByCategory()` - Get functions grouped by category
- `lookupFunction(functionId)` - Get a function with its field schemas
- `getControlFlowFunctions()` - Get all control flow functions
- `getTerminalFunctions()` - Get all terminal functions
- `isFunctionRegistered(functionId)` - Check if a function exists
- `searchFunctions(query)` - Search functions by label/description
- `cloneDefaultInput(functionId)` - Clone a function's default input

### Usage Examples

#### Getting a function definition

```typescript
import { getFunctionDefinition } from "@/lib/visual-vibes/functions";

const definition = getFunctionDefinition("aiProcessing");
if (definition) {
  console.log(definition.label); // "AI Processing"
  console.log(definition.description);
  console.log(definition.defaultInput);
}
```

#### Getting functions grouped by category

```typescript
import { getFunctionsByCategory } from "@/lib/visual-vibes/functions";

const groups = getFunctionsByCategory();
// Result:
// [
//   { category: "AI", functions: [...] },
//   { category: "Communication", functions: [...] },
//   ...
// ]
```

#### Cloning default input for a new step

```typescript
import { cloneDefaultInput } from "@/lib/visual-vibes/functions";

const input = cloneDefaultInput("apiRequest");
// Returns deep clone of the default input
```

#### Searching functions

```typescript
import { searchFunctions } from "@/lib/visual-vibes/functions";

const results = searchFunctions("email");
// Returns all functions with "email" in label or description
```

#### Getting field schemas for a function

```typescript
import { lookupFunction } from "@/lib/visual-vibes/functions";

const lookup = lookupFunction("apiRequest");
if (lookup) {
  const { definition, fieldSchemas } = lookup;
  // fieldSchemas is Record<string, FieldSchema>
}
```

### Adding New Functions

To add a new function to the registry:

1. **Add the function definition to `registry.ts`** in the appropriate category section:

```typescript
myNewFunction: {
  id: "myNewFunction",
  label: "My New Function",
  category: "AI",
  description: "What this function does",
  defaultInput: {
    // Example values
    key1: "value1",
    key2: ["array", "example"],
  },
  fieldSchemas: ["prompt", "outputType"], // Optional field schema references
  isControlFlow: false, // Optional flags
  isTerminal: false,
},
```

2. **Add field schemas to `fieldSchemas.ts`** if needed:

```typescript
export const FIELD_SCHEMAS: Record<string, FieldSchema> = {
  myCustomField: {
    id: "myCustomField",
    label: "My Custom Field",
    type: "text",
    required: true,
    placeholder: "Enter value",
    helpText: "Help text for users",
  },
  // ...
};
```

3. **Add category if needed** to `categories.ts`:

```typescript
export const FUNCTION_CATEGORIES: Record<string, FunctionCategory> = {
  MyCategory: {
    id: "MyCategory",
    label: "My Category",
    description: "Category description",
  },
  // ...
};
```

### Function Definition Properties

- **id** (required) - Unique identifier (camelCase)
- **label** (required) - Display name for UI
- **description** (required) - Brief explanation
- **category** (required) - Category ID from FUNCTION_CATEGORIES
- **defaultInput** (required) - Example input values
- **fieldSchemas** (optional) - Array of field schema IDs
- **isExperimental** (optional) - Mark as beta/experimental
- **isTerminal** (optional) - Function ends the workflow
- **isControlFlow** (optional) - Function affects flow control

### Field Schema Properties

- **id** (required) - Unique identifier
- **label** (required) - Display name
- **type** (required) - "text" | "email" | "number" | "boolean" | "array" | "object" | "json"
- **required** (optional) - Is this field required?
- **placeholder** (optional) - Input placeholder
- **helpText** (optional) - Detailed help for users
- **defaultValue** (optional) - Default if not provided
- **options** (optional) - For enum-like fields
- **pattern** (optional) - Regex validation for text
- **minValue/maxValue** (optional) - For numbers
- **nestedSchema** (optional) - For nested objects/arrays

### Benefits of This Structure

1. **Single Source of Truth** - All function metadata in one place
2. **Extensible** - Easy to add new functions, categories, and field schemas
3. **Discoverable** - Rich query functions for searching and filtering
4. **Type-Safe** - Full TypeScript support with proper types
5. **Reusable Schemas** - Field schemas can be shared across functions
6. **Semantic Information** - Functions can be tagged with behavioral flags
7. **Backward Compatible** - Existing code continues to work
8. **Maintainable** - Clear separation of concerns across files

### Future Enhancements

Potential improvements to explore:

- Add validation schemas for function inputs
- Add example/test cases for each function
- Add versioning for function definitions
- Add permissions/role-based function availability
- Add function output types and validation
- Add dependency declarations (e.g., "requires database connection")
- Performance metrics or SLA information
- Internationalization support for labels and descriptions
