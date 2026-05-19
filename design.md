# Component System Rules

This project uses a shared component system.

All UI must reuse existing shared components whenever possible.

Creating duplicate UI components is forbidden.

## Shared Components

### Button

Use:

* components/ui/Button.tsx

Do NOT create:

* PrimaryButton.tsx
* SecondaryButton.tsx
* Custom button implementations

Button styles must be handled via variants.

Example:

* variant="primary"
* variant="secondary"
* variant="ghost"

---

### Input

Use:

* components/ui/Input.tsx

Do NOT create custom text input components unless explicitly required.

---

### Text

Use:

* components/ui/Text.tsx

Typography must follow the existing typography system.

Do not create arbitrary font styles.

---

### Card

Use:

* components/ui/Card.tsx

Do not manually recreate card layouts if Card.tsx can be reused.

---

## Component Rules

* Always reuse existing shared components.
* Preserve component hierarchy.
* Preserve Figma component structure when possible.
* Use variants instead of creating separate files.
* Reuse theme tokens.
* Avoid arbitrary spacing values.
* Avoid inline styles unless necessary.

---

## Design Rules

* Figma is the single source of truth.
* Never redesign UI.
* Never improve layouts.
* Never invent colors.
* Never invent typography.
* Never invent spacing values.
* Never add visual enhancements unless requested.

---

## React Native / Expo Rules

* Use StyleSheet.create.
* Respect platform conventions.
* Avoid web-style UI decisions.
* Reuse existing navigation patterns.
* Reuse existing theme files.

---

## Task Rules

* Only modify files related to the current task.
* Ask questions instead of guessing.
* Prioritize fidelity over creativity.
