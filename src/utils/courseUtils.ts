/**
 * Course utility functions for parsing and processing bulk course data
 */

export interface ParsedCourseData {
  courseCode: string;
  courseName: string;
  credits: number;
  baseCode: string;  // Without L/P suffix (e.g., BCSE301)
  isTheory: boolean;
  isLab: boolean;
}

/**
 * Parses text input from course curriculum data to extract course information
 * Dynamically detects columns by pattern, not position
 * @param text - Raw text input (tab or space-separated)
 * @returns Array of parsed course data
 */
export function parseCoursesFromText(text: string): ParsedCourseData[] {
  const lines = text.trim().split('\n');
  const courses: ParsedCourseData[] = [];

  for (const line of lines) {
    // Split by tabs OR multiple spaces (2+)
    const columns = line.split(/\t+|\s{2,}/).map(c => c.trim()).filter(c => c);

    if (columns.length < 3) continue; // Need at least: code, name, credits

    // STEP 1: Find Course Code by pattern (e.g., BCSE301L, BMAT202P)
    const courseCodeIndex = columns.findIndex(col => /^[A-Z]{4}\d{3}[LP]$/.test(col));
    if (courseCodeIndex === -1) {
      console.log(`⏭️  Skipping row - no valid course code found:`, line);
      continue;
    }
    const courseCode = columns[courseCodeIndex];

    // STEP 2: Find Course Name (longest text, exclude keywords)
    const keywords = [
      'MANDATORY', 'ELECTIVE', 'SCOPE', 'ACAD', 'SSL',
      'BTECH', 'MTECH', 'MSC', 'ALL', 'DC', 'DE', 'FC',
      'OE', 'PC', 'VI', 'VII', 'VIII', 'IX', 'X',
      'OFFERED', 'BY', 'SEMESTER', 'PROGRAMME', 'BRANCH',
      'YEAR', 'ACADEMIC', 'CATEGORY', 'SNO'
    ];

    let courseNameIndex = -1;
    let courseName = '';
    let maxLength = 0;

    columns.forEach((col, idx) => {
      const upperCol = col.toUpperCase();
      if (
        col.length > 10 &&                          // Reasonable length
        col !== courseCode &&                        // Not the course code itself
        !keywords.includes(upperCol) &&              // Not a keyword
        !/^\d+$/.test(col) &&                        // Not a pure number
        !upperCol.includes('BTECH') &&              // Not program name
        !upperCol.includes('MTECH') &&
        col.length > maxLength                       // Longest so far
      ) {
        courseName = col;
        courseNameIndex = idx;
        maxLength = col.length;
      }
    });

    if (!courseName) {
      console.log(`⏭️  Skipping row - no course name found:`, line);
      continue;
    }

    // STEP 3: Find Credits (to the RIGHT of course name, < 15)
    let credits = 4; // Default credits if not found

    // Get all columns to the right of course name
    const rightColumns = columns.slice(courseNameIndex + 1);

    // Strategy 1: Try to find L-T-P-J-C sequence (5 consecutive numbers)
    let ltpjcFound = false;
    for (let i = 0; i <= rightColumns.length - 5; i++) {
      const slice = rightColumns.slice(i, i + 5);
      if (slice.every(col => /^\d+(\.\d+)?$/.test(col))) {
        const numbers = slice.map(n => parseFloat(n));
        credits = numbers[4]; // C is at index 4 (0=L, 1=T, 2=P, 3=J, 4=C)
        ltpjcFound = true;
        console.log(`   ✅ Found L-T-P-J-C: [${numbers.join(', ')}], Credits = ${credits}`);
        break;
      }
    }

    // Strategy 2: If L-T-P-J-C not found, look for any single number < 15
    if (!ltpjcFound) {
      const validCredits = rightColumns
        .filter(col => /^\d+(\.\d+)?$/.test(col))
        .map(n => parseFloat(n))
        .filter(n => n > 0 && n < 15);

      if (validCredits.length > 0) {
        credits = validCredits[0]; // Take first valid number
        console.log(`   ✅ Found single credit value: ${credits}`);
      } else {
        console.log(`   ⚠️  No credits found, using default: ${credits}`);
      }
    }

    // STEP 4: Determine if theory or lab
    const isTheory = courseCode.endsWith('L');
    const isLab = courseCode.endsWith('P');
    const baseCode = courseCode.slice(0, -1); // Remove L/P suffix

    console.log(`   📚 Parsed: ${courseCode} - ${courseName} (${credits} credits)`);

    courses.push({
      courseCode,
      courseName,
      credits,
      baseCode,
      isTheory,
      isLab
    });
  }

  return courses;
}

/**
 * Groups theory and lab courses together, combining their credits
 * Only returns theory courses with combined credits
 * @param courses - Array of parsed course data
 * @returns Array of grouped course data (theory only with combined credits)
 */
export function groupTheoryAndLab(courses: ParsedCourseData[]): ParsedCourseData[] {
  const grouped = new Map<string, ParsedCourseData>();

  for (const course of courses) {
    // Only add theory courses to the final list
    if (course.isTheory) {
      // Check if corresponding lab course exists
      const labCourse = courses.find(c =>
        c.baseCode === course.baseCode && c.isLab
      );

      // Combine credits: theory + lab (if lab exists)
      const totalCredits = course.credits + (labCourse?.credits || 0);

      console.log(`   🔗 Grouping ${course.baseCode}: Theory(${course.credits}) + Lab(${labCourse?.credits || 0}) = ${totalCredits}`);

      grouped.set(course.baseCode, {
        ...course,
        credits: totalCredits
      });
    }
  }

  return Array.from(grouped.values());
}
