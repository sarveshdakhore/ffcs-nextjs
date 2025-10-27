/**
 * Teacher utility functions for parsing and processing teacher data
 */

export interface ParsedTeacherData {
  slots: string;
  venue: string;
  faculty: string;
  ct?: string;
}

/**
 * Parses text input from VTOP course allocation to extract teacher data
 * Each line should contain: slots, venue, faculty, [ct] separated by tabs
 * @param text - Raw text input from VTOP
 * @returns Array of parsed teacher data
 */
export function parseTextToListForMultipleAdd(text: string): ParsedTeacherData[] {
  // Split the input text by new lines
  const lines = text.trim().split('\n');

  // Map each line to an array of values
  const resultList = lines.map((line) => {
    // Split each line by tabs or multiple spaces
    const values = line.split(/\t+/);

    // Ensure each sublist has exactly 4 elements by filling missing values with empty strings
    while (values.length < 4) {
      values.push('');
    }

    return {
      slots: values[0] || '',
      venue: values[1] || '',
      faculty: values[2] || '',
      ct: values[3] || '',
    };
  });

  return resultList;
}

/**
 * Validates if teacher data is complete and valid
 * @param teacherData - Teacher data to validate
 * @returns boolean indicating if data is valid
 */
export function validateTeacherData(teacherData: ParsedTeacherData): boolean {
  return (
    teacherData.faculty.trim() !== '' &&
    teacherData.slots.trim() !== '' &&
    teacherData.venue.trim() !== ''
  );
}

/**
 * Processes teacher name to add evening marker if applicable
 * @param teacherName - Original teacher name
 * @param slots - Slot string to check if it's morning or evening
 * @returns Processed teacher name
 */
export function processTeacherName(teacherName: string, slots: string): string {
  const isMorning = isMorningTheory(slots);
  
  if (!teacherName.endsWith(' (E)')) {
    if (!isMorning) {
      return teacherName + ' (E)';
    }
  }
  
  return teacherName;
}

/**
 * Checks if the given slots represent theory courses
 * @param slots - Slot string to check
 * @returns boolean indicating if it's theory
 */
export function isTheory(slots: string): boolean {
  const slot = slots.split('+')[0];
  return /[A-KM-Z]\d+/.test(slot);
}

/**
 * Checks if the given slots are morning theory slots
 * @param slots - Slot string to check
 * @returns boolean indicating if it's morning theory
 */
export function isMorningTheory(slots: string): boolean {
  let isMTheory: boolean | null = null;
  const slotArray = slots.split('+');
  
  for (let slot of slotArray) {
    slot = slot.trim();
    if (slot.includes('V')) {
      const num = parseInt(slot.slice(1));
      if (num === 1 || num === 2) {
        if (isMTheory === false) {
          return false;
        }
        isMTheory = true;
      }
    } else if (slot.startsWith('L')) {
      const num = parseInt(slot.slice(1));
      if (num >= 1 && num <= 30) {
        if (isMTheory === true) {
          return false;
        }
        isMTheory = false;
      } else {
        if (isMTheory === false) {
          return false;
        }
        isMTheory = true;
      }
    } else if (/[A-ULW-Z]\d+/.test(slot)) {
      // Check if it's a theory slot and ends with '1' (morning theory)
      if (slot.endsWith('1')) {
        if (isMTheory === false) {
          return false;
        }
        isMTheory = true;
      }
    }
  }
  
  return isMTheory === true;
}

/**
 * Checks if the given slots are morning lab slots
 * @param slots - Slot string to check
 * @returns boolean indicating if it's morning lab
 */
export function isMorningLab(slots: string): boolean {
  const slot = slots.split('+')[0];
  if (slot.startsWith('L')) {
    // Check if it's a lab slot and is between L1 and L30 (morning lab)
    return parseInt(slot.slice(1)) <= 30;
  }
  return false;
}

/**
 * Check if two slot arrays match exactly (case-insensitive)
 * @param teacherSlots - Existing teacher's slot array
 * @param inputSlots - New input slot array
 * @returns boolean indicating if slots match exactly
 */
export function doSlotsMatch(teacherSlots: string[], inputSlots: string[]): boolean {
  const lowerCaseInputSlots = inputSlots.map(slot => slot.toLowerCase());
  const lowerCaseTeacherSlots = teacherSlots.map(slot => slot.toLowerCase());
  return lowerCaseInputSlots.every(slot => lowerCaseTeacherSlots.includes(slot));
}

