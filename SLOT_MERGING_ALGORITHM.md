# SLOT MERGING ALGORITHM - EXTREME DETAILED DOCUMENTATION

**FFCS Planner - Multiple Teachers Add Feature**

**Author:** System Documentation
**Date:** 2025-10-27
**File Reference:** `src/js/timetable.js`

---

## Table of Contents

1. [Overview](#overview)
2. [Part 1: Slot Type Detection Functions](#part-1-slot-type-detection-functions)
3. [Part 2: Slot Matching Function](#part-2-slot-matching-function)
4. [Part 3: Core Merging Algorithm](#part-3-core-merging-algorithm)
5. [Part 4: Merging Decision Tree](#part-4-merging-decision-tree)
6. [Part 5: Complete Execution Traces](#part-5-complete-execution-traces)
7. [Summary: Merging Algorithm Rules](#summary-merging-algorithm-rules)

---

## Overview

The **Multiple Teachers Add** feature allows users to bulk-import teacher data by copying and pasting from VTOP's Course Registration Allocation page. The system intelligently handles:

- ✅ **Slot merging** for theory + lab combinations
- ✅ **Duplicate detection** to prevent re-adding same slots
- ✅ **Unique name generation** for teachers with same names
- ✅ **Time conflict prevention** (morning vs evening)
- ✅ **Smart slot deduplication** using Set data structure

---

## Part 1: Slot Type Detection Functions

### 1.1 `isTheory(slots)` - Theory Slot Detection

**Location:** `timetable.js:439-445`

**Purpose:** Determines if a slot string represents a theory class.

```javascript
function isTheory(slots) {
    let slot = slots.split('+')[0];  // Take first slot only
    if (slot.match(/[A-KM-Z]\d+/)) {  // Regex pattern matching
        return true;
    }
    return false;
}
```

#### Detailed Breakdown

**Step 1: Extract First Slot**
```javascript
let slot = slots.split('+')[0];
```
- **Input:** `"A1+B2+C1"` → **Output:** `"A1"`
- **Input:** `"L23+L24"` → **Output:** `"L23"`
- **Input:** `"V1"` → **Output:** `"V1"`
- **Reason:** Only checks the first slot to determine type

**Step 2: Regex Pattern Matching**
```javascript
slot.match(/[A-KM-Z]\d+/)
```

**Regex Pattern Explanation:** `/[A-KM-Z]\d+/`
- `[A-KM-Z]`: Character class matching:
  - `A-K`: Letters A through K (includes A,B,C,D,E,F,G,H,I,J,K)
  - `M-Z`: Letters M through Z (includes M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z)
  - **EXCLUDES:** Letter `L` (reserved for lab slots)
- `\d+`: One or more digits (1, 2, 11, 123, etc.)

**Test Cases:**

| Input | First Slot | Regex Match | Result | Reason |
|-------|-----------|-------------|--------|--------|
| `"A1+B2"` | `"A1"` | ✅ Matches | `true` | A is in [A-K], has digit |
| `"V1+V2"` | `"V1"` | ✅ Matches | `true` | V is in [M-Z], has digit |
| `"L23+L24"` | `"L23"` | ❌ No match | `false` | L is excluded from pattern |
| `"B11+A2"` | `"B11"` | ✅ Matches | `true` | B is in [A-K], has digits |
| `"F2"` | `"F2"` | ✅ Matches | `true` | F is theory slot |

**VIT Context:**
- **Theory slots:** A1, A2, B1, B2, C1, C2, D1, D2, E1, E2, F1, F2, G1, G2, V1, V2, etc.
- **Lab slots:** L1-L60 (L is intentionally excluded from regex)

---

### 1.2 `isMorningLab(slots)` - Morning Lab Detection

**Location:** `timetable.js:484-491`

**Purpose:** Determines if a slot is a morning lab (L1-L30).

```javascript
function isMorningLab(slots) {
    let slot = slots.split('+')[0];
    if (slot.startsWith('L')) {
        // Check if it's a lab slot and is between L1 and L30 (morning lab)
        return parseInt(slot.slice(1)) <= 30;
    }
    return false;
}
```

#### Detailed Breakdown

**Step 1: Extract First Slot**
```javascript
let slot = slots.split('+')[0];
```
- Same logic as `isTheory()`

**Step 2: Check if Lab Slot**
```javascript
if (slot.startsWith('L'))
```
- **Checks:** Does the slot begin with letter 'L'?

**Step 3: Extract and Compare Number**
```javascript
return parseInt(slot.slice(1)) <= 30;
```

**String Slicing:** `slot.slice(1)`
- **Input:** `"L15"` → `.slice(1)` → `"15"` → `parseInt()` → `15`
- **Input:** `"L42"` → `.slice(1)` → `"42"` → `parseInt()` → `42`
- **Input:** `"L5"` → `.slice(1)` → `"5"` → `parseInt()` → `5`

**Numerical Comparison:** `<= 30`
- `15 <= 30` → `true` (Morning lab)
- `42 <= 30` → `false` (Evening lab)
- `5 <= 30` → `true` (Morning lab)

**Test Cases:**

| Input | First Slot | Starts with L? | Number | <= 30? | Result |
|-------|-----------|----------------|--------|---------|--------|
| `"L1+L2"` | `"L1"` | ✅ Yes | `1` | ✅ Yes | `true` |
| `"L30"` | `"L30"` | ✅ Yes | `30` | ✅ Yes | `true` |
| `"L31+L32"` | `"L31"` | ✅ Yes | `31` | ❌ No | `false` |
| `"L45"` | `"L45"` | ✅ Yes | `45` | ❌ No | `false` |
| `"A1"` | `"A1"` | ❌ No | - | - | `false` |

**VIT Context:**
- **Morning Labs:** L1 through L30 (typically 8:00 AM - 1:00 PM)
- **Evening Labs:** L31 through L60 (typically 2:00 PM - 7:00 PM)

---

### 1.3 `isMorningTheory(slots)` - Morning Theory Detection

**Location:** `timetable.js:446-483`

**Purpose:** Complex function to determine if theory slots are morning or evening. Returns `true` (morning), `false` (evening), or `null` (conflict/error).

```javascript
function isMorningTheory(slots) {
    let isMTheory = null;  // State variable: null = undetermined
    let slotArray = slots.split('+');

    for (let slot of slotArray) {
        slot = slot.trim();

        // CASE 1: V-slots (Venue slots)
        if (slot.includes('V')) {
            const num = parseInt(slot.slice(1));
            if (num === 1 || num === 2) {  // V1, V2 are morning
                if (isMTheory === false) {
                    return null;  // Conflict: was evening, now morning
                }
                isMTheory = true;
            }
        }

        // CASE 2: L-slots (Lab slots)
        else if (slot.startsWith('L')) {
            const num = parseInt(slot.slice(1));
            if (num >= 1 && num <= 30) {  // Morning lab
                if (isMTheory === true) {
                    return null;  // Conflict: was theory, now lab
                }
                isMTheory = false;
            } else {  // Evening lab (L31+)
                if (isMTheory === false) {
                    return null;  // Conflict: was morning lab, now evening lab
                }
                isMTheory = true;
            }
        }

        // CASE 3: Regular theory slots (A1, B2, etc.)
        else if (slot.match(/[A-ULW-Z]\d+/)) {
            if (slot.endsWith('1')) {  // Ends with '1' = morning
                if (isMTheory === false) {
                    return null;  // Conflict
                }
                isMTheory = true;
            }
        }
    }
    return isMTheory;
}
```

#### Detailed Breakdown

**State Machine Concept:**
```
isMTheory = null   → Undetermined (initial state)
isMTheory = true   → Morning theory detected
isMTheory = false  → Evening/lab detected
return null        → Conflict detected (invalid combination)
```

---

#### CASE 1: V-SLOT PROCESSING

```javascript
if (slot.includes('V')) {
    const num = parseInt(slot.slice(1));
    if (num === 1 || num === 2) {
        if (isMTheory === false) {
            return null;
        }
        isMTheory = true;
    }
}
```

**Step-by-Step Execution:**

**Example Input:** `"V1+V2"`

| Iteration | slot | `slot.includes('V')` | `num` | `num === 1 or 2` | `isMTheory` (before) | `isMTheory === false?` | Action | `isMTheory` (after) |
|-----------|------|---------------------|-------|------------------|---------------------|----------------------|--------|-------------------|
| 1 | `"V1"` | ✅ true | `1` | ✅ true | `null` | ❌ No | Set to `true` | `true` |
| 2 | `"V2"` | ✅ true | `2` | ✅ true | `true` | ❌ No | Keep `true` | `true` |

**Result:** `true` (Morning theory)

---

#### CASE 2: L-SLOT PROCESSING (LAB SLOTS)

```javascript
else if (slot.startsWith('L')) {
    const num = parseInt(slot.slice(1));
    if (num >= 1 && num <= 30) {  // Morning lab
        if (isMTheory === true) {
            return null;  // CONFLICT
        }
        isMTheory = false;
    } else {  // Evening lab
        if (isMTheory === false) {
            return null;  // CONFLICT
        }
        isMTheory = true;
    }
}
```

**Logic Tree:**
```
L-slot detected
    ├─ num 1-30 (Morning Lab)
    │   ├─ If isMTheory == true → CONFLICT (return null)
    │   └─ Else → Set isMTheory = false
    │
    └─ num 31+ (Evening Lab)
        ├─ If isMTheory == false → CONFLICT (return null)
        └─ Else → Set isMTheory = true
```

**Example 1:** `"L15+L16"` (Both morning labs)

| Iteration | slot | `num` | Range | `isMTheory` (before) | Conflict? | Action | `isMTheory` (after) |
|-----------|------|-------|-------|---------------------|-----------|--------|-------------------|
| 1 | `"L15"` | `15` | 1-30 | `null` | ❌ No (`null` ≠ `true`) | Set to `false` | `false` |
| 2 | `"L16"` | `16` | 1-30 | `false` | ❌ No (`false` ≠ `true`) | Keep `false` | `false` |

**Result:** `false` (Evening/Lab slots)

**Example 2:** `"A1+L15"` (Morning theory + Morning lab) - **CONFLICT**

| Iteration | slot | Branch | `isMTheory` (before) | Conflict Check | Result |
|-----------|------|--------|---------------------|----------------|--------|
| 1 | `"A1"` | Theory ends with '1' | `null` | No | Set to `true` |
| 2 | `"L15"` | L-slot, num=15 (1-30) | `true` | `isMTheory === true?` ✅ YES | **return null** |

**Result:** `null` (CONFLICT - Cannot mix morning theory with morning lab)

**Example 3:** `"L15+L35"` (Morning lab + Evening lab) - **CONFLICT**

| Iteration | slot | `num` | Range | `isMTheory` (before) | Conflict Check | Result |
|-----------|------|-------|-------|---------------------|----------------|--------|
| 1 | `"L15"` | `15` | 1-30 | `null` | No | Set to `false` |
| 2 | `"L35"` | `35` | 31+ | `false` | `isMTheory === false?` ✅ YES | **return null** |

**Result:** `null` (CONFLICT - Cannot mix morning and evening labs)

---

#### CASE 3: THEORY SLOT PROCESSING

```javascript
else if (slot.match(/[A-ULW-Z]\d+/)) {
    if (slot.endsWith('1')) {
        if (isMTheory === false) {
            return null;
        }
        isMTheory = true;
    }
}
```

**Pattern:** `/[A-ULW-Z]\d+/` matches theory slots (excluding V which is handled separately)

**Logic:**
- If slot ends with `'1'` → Morning theory
- If slot ends with `'2'` → Evening theory (no action, keeps current state)

**Example 1:** `"A1+B1+C1"` (All morning theory)

| Iteration | slot | Ends with '1'? | `isMTheory` (before) | Conflict? | Action | `isMTheory` (after) |
|-----------|------|----------------|---------------------|-----------|--------|-------------------|
| 1 | `"A1"` | ✅ Yes | `null` | ❌ No | Set to `true` | `true` |
| 2 | `"B1"` | ✅ Yes | `true` | ❌ No | Keep `true` | `true` |
| 3 | `"C1"` | ✅ Yes | `true` | ❌ No | Keep `true` | `true` |

**Result:** `true` (Morning theory)

**Example 2:** `"A1+B2"` (Morning + Evening theory)

| Iteration | slot | Ends with '1'? | `isMTheory` (before) | Action | `isMTheory` (after) |
|-----------|------|----------------|---------------------|--------|-------------------|
| 1 | `"A1"` | ✅ Yes | `null` | Set to `true` | `true` |
| 2 | `"B2"` | ❌ No | `true` | No change | `true` |

**Result:** `true` (Considered morning because A1 is morning)

---

#### Comprehensive Test Matrix

| Input | Processing | Final `isMTheory` | Return Value | Interpretation |
|-------|------------|------------------|--------------|----------------|
| `"A1"` | Theory ends with 1 | `true` | `true` | Morning theory |
| `"A2+B2"` | Theory ends with 2 (no action) | `null` | `null` | Undetermined |
| `"V1+V2"` | V1, V2 detected | `true` | `true` | Morning theory |
| `"L15+L16"` | Morning labs | `false` | `false` | Lab/Evening |
| `"L35+L36"` | Evening labs | `true` | `true` | Evening |
| `"A1+L15"` | Morning theory + morning lab | Conflict | `null` | INVALID |
| `"A2+L35"` | Evening theory + evening lab | Mixed | varies | Complex |
| `"L15+L35"` | Morning + evening lab | Conflict | `null` | INVALID |

---

## Part 2: Slot Matching Function

### 2.1 `doSlotsMatch(teacherSlots, inputSlots)` - Exact Duplicate Detection

**Location:** Inside `checkTeacherAndSlotsMatch()` (Line 343-353)

```javascript
function doSlotsMatch(teacherSlots, inputSlots) {
    const lowerCaseInputSlots = inputSlots.map((slot) =>
        slot.toLowerCase(),
    );
    const lowerCaseTeacherSlots = teacherSlots.map((slot) =>
        slot.toLowerCase(),
    );
    return lowerCaseInputSlots.every((slot) =>
        lowerCaseTeacherSlots.includes(slot),
    );
}
```

#### Detailed Breakdown

**Step 1: Convert to Lowercase**
```javascript
const lowerCaseInputSlots = inputSlots.map((slot) => slot.toLowerCase());
const lowerCaseTeacherSlots = teacherSlots.map((slot) => slot.toLowerCase());
```

**Example:**
```javascript
teacherSlots = ['A1', 'B2', 'C1']
inputSlots = ['a1', 'b2', 'c1']

lowerCaseTeacherSlots = ['a1', 'b2', 'c1']
lowerCaseInputSlots = ['a1', 'b2', 'c1']
```

**Step 2: Check if Every Input Slot Exists in Teacher Slots**
```javascript
return lowerCaseInputSlots.every((slot) =>
    lowerCaseTeacherSlots.includes(slot),
);
```

**`Array.every()` Method:**
- Returns `true` if callback returns `true` for **ALL** elements
- Returns `false` if **ANY** element fails the test

**Test Cases:**

**Case 1: Exact Match**
```javascript
teacherSlots = ['A1', 'B2']
inputSlots = ['A1', 'B2']

// Processing:
lowerCaseTeacherSlots = ['a1', 'b2']
lowerCaseInputSlots = ['a1', 'b2']

// Check:
'a1' ∈ ['a1', 'b2'] → ✅ true
'b2' ∈ ['a1', 'b2'] → ✅ true

// Result: true (DUPLICATE DETECTED)
```

**Case 2: Partial Match (Subset)**
```javascript
teacherSlots = ['A1', 'B2', 'C1']
inputSlots = ['A1', 'B2']

// Processing:
lowerCaseTeacherSlots = ['a1', 'b2', 'c1']
lowerCaseInputSlots = ['a1', 'b2']

// Check:
'a1' ∈ ['a1', 'b2', 'c1'] → ✅ true
'b2' ∈ ['a1', 'b2', 'c1'] → ✅ true

// Result: true (INPUT IS SUBSET - CONSIDERED DUPLICATE)
```

**Case 3: No Match**
```javascript
teacherSlots = ['A1', 'B2']
inputSlots = ['C1', 'D2']

// Processing:
lowerCaseTeacherSlots = ['a1', 'b2']
lowerCaseInputSlots = ['c1', 'd2']

// Check:
'c1' ∈ ['a1', 'b2'] → ❌ false (STOPS HERE)

// Result: false (NOT A DUPLICATE)
```

**Case 4: Superset (Input has more slots)**
```javascript
teacherSlots = ['A1']
inputSlots = ['A1', 'B2']

// Processing:
lowerCaseTeacherSlots = ['a1']
lowerCaseInputSlots = ['a1', 'b2']

// Check:
'a1' ∈ ['a1'] → ✅ true
'b2' ∈ ['a1'] → ❌ false

// Result: false (NOT A DUPLICATE)
```

**IMPORTANT NOTE:** This function checks if **all input slots** exist in teacher slots, meaning:
- `inputSlots ⊆ teacherSlots` → `true`
- Otherwise → `false`

---

## Part 3: Core Merging Algorithm

### 3.1 `checkTeacherAndSlotsMatch()` - Main Orchestrator

**Location:** `timetable.js:337-438`

**Function Signature:**
```javascript
function checkTeacherAndSlotsMatch(courseName, teacherName, slotString)
```

**Parameters:**
- `courseName`: e.g., `"CSE2001"` (course code)
- `teacherName`: e.g., `"Dr. Smith"` (faculty name)
- `slotString`: e.g., `"A1+B2"` (slot combination)

**Return Values:**
- `false`: Duplicate detected (skip adding)
- `true`: Slots merged with existing teacher
- `string`: Unique name to use (e.g., `"Dr. Smith 2"`)

---

#### Initialization Phase

```javascript
let slots = slotString.split('+');
const teachers = timetableStoragePref[window.activeTable.id].subject[courseName].teacher;
```

**Example Data Structure:**
```javascript
// Before execution:
teachers = {
    "Dr. Smith": {
        slots: "A1+B2",
        venue: "SMV-101",
        color: "#d6ffd6"
    },
    "Dr. Jones": {
        slots: "C1+D1",
        venue: "SMV-102",
        color: "#ffe487"
    }
}

// Input:
courseName = "CSE2001"
teacherName = "Dr. Smith"
slotString = "L15+L16"

// After split:
slots = ["L15", "L16"]
```

---

#### Initial Duplicate Check

```javascript
if (doSlotsMatch(
    teachers[teacherName] ? teachers[teacherName].slots.split('+') : [],
    slots,
)) {
    return false;  // Exact duplicate, skip
} else {
    return generateUniqueNameAndCheckSlots(teacherName);
}
```

**Execution Trace:**

**Scenario 1: Exact Duplicate**
```javascript
// Existing teacher:
teachers["Dr. Smith"].slots = "A1+B2"

// Trying to add:
teacherName = "Dr. Smith"
slotString = "A1+B2"

// Check:
teacherSlots = ["A1", "B2"]
inputSlots = ["A1", "B2"]
doSlotsMatch(["A1", "B2"], ["A1", "B2"]) → true

// Return: false (SKIP ADDING)
```

**Scenario 2: New Slots**
```javascript
// Existing teacher:
teachers["Dr. Smith"].slots = "A1+B2"

// Trying to add:
teacherName = "Dr. Smith"
slotString = "L15+L16"

// Check:
teacherSlots = ["A1", "B2"]
inputSlots = ["L15", "L16"]
doSlotsMatch(["A1", "B2"], ["L15", "L16"]) → false

// Action: Call generateUniqueNameAndCheckSlots("Dr. Smith")
```

---

### 3.2 `generateUniqueNameAndCheckSlots()` - Recursive Name Generator

**Function Signature** (nested inside `checkTeacherAndSlotsMatch`):
```javascript
function generateUniqueNameAndCheckSlots(baseName, counter = 1)
```

**Parameters:**
- `baseName`: Original teacher name
- `counter`: Numeric suffix (starts at 1)

**Generated Names:**
- `counter = 1`: `"Dr. Smith"` (no suffix)
- `counter = 2`: `"Dr. Smith 2"`
- `counter = 3`: `"Dr. Smith 3"`
- And so on...

---

#### PHASE 1: NAME GENERATION

```javascript
let uniqueName = counter === 1 ? baseName : `${baseName} ${counter}`;
console.log('Unique name:', uniqueName);
```

**Examples:**
```javascript
baseName = "Dr. Smith", counter = 1 → uniqueName = "Dr. Smith"
baseName = "Dr. Smith", counter = 2 → uniqueName = "Dr. Smith 2"
baseName = "Dr. Smith", counter = 3 → uniqueName = "Dr. Smith 3"
```

---

#### PHASE 2: GET EXISTING SLOTS

```javascript
const uniqueNameSlots = teachers[uniqueName]
    ? teachers[uniqueName].slots.split('+')
    : [];
console.log('Unique name slots:', uniqueNameSlots);
```

**Example:**
```javascript
// If "Dr. Smith" exists with slots "A1+B2":
uniqueName = "Dr. Smith"
uniqueNameSlots = ["A1", "B2"]

// If "Dr. Smith 2" doesn't exist:
uniqueName = "Dr. Smith 2"
uniqueNameSlots = []  // Empty array
```

---

#### PHASE 3: EXACT DUPLICATE CHECK

```javascript
if (doSlotsMatch(uniqueNameSlots, slots)) {
    return false;  // Exact duplicate
}
```

**Example:**
```javascript
// Trying to add:
slots = ["A1", "B2"]

// Existing "Dr. Smith" has:
uniqueNameSlots = ["A1", "B2"]

// Check:
doSlotsMatch(["A1", "B2"], ["A1", "B2"]) → true

// Return: false (SKIP - DUPLICATE)
```

---

#### PHASE 4: TEACHER EXISTS CHECK

```javascript
else if (teachers.hasOwnProperty(uniqueName)) {
    // Teacher exists, check for merging opportunities
    let Tslots = getTeacherSlots(courseName, uniqueName);

    // ... merging logic (explained in detail below)
}
```

**If teacher exists:** Check if slots can be merged (theory + lab combination)

---

#### PHASE 5: THEORY+LAB ALREADY MERGED CHECK

```javascript
if(isTheory(Tslots) && Tslots.includes('L')){
    console.log('Theory and Lab slots are not allowed to merge', uniqueName, baseName, Tslots, slotString);
    return generateUniqueNameAndCheckSlots(baseName, counter+1);
}
```

**Purpose:** Prevent adding more slots to a teacher who already has theory+lab combination.

**Example:**
```javascript
// Existing teacher:
teachers["Dr. Smith"].slots = "A1+L15"  // Already has theory + lab

// Trying to add:
slotString = "B2"  // Another theory slot

// Check:
Tslots = "A1+L15"
isTheory("A1+L15") → true (first slot is A1)
"A1+L15".includes('L') → true

// Action: Recurse with counter+1
return generateUniqueNameAndCheckSlots("Dr. Smith", 2)
// Will try "Dr. Smith 2"
```

---

#### PHASE 6: NULL SLOTS CHECK

```javascript
if (Tslots === null) {
    return false;
}
```

**Purpose:** Safety check if `getTeacherSlots()` fails.

---

## Part 4: Merging Decision Tree

### The Complete Merge Decision Logic

```javascript
// BRANCH 1: Existing Theory + New Lab
if (isTheory(Tslots) && !isTheory(slotString)) {
    // Morning theory + Non-morning-lab
    if (isMorningTheory(Tslots) && !isMorningLab(slotString)) {
        updateTeacherSlots(courseName, uniqueName, Tslots + '+' + slotString);
        return true;
    }
    // Non-morning theory + Morning lab
    else if (!isMorningTheory(Tslots) && isMorningLab(slotString)) {
        updateTeacherSlots(courseName, uniqueName, Tslots + '+' + slotString);
        return true;
    }
}

// BRANCH 2: Existing Lab + New Theory
else if (!isTheory(Tslots) && isTheory(slotString)) {
    // Morning theory + Non-morning-lab
    if (isMorningTheory(slotString) && !isMorningLab(Tslots)) {
        updateTeacherSlots(courseName, uniqueName, slotString + '+' + Tslots);
        return true;
    }
    // Non-morning theory + Morning lab
    else if (!isMorningTheory(slotString) && isMorningLab(Tslots)) {
        updateTeacherSlots(courseName, uniqueName, slotString + '+' + Tslots);
        return true;
    }
}
```

---

### Merge Decision Matrix

| Existing Slots (Tslots) | New Slots (slotString) | Condition Check | Action | Reason |
|-------------------------|------------------------|-----------------|--------|--------|
| **A1** (Morning Theory) | **L35** (Evening Lab) | `isMorningTheory(A1)==true` && `!isMorningLab(L35)` | ✅ MERGE → `"A1+L35"` | Morning theory + Evening lab OK |
| **A2** (Evening Theory) | **L15** (Morning Lab) | `!isMorningTheory(A2)` && `isMorningLab(L15)` | ✅ MERGE → `"A2+L15"` | Evening theory + Morning lab OK |
| **A1** (Morning Theory) | **L15** (Morning Lab) | `isMorningTheory(A1)==true` && `isMorningLab(L15)` | ❌ NO MERGE | Both morning - conflict |
| **A2** (Evening Theory) | **L35** (Evening Lab) | `!isMorningTheory(A2)` && `!isMorningLab(L35)` | ❌ NO MERGE | Both evening - conflict |
| **L35** (Evening Lab) | **A1** (Morning Theory) | `isMorningTheory(A1)==true` && `!isMorningLab(L35)` | ✅ MERGE → `"A1+L35"` | Reversed: still OK |
| **L15** (Morning Lab) | **A2** (Evening Theory) | `!isMorningTheory(A2)` && `isMorningLab(L15)` | ✅ MERGE → `"A2+L15"` | Reversed: still OK |

---

### BRANCH 1 Detailed Trace: Existing Theory + New Lab

```javascript
if (isTheory(Tslots) && !isTheory(slotString)) {
    if (isMorningTheory(Tslots) && !isMorningLab(slotString)) {
        updateTeacherSlots(courseName, uniqueName, Tslots + '+' + slotString);
        return true;
    }
    else if (!isMorningTheory(Tslots) && isMorningLab(slotString)) {
        updateTeacherSlots(courseName, uniqueName, Tslots + '+' + slotString);
        return true;
    }
}
```

**SCENARIO 1: Morning Theory + Evening Lab** ✅ MERGE

```javascript
// Existing:
Tslots = "A1+B1+C1"  // Morning theory

// New:
slotString = "L35+L36"  // Evening lab

// Check 1: Is existing theory?
isTheory("A1+B1+C1") → true (A1 matches /[A-KM-Z]\d+/)

// Check 2: Is new theory?
!isTheory("L35+L36") → true (L35 doesn't match)

// Enter BRANCH 1
// Check 3: Is existing morning theory?
isMorningTheory("A1+B1+C1") → true (slots end with 1)

// Check 4: Is new morning lab?
!isMorningLab("L35+L36") → true (35 > 30)

// CONDITIONS MET! Execute merge:
updateTeacherSlots(
    "CSE2001",
    "Dr. Smith",
    "A1+B1+C1" + '+' + "L35+L36"  // = "A1+B1+C1+L35+L36"
);

// Return: true (MERGED SUCCESSFULLY)
```

**SCENARIO 2: Evening Theory + Morning Lab** ✅ MERGE

```javascript
// Existing:
Tslots = "A2+B2"  // Evening theory

// New:
slotString = "L15+L16"  // Morning lab

// Check 1: Is existing theory?
isTheory("A2+B2") → true

// Check 2: Is new theory?
!isTheory("L15+L16") → true

// Enter BRANCH 1
// Check 3: Is existing morning theory?
isMorningTheory("A2+B2") → false (slots end with 2, not 1)

// First IF fails, try ELSE IF:
// Check 4: Is existing NOT morning theory?
!isMorningTheory("A2+B2") → true

// Check 5: Is new morning lab?
isMorningLab("L15+L16") → true (15 <= 30)

// CONDITIONS MET! Execute merge:
updateTeacherSlots(
    "CSE2001",
    "Dr. Smith",
    "A2+B2" + '+' + "L15+L16"  // = "A2+B2+L15+L16"
);

// Return: true (MERGED SUCCESSFULLY)
```

**SCENARIO 3: Morning Theory + Morning Lab** ❌ NO MERGE

```javascript
// Existing:
Tslots = "A1+B1"  // Morning theory

// New:
slotString = "L15+L16"  // Morning lab

// Check 1: Is existing theory?
isTheory("A1+B1") → true

// Check 2: Is new theory?
!isTheory("L15+L16") → true

// Enter BRANCH 1
// Check 3: Is existing morning theory?
isMorningTheory("A1+B1") → true

// Check 4: Is new morning lab?
!isMorningLab("L15+L16") → false (15 <= 30, so IS morning lab)

// First IF fails
// Check 5: Is existing NOT morning theory?
!isMorningTheory("A1+B1") → false

// ELSE IF fails

// Exit BRANCH 1, no merge happened
// Continue to recursion:
return generateUniqueNameAndCheckSlots("Dr. Smith", counter + 1);
// Will try "Dr. Smith 2"
```

---

### BRANCH 2 Detailed Trace: Existing Lab + New Theory

```javascript
else if (!isTheory(Tslots) && isTheory(slotString)) {
    if (isMorningTheory(slotString) && !isMorningLab(Tslots)) {
        updateTeacherSlots(courseName, uniqueName, slotString + '+' + Tslots);
        return true;
    }
    else if (!isMorningTheory(slotString) && isMorningLab(Tslots)) {
        updateTeacherSlots(courseName, uniqueName, slotString + '+' + Tslots);
        return true;
    }
}
```

**SCENARIO 1: Existing Evening Lab + New Morning Theory** ✅ MERGE

```javascript
// Existing:
Tslots = "L35+L36"  // Evening lab

// New:
slotString = "A1+B1"  // Morning theory

// Check 1: Is existing theory?
!isTheory("L35+L36") → true (L is not in theory pattern)

// Check 2: Is new theory?
isTheory("A1+B1") → true

// Enter BRANCH 2
// Check 3: Is new morning theory?
isMorningTheory("A1+B1") → true

// Check 4: Is existing morning lab?
!isMorningLab("L35+L36") → true (35 > 30, NOT morning lab)

// CONDITIONS MET! Execute merge:
// NOTE: Theory slots come FIRST
updateTeacherSlots(
    "CSE2001",
    "Dr. Smith",
    "A1+B1" + '+' + "L35+L36"  // = "A1+B1+L35+L36"
);

// Return: true (MERGED SUCCESSFULLY)
```

**SCENARIO 2: Existing Morning Lab + New Evening Theory** ✅ MERGE

```javascript
// Existing:
Tslots = "L15+L16"  // Morning lab

// New:
slotString = "A2+B2"  // Evening theory

// Check 1: Is existing theory?
!isTheory("L15+L16") → true

// Check 2: Is new theory?
isTheory("A2+B2") → true

// Enter BRANCH 2
// Check 3: Is new morning theory?
isMorningTheory("A2+B2") → false (ends with 2)

// First IF fails, try ELSE IF:
// Check 4: Is new NOT morning theory?
!isMorningTheory("A2+B2") → true

// Check 5: Is existing morning lab?
isMorningLab("L15+L16") → true (15 <= 30)

// CONDITIONS MET! Execute merge:
updateTeacherSlots(
    "CSE2001",
    "Dr. Smith",
    "A2+B2" + '+' + "L15+L16"  // = "A2+B2+L15+L16"
);

// Return: true (MERGED SUCCESSFULLY)
```

---

#### PHASE 7: NO MERGE - RECURSE

```javascript
// If no merge happened, try next counter
return generateUniqueNameAndCheckSlots(baseName, counter + 1);
```

**Example Flow:**
```javascript
// Call 1:
generateUniqueNameAndCheckSlots("Dr. Smith", 1)
→ uniqueName = "Dr. Smith" (exists, no merge) → recurse

// Call 2:
generateUniqueNameAndCheckSlots("Dr. Smith", 2)
→ uniqueName = "Dr. Smith 2" (exists, no merge) → recurse

// Call 3:
generateUniqueNameAndCheckSlots("Dr. Smith", 3)
→ uniqueName = "Dr. Smith 3" (doesn't exist) → return "Dr. Smith 3"
```

---

#### PHASE 8: TRULY UNIQUE NAME

```javascript
else {
    // If the unique name is truly unique and slots don't match, return the unique name
    return uniqueName;
}
```

**Example:**
```javascript
// If "Dr. Smith 3" doesn't exist in teachers object:
uniqueName = "Dr. Smith 3"
teachers.hasOwnProperty("Dr. Smith 3") → false

// Return: "Dr. Smith 3"
// Caller will create new teacher with this name
```

---

## Part 5: Complete Execution Traces

### 🎬 EXECUTION TRACE 1: Morning Theory + Evening Lab Merge

**Initial State:**
```javascript
teachers = {
    "Dr. Smith": {
        slots: "A1+B1+C1",  // Morning theory
        venue: "SMV-101",
        color: "#d6ffd6"
    }
}
```

**New Addition:**
```javascript
courseName = "CSE2001"
teacherName = "Dr. Smith"
slotString = "L35+L36"  // Evening lab
```

**Step-by-Step Execution:**

```javascript
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: checkTeacherAndSlotsMatch("CSE2001", "Dr. Smith", "L35+L36") │
└─────────────────────────────────────────────────────────────┘

// Initialization
slots = ["L35", "L36"]
teachers = { "Dr. Smith": {...} }

// Initial duplicate check
teacherSlots = ["A1", "B1", "C1"]
inputSlots = ["L35", "L36"]
doSlotsMatch(["A1", "B1", "C1"], ["L35", "L36"]) → false

// Not a duplicate, proceed to generate unique name
↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: generateUniqueNameAndCheckSlots("Dr. Smith", 1)    │
└─────────────────────────────────────────────────────────────┘

// Generate name
counter = 1
uniqueName = "Dr. Smith"  // (counter === 1, so no suffix)

// Get existing slots
uniqueNameSlots = ["A1", "B1", "C1"]

// Check duplicate
doSlotsMatch(["A1", "B1", "C1"], ["L35", "L36"]) → false

// Teacher exists?
teachers.hasOwnProperty("Dr. Smith") → true

// Get teacher slots
Tslots = "A1+B1+C1"

// Theory+Lab already merged?
isTheory("A1+B1+C1") → true
"A1+B1+C1".includes('L') → false  // No 'L' present
// Check fails, continue

// Check if slots are null
Tslots === null → false

// BRANCH 1: Existing Theory + New Lab?
isTheory("A1+B1+C1") → true ✅
!isTheory("L35+L36") → true ✅

// Condition 1: Morning theory + Non-morning lab?
isMorningTheory("A1+B1+C1") → true ✅
!isMorningLab("L35+L36") → true ✅  (35 > 30)

// ALL CONDITIONS MET! MERGE!
↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: updateTeacherSlots("CSE2001", "Dr. Smith", "A1+B1+C1+L35+L36") │
└─────────────────────────────────────────────────────────────┘

newSlots = "A1+B1+C1+L35+L36"
newSlots = newSlots.trim().toUpperCase()  // Already uppercase

// Remove duplicates
slotsProcessingForCourseList("A1+B1+C1+L35+L36")
→ ["A1", "B1", "C1", "L35", "L36"]  // No duplicates
→ Join: "A1+B1+C1+L35+L36"

// Validate slots exist
isSlotExist("A1+B1+C1+L35+L36") → true

// Update in storage
timetableStoragePref[0].subject["CSE2001"].teacher["Dr. Smith"].slots = "A1+B1+C1+L35+L36"

// Return true
↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Return to generateUniqueNameAndCheckSlots          │
└─────────────────────────────────────────────────────────────┘

return true  // Merge successful
↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Return to checkTeacherAndSlotsMatch                │
└─────────────────────────────────────────────────────────────┘

return true  // Propagate success
↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Return to addTeacher()                             │
└─────────────────────────────────────────────────────────────┘

uniqueName = true
if (uniqueName == true) {
    return true;  // Don't add new teacher, slots were merged
}

// Result: No new teacher created, existing teacher updated
```

**Final State:**
```javascript
teachers = {
    "Dr. Smith": {
        slots: "A1+B1+C1+L35+L36",  // ✅ MERGED!
        venue: "SMV-101",
        color: "#d6ffd6"
    }
}
```

---

### 🎬 EXECUTION TRACE 2: Name Collision - Create "Dr. Smith 2"

**Initial State:**
```javascript
teachers = {
    "Dr. Smith": {
        slots: "A1+B1",  // Morning theory
        venue: "SMV-101",
        color: "#d6ffd6"
    }
}
```

**New Addition:**
```javascript
courseName = "CSE2001"
teacherName = "Dr. Smith"
slotString = "L15+L16"  // Morning lab (CONFLICT - cannot merge with morning theory)
```

**Step-by-Step Execution:**

```javascript
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: checkTeacherAndSlotsMatch("CSE2001", "Dr. Smith", "L15+L16") │
└─────────────────────────────────────────────────────────────┘

slots = ["L15", "L16"]

// Initial duplicate check
doSlotsMatch(["A1", "B1"], ["L15", "L16"]) → false

// Proceed to unique name generation
↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: generateUniqueNameAndCheckSlots("Dr. Smith", 1)    │
└─────────────────────────────────────────────────────────────┘

counter = 1
uniqueName = "Dr. Smith"

// Get existing slots
uniqueNameSlots = ["A1", "B1"]

// Check duplicate
doSlotsMatch(["A1", "B1"], ["L15", "L16"]) → false

// Teacher exists?
teachers.hasOwnProperty("Dr. Smith") → true

// Get slots
Tslots = "A1+B1"

// Theory+Lab already merged?
isTheory("A1+B1") → true
"A1+B1".includes('L') → false
// Not merged yet

// BRANCH 1: Existing Theory + New Lab?
isTheory("A1+B1") → true ✅
!isTheory("L15+L16") → true ✅

// Condition 1: Morning theory + Non-morning lab?
isMorningTheory("A1+B1") → true
!isMorningLab("L15+L16") → false ❌  (15 <= 30, IS morning lab)

// First condition fails

// Condition 2: Non-morning theory + Morning lab?
!isMorningTheory("A1+B1") → false ❌

// Second condition fails

// BRANCH 2: Existing Lab + New Theory?
!isTheory("A1+B1") → false ❌

// No merge possible, recurse
↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: generateUniqueNameAndCheckSlots("Dr. Smith", 2)    │
└─────────────────────────────────────────────────────────────┘

counter = 2
uniqueName = "Dr. Smith 2"  // (counter !== 1, add suffix)

// Get existing slots
teachers["Dr. Smith 2"] → undefined
uniqueNameSlots = []  // Empty array

// Check duplicate
doSlotsMatch([], ["L15", "L16"]) → false

// Teacher exists?
teachers.hasOwnProperty("Dr. Smith 2") → false ❌

// Enter else block (truly unique name)
return "Dr. Smith 2"
↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Return to checkTeacherAndSlotsMatch                │
└─────────────────────────────────────────────────────────────┘

return "Dr. Smith 2"
↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Return to addTeacher()                             │
└─────────────────────────────────────────────────────────────┘

uniqueName = "Dr. Smith 2"

if (uniqueName == false) {
    // No
} else if (uniqueName == true) {
    // No
} else if (uniqueName) {  // String is truthy
    teacherName = "Dr. Smith 2"  // Update teacher name

    // Add new teacher to storage
    timetableStoragePref[0].subject["CSE2001"].teacher["Dr. Smith 2"] = {
        slots: "L15+L16",
        venue: "SMV-102",
        color: "#d6ffd6"
    };

    // Create UI list item
    const li = createTeacherLI({
        courseName: "CSE2001",
        slots: "L15+L16",
        venue: "SMV-102",
        color: "#d6ffd6",
        teacherName: "Dr. Smith 2"
    });

    // Append to UI
    // ... UI update code ...

    return true;
}
```

**Final State:**
```javascript
teachers = {
    "Dr. Smith": {
        slots: "A1+B1",  // Original unchanged
        venue: "SMV-101",
        color: "#d6ffd6"
    },
    "Dr. Smith 2": {  // ✅ NEW TEACHER CREATED!
        slots: "L15+L16",
        venue: "SMV-102",
        color: "#d6ffd6"
    }
}
```

---

### 🎬 EXECUTION TRACE 3: Exact Duplicate - Skip

**Initial State:**
```javascript
teachers = {
    "Dr. Jones": {
        slots: "A1+B2+C1",
        venue: "SMV-202",
        color: "#ffe487"
    }
}
```

**New Addition (duplicate):**
```javascript
courseName = "CSE2001"
teacherName = "Dr. Jones"
slotString = "A1+B2+C1"  // Exact same slots
```

**Step-by-Step Execution:**

```javascript
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: checkTeacherAndSlotsMatch("CSE2001", "Dr. Jones", "A1+B2+C1") │
└─────────────────────────────────────────────────────────────┘

slots = ["A1", "B2", "C1"]

// Initial duplicate check
teachers["Dr. Jones"].slots = "A1+B2+C1"
teacherSlots = ["A1", "B2", "C1"]

doSlotsMatch(["A1", "B2", "C1"], ["A1", "B2", "C1"])
↓
// Processing inside doSlotsMatch:
lowerCaseTeacherSlots = ["a1", "b2", "c1"]
lowerCaseInputSlots = ["a1", "b2", "c1"]

// Check every input slot exists in teacher slots:
"a1" ∈ ["a1", "b2", "c1"] → true ✅
"b2" ∈ ["a1", "b2", "c1"] → true ✅
"c1" ∈ ["a1", "b2", "c1"] → true ✅

// All checks pass
return true  // DUPLICATE DETECTED!
↓

// Back in checkTeacherAndSlotsMatch
if (doSlotsMatch(...)) {  // true
    return false;  // SKIP ADDING
}
↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Return to addTeacher()                             │
└─────────────────────────────────────────────────────────────┘

uniqueName = false

if (uniqueName == false) {
    return false;  // Skip adding the teacher
}

// Function exits, no teacher added
```

**Final State:**
```javascript
teachers = {
    "Dr. Jones": {
        slots: "A1+B2+C1",  // ✅ UNCHANGED (duplicate prevented)
        venue: "SMV-202",
        color: "#ffe487"
    }
}
```

---

### 🎬 EXECUTION TRACE 4: Complex - Already Merged Theory+Lab

**Initial State:**
```javascript
teachers = {
    "Dr. Wilson": {
        slots: "A1+B1+L35+L36",  // Already has theory + lab!
        venue: "SMV-303",
        color: "#ffcdcd"
    }
}
```

**New Addition:**
```javascript
courseName = "CSE2001"
teacherName = "Dr. Wilson"
slotString = "C1+D1"  // New theory slots
```

**Step-by-Step Execution:**

```javascript
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: checkTeacherAndSlotsMatch("CSE2001", "Dr. Wilson", "C1+D1") │
└─────────────────────────────────────────────────────────────┘

slots = ["C1", "D1"]

// Initial duplicate check
teacherSlots = ["A1", "B1", "L35", "L36"]
doSlotsMatch(["A1", "B1", "L35", "L36"], ["C1", "D1"]) → false

// Proceed to unique name generation
↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: generateUniqueNameAndCheckSlots("Dr. Wilson", 1)   │
└─────────────────────────────────────────────────────────────┘

counter = 1
uniqueName = "Dr. Wilson"

// Get existing slots
uniqueNameSlots = ["A1", "B1", "L35", "L36"]

// Check duplicate
doSlotsMatch(["A1", "B1", "L35", "L36"], ["C1", "D1"]) → false

// Teacher exists?
teachers.hasOwnProperty("Dr. Wilson") → true

// Get slots
Tslots = "A1+B1+L35+L36"

// ⚠️ CRITICAL CHECK: Theory+Lab already merged?
isTheory("A1+B1+L35+L36") → true  (first slot A1 is theory)
"A1+B1+L35+L36".includes('L') → true ✅  (has L35, L36)

// CONDITION MET! Cannot add more slots to already-merged teacher
console.log('Theory and Lab slots are not allowed to merge',
            "Dr. Wilson", "Dr. Wilson", "A1+B1+L35+L36", "C1+D1");

// Recurse with next counter
return generateUniqueNameAndCheckSlots("Dr. Wilson", 2);
↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: generateUniqueNameAndCheckSlots("Dr. Wilson", 2)   │
└─────────────────────────────────────────────────────────────┘

counter = 2
uniqueName = "Dr. Wilson 2"

// Get existing slots
teachers["Dr. Wilson 2"] → undefined
uniqueNameSlots = []

// Check duplicate
doSlotsMatch([], ["C1", "D1"]) → false

// Teacher exists?
teachers.hasOwnProperty("Dr. Wilson 2") → false

// Truly unique name!
return "Dr. Wilson 2"
↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Create new teacher "Dr. Wilson 2"                  │
└─────────────────────────────────────────────────────────────┘

timetableStoragePref[0].subject["CSE2001"].teacher["Dr. Wilson 2"] = {
    slots: "C1+D1",
    venue: venue,
    color: color
};
```

**Final State:**
```javascript
teachers = {
    "Dr. Wilson": {
        slots: "A1+B1+L35+L36",  // Original preserved
        venue: "SMV-303",
        color: "#ffcdcd"
    },
    "Dr. Wilson 2": {  // ✅ NEW TEACHER CREATED!
        slots: "C1+D1",
        venue: "SMV-304",
        color: "#d6ffd6"
    }
}
```

---

### 🎬 EXECUTION TRACE 5: Reverse Merge (Lab exists, add Theory)

**Initial State:**
```javascript
teachers = {
    "Dr. Brown": {
        slots: "L35+L36",  // Evening lab only
        venue: "SMV-Lab-1",
        color: "#d6ffd6"
    }
}
```

**New Addition:**
```javascript
courseName = "CSE2001"
teacherName = "Dr. Brown"
slotString = "A1+B1"  // Morning theory
```

**Step-by-Step Execution:**

```javascript
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: checkTeacherAndSlotsMatch("CSE2001", "Dr. Brown", "A1+B1") │
└─────────────────────────────────────────────────────────────┘

slots = ["A1", "B1"]

// Initial duplicate check
doSlotsMatch(["L35", "L36"], ["A1", "B1"]) → false

↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: generateUniqueNameAndCheckSlots("Dr. Brown", 1)    │
└─────────────────────────────────────────────────────────────┘

uniqueName = "Dr. Brown"
uniqueNameSlots = ["L35", "L36"]

// Check duplicate
doSlotsMatch(["L35", "L36"], ["A1", "B1"]) → false

// Teacher exists
Tslots = "L35+L36"

// Theory+Lab already merged?
isTheory("L35+L36") → false  (L is not theory)
// Check fails (as expected)

// BRANCH 1: Existing Theory + New Lab?
isTheory("L35+L36") → false ❌
// Branch 1 fails

// BRANCH 2: Existing Lab + New Theory? ✅
!isTheory("L35+L36") → true ✅
isTheory("A1+B1") → true ✅

// Enter BRANCH 2!

// Condition 1: Morning theory + Non-morning lab?
isMorningTheory("A1+B1") → true ✅
!isMorningLab("L35+L36") → true ✅  (35 > 30)

// ALL CONDITIONS MET! MERGE!
// ⚠️ NOTE: Theory slots come FIRST in merge order!
updateTeacherSlots(
    "CSE2001",
    "Dr. Brown",
    "A1+B1" + '+' + "L35+L36"  // Theory first, then lab!
);
↓

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: updateTeacherSlots("CSE2001", "Dr. Brown", "A1+B1+L35+L36") │
└─────────────────────────────────────────────────────────────┘

newSlots = "A1+B1+L35+L36"

// Process and validate
slotsProcessingForCourseList("A1+B1+L35+L36")
→ ["A1", "B1", "L35", "L36"]
→ Join: "A1+B1+L35+L36"

// Update storage
timetableStoragePref[0].subject["CSE2001"].teacher["Dr. Brown"].slots = "A1+B1+L35+L36"

return true
↓

return true  // Merge successful
```

**Final State:**
```javascript
teachers = {
    "Dr. Brown": {
        slots: "A1+B1+L35+L36",  // ✅ MERGED! (Theory + Lab)
        venue: "SMV-Lab-1",
        color: "#d6ffd6"
    }
}
```

---

## Summary: Merging Algorithm Rules

### ✅ MERGE CONDITIONS (Will Combine)

| Scenario | Existing | New | Result | Merge Order |
|----------|----------|-----|--------|-------------|
| 1 | Morning Theory (A1) | Evening Lab (L35) | ✅ MERGE | `A1+L35` |
| 2 | Evening Theory (A2) | Morning Lab (L15) | ✅ MERGE | `A2+L15` |
| 3 | Evening Lab (L35) | Morning Theory (A1) | ✅ MERGE | `A1+L35` (theory first) |
| 4 | Morning Lab (L15) | Evening Theory (A2) | ✅ MERGE | `A2+L15` (theory first) |

### ❌ NO MERGE CONDITIONS (Create Separate Teacher)

| Scenario | Existing | New | Result | Reason |
|----------|----------|-----|--------|--------|
| 1 | Morning Theory (A1) | Morning Lab (L15) | ❌ Separate | Time conflict |
| 2 | Evening Theory (A2) | Evening Lab (L35) | ❌ Separate | Time conflict |
| 3 | Theory+Lab (A1+L35) | Any slots | ❌ Separate | Already merged |
| 4 | Theory (A1) | Theory (C1) | ❌ Separate | Both theory |
| 5 | Lab (L15) | Lab (L20) | ❌ Separate | Both lab |
| 6 | Exact duplicate | Same slots | ❌ Skip | Duplicate |

### 🔢 UNIQUE NAME GENERATION

```
1st attempt: "Dr. Smith"     → If exists and can't merge → Try next
2nd attempt: "Dr. Smith 2"   → If exists and can't merge → Try next
3rd attempt: "Dr. Smith 3"   → If exists and can't merge → Try next
...
Nth attempt: "Dr. Smith N"   → If doesn't exist → Use this name
```

### ⏰ TIME-BASED SLOT CLASSIFICATION

| Slot Type | Morning | Evening |
|-----------|---------|---------|
| **Theory** | A1, B1, C1, D1, E1, F1, G1, V1, V2 | A2, B2, C2, D2, E2, F2, G2 |
| **Lab** | L1 - L30 | L31 - L60 |

### 🎯 KEY ALGORITHM INSIGHTS

1. **Slot deduplication**: Uses `Set` to remove duplicate slots before storing
2. **Case-insensitive matching**: Converts to lowercase for comparison
3. **Theory-first ordering**: When merging lab→theory, theory slots come first
4. **Recursive name generation**: Keeps trying until unique name found
5. **Fail-safe prevention**: Blocks adding to already-merged theory+lab combinations
6. **Time-based logic**: Morning/Evening classification prevents scheduling conflicts

This algorithm ensures students can't accidentally create impossible timetables while allowing legitimate theory+lab combinations for the same teacher!

---

## Function Reference Quick Guide

| Function | Location | Purpose |
|----------|----------|---------|
| `isTheory(slots)` | 439-445 | Detect if slot is theory (A1, B2, V1, etc.) |
| `isMorningLab(slots)` | 484-491 | Detect if slot is morning lab (L1-L30) |
| `isMorningTheory(slots)` | 446-483 | Detect if theory slot is morning/evening |
| `doSlotsMatch()` | 343-353 | Check if slots are duplicates |
| `checkTeacherAndSlotsMatch()` | 337-438 | Main orchestrator for merging logic |
| `generateUniqueNameAndCheckSlots()` | 356-423 | Recursive unique name generator |
| `updateTeacherSlots()` | 655-671 | Update slots for existing teacher |
| `slotsProcessingForCourseList()` | 1018-1035 | Deduplicate slots using Set |
| `addTeacher()` | 492-589 | Add individual teacher to course |
| `addMultipleTeacher()` | 590-623 | Bulk add teachers from textarea |
| `parseTextToListForMultipleAdd()` | 318-336 | Parse tab-separated VTOP data |

---

**End of Documentation**
