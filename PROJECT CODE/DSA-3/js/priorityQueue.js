// Binary Min-Heap Priority Queue for Emergency Triage Optimization
// Demonstrates O(log N) insertion, O(log N) extraction, and O(1) peek
// with customizable tie-breaking and step-by-step algorithmic trace logs.

export class BinaryHeapPriorityQueue {
    /**
     * @param {Function} comparator - Optional custom comparator (a, b) => number.
     * Return < 0 if a has higher priority than b (min-heap default).
     */
    constructor(comparator = null) {
        this.heap = [];
        this.comparator = comparator || this.defaultHospitalComparator;
        this.traceLogs = [];
    }

    /**
     * Standard hospital comparator:
     * 1. Priority 1 (Emergency) < Priority 2 (Urgent) < Priority 3 (Elective)
     * 2. Tie-breaker: Earlier arrival time has higher priority (FIFO for same priority)
     */
    defaultHospitalComparator(a, b) {
        if (a.priority !== b.priority) {
            return a.priority - b.priority; // Smaller number = higher clinical urgency
        }
        const timeA = a.arrivalTime || (a.admitTime ? new Date(a.admitTime).getTime() : 0);
        const timeB = b.arrivalTime || (b.admitTime ? new Date(b.admitTime).getTime() : 0);
        return timeA - timeB; // Earlier arrival has higher priority
    }

    clearLogs() {
        this.traceLogs = [];
    }

    log(message) {
        this.traceLogs.push(message);
    }