/**
 * Deduplicate slots using Set data structure (from FFCSOnTheGo)
 * Removes duplicate slot entries from a slot string
 * @param slotString - Slot string with potential duplicates (e.g., "A1+B2+A1+L35")
 * @returns Deduplicated slot string (e.g., "A1+B2+L35")
 */
export function slotsProcessingForCourseList(slotString: string): string {
  if (!slotString || slotString.trim() === '') {
    return '';
  }

  // Split by '+', trim each slot, and create a Set to remove duplicates
  const slots = slotString.split('+').map(slot => slot.trim()).filter(slot => slot !== '');
  const uniqueSlots = Array.from(new Set(slots));

  console.log(`   🧹 [DEDUP] Input: "${slotString}" → Output: "${uniqueSlots.join('+')}" (removed ${slots.length - uniqueSlots.length} duplicates)`);

  return uniqueSlots.join('+');
}

/**
 * Validate if slots exist and are in correct format
 * Basic validation - checks if slots match expected patterns
 * @param slotString - Slot string to validate
 * @returns boolean indicating if slots are valid
 */
export function isSlotExist(slotString: string): boolean {
  if (!slotString || slotString.trim() === '') {
    console.log(`   ❌ [VALIDATION] Empty slot string`);
    return false;
  }

  const slots = slotString.split('+').map(slot => slot.trim());

  // Check each slot matches expected patterns
  for (const slot of slots) {
    // Theory slots: A1, B2, V1, etc. (letter + digit)
    // Lab slots: L1, L35, etc. (L + digits)
    const isValidPattern = /^[A-Z]\d+$/.test(slot) || /^[A-Z]{2,}\d+$/.test(slot);

    if (!isValidPattern) {
      console.log(`   ❌ [VALIDATION] Invalid slot pattern: "${slot}"`);
      return false;
    }
  }

  console.log(`   ✅ [VALIDATION] All slots valid: "${slotString}"`);
  return true;
}

/**
 * Get teacher slots from subject data
 * @param courseName - Name of the course
 * @param teacherName - Name of the teacher
 * @param teachers - Teachers object from subject data
 * @returns Slot string or empty string if not found
 */
export function getTeacherSlots(
  courseName: string,
  teacherName: string,
  teachers: { [key: string]: { slots: string; venue: string; color: string } }
): string {
  if (teachers[teacherName]) {
    return teachers[teacherName].slots;
  }
  return '';
}

/**
 * Type for the update callback function
 */
export type UpdateTeacherSlotsCallback = (
  courseName: string,
  teacherName: string,
  newSlots: string
) => void;

/**
 * Smart teacher and slots matching logic from FFCSOnTheGo
 * Handles duplicate detection, theory+lab merging, and unique name generation
 * @param courseName - Name of the course
 * @param teacherName - Name of the teacher
 * @param slotString - Slot string (e.g., "L1+L2")
 * @param teachers - Teachers object from subject data
 * @param updateCallback - Callback to update teacher slots when merging
 * @returns false if duplicate, true if merged, or unique name string
 */
