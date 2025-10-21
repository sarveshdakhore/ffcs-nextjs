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