    size() {
        return this.heap.length;
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    peek() {
        if (this.isEmpty()) return null;
        return this.heap[0];
    }

    /**
     * Insert a new patient into the Binary Heap
     * Time Complexity: O(log N)
     * Space Complexity: O(1)
     */
    insert(item) {
        // Ensure arrival time exists for tie-breaking
        if (!item.arrivalTime) {
            item.arrivalTime = Date.now();
        }

        this.log(`[HEAP INSERT] Adding patient "${item.patientName}" (Priority ${item.priority}: ${item.priorityLabel || 'Urgent'}) at index ${this.heap.length}.`);
        this.heap.push(item);
        const steps = this.bubbleUp(this.heap.length - 1);
        return {
            insertedIndex: this.heap.indexOf(item),
            steps,
            logs: [...this.traceLogs]
        };
    }

    /**
     * Bubble up (sift up) the element at given index until heap invariant holds
     */
    bubbleUp(index) {
        let currentIdx = index;
        const currentItem = this.heap[currentIdx];
        const swapSteps = [];

        while (currentIdx > 0) {
            const parentIdx = Math.floor((currentIdx - 1) / 2);
            const parentItem = this.heap[parentIdx];

            // If current item has higher priority than parent, swap
            if (this.comparator(currentItem, parentItem) < 0) {
                this.log(` ↳ SWAP: Child [${currentIdx}] "${currentItem.patientName}" (P${currentItem.priority}) higher urgency than Parent [${parentIdx}] "${parentItem.patientName}" (P${parentItem.priority}).`);
                swapSteps.push({
                    type: 'swap',
                    from: currentIdx,
                    to: parentIdx,
                    childName: currentItem.patientName,
                    parentName: parentItem.patientName
                });

                this.heap[currentIdx] = parentItem;
                this.heap[parentIdx] = currentItem;
                currentIdx = parentIdx;
            } else {
                this.log(` ↳ Heap Invariant Satisfied: Child [${currentIdx}] priority <= Parent [${parentIdx}]. No further bubble-up needed.`);
                break;
            }
        }

        return swapSteps;
    }

    /**
     * Extract the highest priority emergency patient (Min-Heap root)
     * Time Complexity: O(log N)
     * Space Complexity: O(1)
     */
    extractMin() {
        if (this.isEmpty()) {
            this.log('[HEAP EXTRACT] Heap is empty. Nothing to extract.');
            return null;
        }

        const minItem = this.heap[0];
        const lastItem = this.heap.pop();
        const swapSteps = [];

        this.log(`[HEAP EXTRACT-MIN] Extracted top emergency patient: "${minItem.patientName}" (P${minItem.priority}: ${minItem.priorityLabel || 'Emergency'}).`);

        if (this.heap.length > 0 && lastItem) {
            this.log(` ↳ Moved last element "${lastItem.patientName}" (P${lastItem.priority}) to Root [0] to restore complete binary tree structure.`);
            this.heap[0] = lastItem;
            const sinkSteps = this.sinkDown(0);
            swapSteps.push(...sinkSteps);
        }

        return {
            extracted: minItem,
            swapSteps,
            remainingSize: this.heap.length,
            logs: [...this.traceLogs]
        };
    }

    /**
     * Sink down (sift down / heapify-down) element at index until heap invariant holds
     */
    sinkDown(index) {
        let currentIdx = index;
        const length = this.heap.length;
        const currentItem = this.heap[currentIdx];
        const swapSteps = [];

        while (true) {
            const leftChildIdx = 2 * currentIdx + 1;
            const rightChildIdx = 2 * currentIdx + 2;
            let smallestIdx = null;

            // Check Left Child
            if (leftChildIdx < length) {
                if (this.comparator(this.heap[leftChildIdx], currentItem) < 0) {
                    smallestIdx = leftChildIdx;
                }
            }

            // Check Right Child
            if (rightChildIdx < length) {
                const targetToCompare = smallestIdx === null ? currentItem : this.heap[leftChildIdx];
                if (this.comparator(this.heap[rightChildIdx], targetToCompare) < 0) {
                    smallestIdx = rightChildIdx;
                }
            }

            // If a child has higher priority, swap with the smaller of the two children
            if (smallestIdx !== null) {
                const childItem = this.heap[smallestIdx];
                this.log(` ↳ SINK DOWN: Parent [${currentIdx}] "${currentItem.patientName}" swapped with higher priority Child [${smallestIdx}] "${childItem.patientName}" (P${childItem.priority}).`);

                swapSteps.push({
                    type: 'swap',
                    from: currentIdx,
                    to: smallestIdx,
                    parentName: currentItem.patientName,
                    childName: childItem.patientName
                });

                this.heap[currentIdx] = childItem;
                this.heap[smallestIdx] = currentItem;
                currentIdx = smallestIdx;
            } else {
                this.log(` ↳ Heap Invariant Satisfied: Element [${currentIdx}] is at or above both children in urgency.`);
                break;
            }
        }

        return swapSteps;
    }

    /**
     * Floyd's Bottom-Up O(N) Build-Heap algorithm
     */
    heapify(items) {
        this.clearLogs();
        this.log(`[HEAPIFY] Initializing bottom-up build-heap for ${items.length} items. Time Complexity: O(N).`);
        this.heap = items.map((item, idx) => ({
            ...item,
            arrivalTime: item.arrivalTime || (Date.now() - (items.length - idx) * 60000)
        }));

        // Start from last non-leaf node: floor((N - 2) / 2)
        const lastNonLeaf = Math.floor((this.heap.length - 2) / 2);
        for (let i = lastNonLeaf; i >= 0; i--) {
            this.log(` ↳ Heapifying subtree rooted at index ${i} ("${this.heap[i].patientName}").`);
            this.sinkDown(i);
        }

        this.log(`✨ Heapify complete. Valid Min-Heap invariant guaranteed.`);
        return this.heap;
    }

    /**
     * Returns level-order array copy of heap (for memory visualizer)
     */
    toArray() {
        return [...this.heap];
    }

    /**
     * Non-destructive heap sort: returns items in strictly sorted priority order
     */
    toSortedArray() {
        const tempHeap = new BinaryHeapPriorityQueue(this.comparator);
        tempHeap.heap = this.heap.map(item => ({ ...item }));
        const sorted = [];
        while (!tempHeap.isEmpty()) {
            const res = tempHeap.extractMin();
            if (res && res.extracted) {
                sorted.push(res.extracted);
            }
        }
        return sorted;
    }

    /**
     * Generate structural node tree representation for visual layout
     */
    getHeapTreeStructure() {
        if (this.isEmpty()) return null;

        const nodes = this.heap.map((item, index) => {
            const parentIdx = index === 0 ? null : Math.floor((index - 1) / 2);
            const leftChildIdx = 2 * index + 1 < this.heap.length ? 2 * index + 1 : null;
            const rightChildIdx = 2 * index + 2 < this.heap.length ? 2 * index + 2 : null;
            const level = Math.floor(Math.log2(index + 1));

            return {
                index,
                item,
                level,
                parentIdx,
                leftChildIdx,
                rightChildIdx
            };
        });

        return nodes;
    }
}
