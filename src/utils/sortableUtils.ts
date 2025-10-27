import Sortable from 'sortablejs';

let courseSortableInstance: Sortable | null = null;
let teacherSortableInstances: Sortable[] = [];

type DispatchFunction = (action: any) => void;
let dispatchRef: DispatchFunction | null = null;

export const setDispatch = (dispatch: DispatchFunction) => {
  dispatchRef = dispatch;
};

// Activate ONLY course reordering (for Course Edit mode)
export const activateCoursesSortable = () => {
  // Deactivate any existing course sortable
  if (courseSortableInstance) {
    courseSortableInstance.destroy();
    courseSortableInstance = null;
  }

  // Detect mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Make courses sortable
  const leftBox = document.querySelector('.left-box') as HTMLElement;
  if (leftBox) {
    courseSortableInstance = Sortable.create(leftBox, {
      animation: 0,
      delay: isMobile ? 170 : 0,
      delayOnTouchOnly: true,
      chosenClass: 'sortable-chosen',
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      handle: '.dropdown-heading', // Only allow dragging by course header
      forceFallback: true, // Force HTML5 fallback for better control
      scroll: true, // Enable auto-scroll during drag
      scrollSensitivity: 100, // Pixel distance from edge to start scrolling
      scrollSpeed: 10, // Scroll speed
      bubbleScroll: true, // Enable scroll on nested containers
      onEnd: (evt) => {
        // Remove any lingering classes from the dragged item
        if (evt.item) {
          evt.item.classList.remove('sortable-chosen', 'sortable-ghost', 'sortable-drag');
        }

        // Clean up any lingering sortable classes from all items
        const allItems = leftBox.querySelectorAll('.dropdown-teacher');
        allItems.forEach(item => {
          item.classList.remove('sortable-chosen', 'sortable-ghost', 'sortable-drag');
        });

        // Get the new order of courses from DOM
        const courseElements = leftBox.querySelectorAll('.dropdown-teacher');
        const courseNames: string[] = [];

        courseElements.forEach((element) => {
          const heading = element.querySelector('.dropdown-heading');
          if (heading) {
            const courseNameSpan = heading.querySelector('.cname');
            if (courseNameSpan) {
              const courseName = courseNameSpan.textContent?.trim();
              if (courseName) {
                courseNames.push(courseName);
              }
            }
          }
        });

        // Dispatch the new order to update state
        if (dispatchRef && courseNames.length > 0) {
          console.log('Course order changed:', courseNames);
          dispatchRef({
            type: 'REORDER_COURSES',
            payload: { courseNames }
          });
          // Note: Sortable will be reinitialized by useEffect in CoursePanel
        }
      }
    });
  }
};

// Activate ONLY teacher priority reordering (for Teacher Edit mode)
export const activateTeachersSortable = () => {
  // Deactivate any existing teacher sortables
  teacherSortableInstances.forEach(instance => instance.destroy());
  teacherSortableInstances = [];

  // Detect mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Make teachers within each course sortable
  const dropdownLists = document.querySelectorAll('.dropdown-list') as NodeListOf<HTMLElement>;
  dropdownLists.forEach((dropdownList) => {
    const teachersSortable = Sortable.create(dropdownList, {
      animation: 0,
      delay: isMobile ? 170 : 0,
      delayOnTouchOnly: true,
      chosenClass: 'sortable-chosen',
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      forceFallback: true,
      scroll: true, // Enable auto-scroll during drag
      scrollSensitivity: 100, // Pixel distance from edge to start scrolling
      scrollSpeed: 10, // Scroll speed
      bubbleScroll: true, // Enable scroll on nested containers
      onEnd: (evt) => {
        // Remove any lingering classes from the dragged item
        if (evt.item) {
          evt.item.classList.remove('sortable-chosen', 'sortable-ghost', 'sortable-drag');
        }

        // Clean up any lingering sortable classes from all items in this list
        const allItems = dropdownList.querySelectorAll('.dropdown-item');
        allItems.forEach(item => {
          item.classList.remove('sortable-chosen', 'sortable-ghost', 'sortable-drag');
        });

        // Update teacher order in state if needed
        console.log('Teacher order changed');
      }
    });
    teacherSortableInstances.push(teachersSortable);
  });
};

// Legacy function - activates both courses and teachers (kept for backward compatibility)
export const activateSortable = () => {
  activateCoursesSortable();
  activateTeachersSortable();
};

export const deactivateSortable = () => {
  // Destroy course sortable
  if (courseSortableInstance) {
    courseSortableInstance.destroy();
    courseSortableInstance = null;
  }

  // Destroy all teacher sortables
  teacherSortableInstances.forEach(instance => {
    instance.destroy();
  });
  teacherSortableInstances = [];
};

export const isSortableActive = () => {
  return courseSortableInstance !== null || teacherSortableInstances.length > 0;
};