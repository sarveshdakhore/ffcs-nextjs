// Timetable helper functions from vanilla JS

import { CourseData, SubjectData } from '@/context/FFCSContext';
import { clashMap, slotsExistInNonLectureFormat } from '@/constants/timetableConstants';

// Process raw course name
export function processRawCourseName(courseInput: string): string {
  try {
    courseInput = courseInput.trim();
    courseInput = trimSign(courseInput, '-');
    var courseListStr = courseInput.split('-');
    let courseName = '';
    for (let i = 0; i < courseListStr.length; i++) {
      if (courseListStr[i].trim() === '') {
        courseListStr.splice(i, 1);
      }
    }
    if (courseListStr.length > 1 && courseListStr[0] !== '') {
      var part2 = '';
      for (var i = 1; i < courseListStr.length; i++) {
        if (courseListStr[i].trim() !== '') {
          part2 += '-' + courseListStr[i].trim();
        }
      }
      courseName = courseListStr[0].trim() + part2;
    } else {
      courseName = courseListStr[0].trim();
    }
    if (courseName) {
      courseName = trimSign(courseName, '-');
      courseName = courseName.replace(/\s+/g, ' ');
      return courseName;
    }
    return '';
  } catch (error) {
    return '';
  }
}

// Trim sign from start and end
export function trimSign(slotString: string, sign: string): string {
  while (slotString.startsWith(sign)) {
    slotString = slotString.slice(1);
  }
  while (slotString.endsWith(sign)) {
    slotString = slotString.slice(0, -1);
  }
  return slotString;
}

// Clean slot string
export function cleanSlotString(slotString: string): string {
  // Remove consecutive plus signs
  var cleanedSlotString = slotString.replace(/\++/g, '+');
  // Remove spaces
  cleanedSlotString = cleanedSlotString.replace(/\s/g, '');
  return cleanedSlotString;
}

// Remove duplicate slots
export function removeDuplicateSlots(slotString: string): string {
  // Split the string into an array
  slotString = slotString.toUpperCase();
  slotString = trimSign(slotString, '+');
  slotString = cleanSlotString(slotString);
  var slotsArray = slotString.split('+');

  // Create a new array to store unique slots
  var uniqueSlotsArray: string[] = [];

  // Iterate over the original array
  slotsArray.forEach(function (slot) {
    // If the slot is not already in the uniqueSlotsArray, add it
    if (!uniqueSlotsArray.includes(slot)) {
      uniqueSlotsArray.push(slot);
    }
  });

  // Join the array back into a string
  var uniqueSlotString = uniqueSlotsArray.join('+');

  return uniqueSlotString;
}

// Remove dots live
export function removeDotsLive(inputValue: string): string {
  let cleanedValue = inputValue.replace(/\./g, '');
  cleanedValue = cleanedValue.replace(/\--/g, '-');
  cleanedValue = cleanedValue.replace(/\  /g, ' ');
  cleanedValue = cleanedValue.replace(/[^a-zA-Z0-9+ \-()]/g, '');
  return cleanedValue;
}

// Remove slot special characters live
export function removeSlotSplCharLive(inputValue: string): string {
  let cleanedValue = inputValue.replace(/\./g, '');
  cleanedValue = cleanedValue.replace(/[^a-zA-Z0-9+-]/g, '');
  return cleanedValue;
}

// Parse credit value
export function parseCreditValue(input: string | number): number {
  let number = parseFloat(String(input));
  if (!isNaN(number)) {
    if (number % 1 !== 0) {
      // Check if it's a float
      return Number(number.toFixed(1));
    }
    return parseInt(String(number), 10); // It's an integer
  }
  return 0;
}

// Get course code and course title
export function getCourseCodeAndCourseTitle(courseName: string): [string, string] {
  var courseNameParts = courseName.split('-');
  if (courseNameParts.length > 1) {
    var courseCode = courseNameParts[0].trim();
    var part2 = '';
    for (var i = 1; i < courseNameParts.length; i++) {
      part2 += courseNameParts[i].trim() + '-';
    }
    var courseTitle = part2.slice(0, -1);
  } else {
    var courseTitle = courseNameParts[0].trim();
    var courseCode = '';
  }
  return [courseCode, courseTitle];
}

// Get course name from course data
export function getCourseNameFromCourseData(courseData: CourseData): string {
  var courseName = '';
  if (courseData.courseCode === '') {
    courseName = courseData.courseTitle;
  } else {
    courseName = courseData.courseCode + '-' + courseData.courseTitle;
  }
  return courseName;
}

// Check if slot exists
export function isSlotExist(slotsArray: string | string[]): boolean {
  // if slotsArray is string convert it to array
  if (typeof slotsArray === 'string') {
    slotsArray = slotsProcessingForCourseList(slotsArray);
  }
  var result = true;
  slotsArray.forEach((slot) => {
    if (!slotsExistInNonLectureFormat.has(slot)) {
      result = false;
    }
  });
  return result;
}

// Slots processing for course list
export function slotsProcessingForCourseList(slotString: string): string[] {
  var slots = (function () {
    var set = new Set<string>();

    try {
      slotString.split(/\s*\+\s*/).forEach(function (el) {
        if (el && slotsExistInNonLectureFormat.has(el)) {
          set.add(el);
        }
      });
    } catch (error) {
      set.clear();
    }

    return Array.from(set);
  })();
  return slots;
}

