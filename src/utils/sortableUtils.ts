import Sortable from 'sortablejs';

let sortableInstances: Sortable[] = [];

export const activateSortable = () => {
  // Check if already active
  if (sortableInstances.length > 0) return;
  
  // Detect mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Make courses sortable
  const leftBox = document.querySelector('.left-box') as HTMLElement;
  if (leftBox) {
    const coursesSortable = Sortable.create(leftBox, {
      animation: 150,
      delay: isMobile ? 170 : 5,
      chosenClass: 'sortable-chosen',
      handle: '.dropdown-heading', // Only allow dragging by course header
      onEnd: () => {
        // Update course order in state if needed
        console.log('Course order changed');
      }
    });
    sortableInstances.push(coursesSortable);
  }
  
  // Make teachers within each course sortable
  const dropdownLists = document.querySelectorAll('.dropdown-list') as NodeListOf<HTMLElement>;
  dropdownLists.forEach((dropdownList) => {
    const teachersSortable = Sortable.create(dropdownList, {
      animation: 70,
      delay: isMobile ? 170 : 5,
      chosenClass: 'sortable-chosen',
      onEnd: () => {
        // Update teacher order in state if needed
        console.log('Teacher order changed');
      }
    });
    sortableInstances.push(teachersSortable);
  });
};

export const deactivateSortable = () => {
  // Destroy all sortable instances
  sortableInstances.forEach(instance => {
    instance.destroy();
  });
  sortableInstances = [];
};

export const isSortableActive = () => {
  return sortableInstances.length > 0;
};