export function checkTeacherAndSlotsMatch(
  courseName: string,
  teacherName: string,
  slotString: string,
  teachers: { [key: string]: { slots: string; venue: string; color: string } },
  updateCallback: UpdateTeacherSlotsCallback
): boolean | string {
  const slots = slotString.split('+');

  /**
   * Recursive unique name generator with slot merge detection
   */
  function generateUniqueNameAndCheckSlots(baseName: string, counter: number = 1): boolean | string {
    const uniqueName = counter === 1 ? baseName : `${baseName} ${counter}`;
    const uniqueNameSlots = teachers[uniqueName]
      ? teachers[uniqueName].slots.split('+')
      : [];

    console.log(`\n┌─────────────────────────────────────────────────────────────┐`);
    console.log(`│ generateUniqueNameAndCheckSlots(${baseName}, ${counter})`);
    console.log(`└─────────────────────────────────────────────────────────────┘`);
    console.log(`   Unique name: "${uniqueName}"`);
    console.log(`   Unique name slots: [${uniqueNameSlots.join(', ')}]`);
    console.log(`   Input slots: [${slots.join(', ')}]`);

    // If slots match exactly, it's a duplicate - skip
    if (doSlotsMatch(uniqueNameSlots, slots)) {
      console.log(`   🔍 Duplicate check: MATCH FOUND`);
      console.log(`   ⏭️  RETURN: false (skip - exact duplicate)`);
      return false;
    }
    console.log(`   🔍 Duplicate check: No match`);

    // If teacher exists, check for slot merging opportunity
    if (teachers.hasOwnProperty(uniqueName)) {
      console.log(`   👤 Teacher exists: YES`);
      const Tslots = getTeacherSlots(courseName, uniqueName, teachers);
      console.log(`   📋 Teacher slots: "${Tslots}"`);

      // Prevent merging theory + lab if theory already has lab
      if (isTheory(Tslots) && Tslots.includes('L')) {
        console.log(`   ⚠️  Theory+Lab already merged - preventing additional merge`);
        console.log(`   🔄 Recursing with counter ${counter + 1}`);
        return generateUniqueNameAndCheckSlots(baseName, counter + 1);
      }

      // MERGE CASE 1: Existing theory + new lab
      if (isTheory(Tslots) && !isTheory(slotString)) {
        console.log(`\n🔍 [MERGE CHECK - CASE 1] Existing: ${Tslots} (theory), New: ${slotString} (lab)`);
        console.log(`   - Existing is theory: ${isTheory(Tslots)}`);
        console.log(`   - New is theory: ${isTheory(slotString)}`);
        console.log(`   - Existing is morning theory: ${isMorningTheory(Tslots)}`);
        console.log(`   - New is morning lab: ${isMorningLab(slotString)}`);

        // Morning theory + Evening lab → merge (OPPOSITE times merge!)
        if (isMorningTheory(Tslots) && !isMorningLab(slotString)) {
          console.log(`   ✅ MERGE CONDITION MET: Morning theory + Evening lab`);
          console.log(`   📝 Merged slots: ${Tslots}+${slotString}`);
          updateCallback(courseName, uniqueName, Tslots + '+' + slotString);
          console.log(`   ✅ RETURN: true (merged successfully)`);
          return true; // Merged successfully
        }
        // Evening theory + Morning lab → merge (OPPOSITE times merge!)
        else if (!isMorningTheory(Tslots) && isMorningLab(slotString)) {
          console.log(`   ✅ MERGE CONDITION MET: Evening theory + Morning lab`);
          console.log(`   📝 Merged slots: ${Tslots}+${slotString}`);
          updateCallback(courseName, uniqueName, Tslots + '+' + slotString);
          console.log(`   ✅ RETURN: true (merged successfully)`);
          return true;
        }
        console.log(`   ❌ NO MERGE: Same time period (both morning or both evening)`);
      }

      // MERGE CASE 2: Existing lab + new theory
      else if (!isTheory(Tslots) && isTheory(slotString)) {
        console.log(`\n🔍 [MERGE CHECK - CASE 2] Existing: ${Tslots} (lab), New: ${slotString} (theory)`);
        console.log(`   - Existing is theory: ${isTheory(Tslots)}`);
        console.log(`   - New is theory: ${isTheory(slotString)}`);
        console.log(`   - Existing is morning lab: ${isMorningLab(Tslots)}`);
        console.log(`   - New is morning theory: ${isMorningTheory(slotString)}`);

        // Evening lab + Morning theory → merge (theory first, OPPOSITE times merge!)
        if (isMorningTheory(slotString) && !isMorningLab(Tslots)) {
          console.log(`   ✅ MERGE CONDITION MET: Morning theory + Evening lab (theory first)`);
          console.log(`   📝 Merged slots: ${slotString}+${Tslots}`);
          updateCallback(courseName, uniqueName, slotString + '+' + Tslots);
          console.log(`   ✅ RETURN: true (merged successfully)`);
          return true;
        }
        // Morning lab + Evening theory → merge (theory first, OPPOSITE times merge!)
        else if (!isMorningTheory(slotString) && isMorningLab(Tslots)) {
          console.log(`   ✅ MERGE CONDITION MET: Evening theory + Morning lab (theory first)`);
          console.log(`   📝 Merged slots: ${slotString}+${Tslots}`);
          updateCallback(courseName, uniqueName, slotString + '+' + Tslots);
          console.log(`   ✅ RETURN: true (merged successfully)`);
          return true;
        }
        console.log(`   ❌ NO MERGE: Same time period (both morning or both evening)`);
      }

      // Name collision but can't merge - try next counter
      console.log(`   🔄 No merge possible - recursing with counter ${counter + 1}`);
      return generateUniqueNameAndCheckSlots(baseName, counter + 1);
    }

    // Truly unique name - use it
    console.log(`   👤 Teacher exists: NO`);
    console.log(`   ✅ RETURN: "${uniqueName}" (truly unique name)`);
    return uniqueName;
  }

  return generateUniqueNameAndCheckSlots(teacherName);
}