// Update slots using clashMap
export function updateSlots(slots: string[]): string[] {
  var allSlots = slots;
  var thSlots: string[] = [];
  var labSlots: string[] = [];
  allSlots.forEach((slot) => {
    if (clashMap[slot]) {
      if (slot.includes('L')) {
        labSlots.push(slot);
      } else {
        thSlots.push(slot);
      }
      for (var i = 0; i < clashMap[slot].length; i++) {
        if (clashMap[slot][i].includes('L')) {
          labSlots.push(clashMap[slot][i]);
        } else {
          thSlots.push(clashMap[slot][i]);
        }
      }
    }
  });
  return thSlots.concat(labSlots);
}

// Check if there's a common slot between two arrays
export function isCommonSlot(arr1: string[], arr2: string[]): boolean {
  var result = false;
  arr1.forEach((el) => {
    if (arr2.includes(el)) {
      result = true;
    }
  });
  return result;
}

// Subtract array1 from array2 (Array2 - Array1)
export function subtractArray(arr1: string[], arr2: string[]): string[] {
  const result = [...arr2]; // Create a copy to avoid mutating original
  arr1.forEach((el) => {
    const index = result.indexOf(el);
    if (index !== -1) {
      result.splice(index, 1); // Remove first occurrence
    }
  });
  return result;
}

// Check if slot is theory
export function isTheory(slots: string): boolean {
  let slot = slots.split('+')[0];
  if (slot.match(/[A-KM-Z]\d+/)) {
    return true;
  }
  return false;
}

// Check if morning theory
export function isMorningTheory(slots: string): boolean | null {
  let isMTheory: boolean | null = null;
  let slotArray = slots.split('+');
  for (let slot of slotArray) {
    slot = slot.trim();
    if (slot.includes('V')) {
      const num = parseInt(slot.slice(1));
      if (num === 1 || num === 2) {
        if (isMTheory === false) {
          return null;
        }
        isMTheory = true;
      }
    } else if (slot.startsWith('L')) {
      const num = parseInt(slot.slice(1));
      if (num >= 1 && num <= 30) {
        if (isMTheory === true) {
          return null;
        }
        isMTheory = false;
      } else {
        if (isMTheory === false) {
          return null;
        }
        isMTheory = true;
      }
    } else if (slot.match(/[A-ULW-Z]\d+/)) {
      // Check if it's a theory slot and ends with '1' (morning theory)
      if (slot.endsWith('1')) {
        if (isMTheory === false) {
          return null;
        }
        isMTheory = true;
      }
    }
  }
  return isMTheory;
}

// Check if morning lab
export function isMorningLab(slots: string): boolean {
  let slot = slots.split('+')[0];
  if (slot.startsWith('L')) {
    // Check if it's a lab slot and is between L1 and L30 (morning lab)
    return parseInt(slot.slice(1)) <= 30;
  }
  return false;
}

// Get credits from course name (from subject data)
export function getCreditsFromCourseName(courseName: string, subjects: any): number {
  return subjects[courseName]?.credits || 0;
}

// Check if two slot arrays match
export function doSlotsMatch(slots1: string[], slots2: string[]): boolean {
  if (slots1.length !== slots2.length) return false;
  
  const sorted1 = [...slots1].sort();
  const sorted2 = [...slots2].sort();
  
  return sorted1.every((slot, index) => slot === sorted2[index]);
}

// Remove course from course list (helper for course removal)
export function courseRemove(courseName: string, data: any[]): any[] {
  return data.filter(course => {
    const courseFullName = course.courseCode ? 
      `${course.courseCode}-${course.courseTitle}` : 
      course.courseTitle;
    return courseFullName.toLowerCase() !== courseName.toLowerCase();
  });
}

// Get slots from all selected courses (like vanilla JS getSlots())
export function getSlots(data: any[]): string[] {
  const slots: string[] = [];
  data.forEach(course => {
    course.slots.forEach((slot: string) => {
      if (slot !== '' && slot !== 'SLOTS') {
        slots.push(slot);
      }
    });
  });
  return updateSlots(slots);
}

// Get slots for a specific course from SELECTED courses (like vanilla JS getSlotsOfCourse())
export function getSlotsOfCourse(courseName: string, data: any[]): string[] {
  const slots: string[] = [];
  data.forEach(course => {
    const courseFullName = course.courseCode ? 
      `${course.courseCode}-${course.courseTitle}` : 
      course.courseTitle;
    
    if (courseFullName.toLowerCase() === courseName.toLowerCase()) {
      course.slots.forEach((slot: string) => {
        if (slot !== '' && slot !== 'SLOTS' && !slots.includes(slot)) {
          slots.push(slot);
        }
      });
    }
  });
  return updateSlots(slots);
}

// Get slots for a specific course from SELECTED courses in attack mode (like vanilla JS getCourseSlotsAttack())
export function getCourseSlotsAttack(courseName: string, attackData: any[]): string[] {
  const slots: string[] = [];
  attackData.forEach(course => {
    const courseFullName = course.courseCode ? 
      `${course.courseCode}-${course.courseTitle}` : 
      course.courseTitle;
    
    if (courseFullName.toLowerCase() === courseName.toLowerCase()) {
      course.slots.forEach((slot: string) => {
        if (!slots.includes(slot)) {
          slots.push(slot);
        }
      });
    }
  });
  return updateSlots(slots);
}

// Get slots from all selected attack data (like vanilla JS slotsForAttack())
export function slotsForAttack(attackData: any[]): string[] {
  const slots: string[] = [];
  attackData.forEach(course => {
    slots.push(...course.slots);
  });
  return updateSlots(slots);
}