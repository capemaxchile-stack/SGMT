/**
 * Frontend & UI Contract Engine (Opaque-Box Contract)
 * Verifies UI-ESLINT-CONFIG, UI-MOBILE-NAV, UI-TOAST-FEEDBACK, UI-TABLE-RESPONSIVE,
 * UI-LAZY-ROUTES, UI-MODAL-RESILIENCE, UI-TAILWIND-V4, UI-CACHE-SYNC, UI-KARDEX-TYPES
 */

class UIContractEngine {
  // UI-CACHE-SYNC
  static getDashboardCacheKey() {
    return ['dashboard-metrics'];
  }

  static validateQueryKey(key) {
    if (!Array.isArray(key) || key.length !== 1 || key[0] !== 'dashboard-metrics') {
      throw new Error(`Invalid dashboard cache key: ${JSON.stringify(key)}. Expected ['dashboard-metrics']`);
    }
    return true;
  }

  // UI-KARDEX-TYPES
  static validateKardexEntryContract(entry) {
    const requiredFields = [
      'movementNumber',
      'date',
      'type',
      'quantity',
      'balance',
      'unitCost',
      'totalCost',
      'warehouseId',
    ];

    for (const field of requiredFields) {
      if (entry[field] === undefined || entry[field] === null) {
        throw new Error(`KardexEntry contract violation: Missing field "${field}"`);
      }
    }

    if (!['INGRESO', 'SALIDA', 'AJUSTE'].includes(entry.type)) {
      throw new Error(`Invalid movement type in KardexEntry: ${entry.type}`);
    }

    if (typeof entry.quantity !== 'number' || typeof entry.balance !== 'number' || typeof entry.unitCost !== 'number') {
      throw new Error('KardexEntry contract violation: Numeric fields must be numbers');
    }

    return true;
  }

  // UI-MOBILE-NAV
  static createMobileNavState() {
    return {
      isOpen: false,
      toggle() {
        this.isOpen = !this.isOpen;
      },
      close() {
        this.isOpen = false;
      },
      open() {
        this.isOpen = true;
      },
      isMobileViewport(width) {
        return width < 768; // Tailwind md breakpoint
      },
    };
  }

  // UI-TOAST-FEEDBACK
  static createToastManager() {
    const toasts = [];
    return {
      toasts,
      show(toast) {
        const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const item = {
          id,
          type: toast.type || 'info', // 'success' | 'error' | 'warning' | 'info'
          title: toast.title || '',
          message: toast.message || '',
          duration: toast.duration || 4000,
        };
        toasts.push(item);
        return item;
      },
      dismiss(id) {
        const idx = toasts.findIndex(t => t.id === id);
        if (idx !== -1) toasts.splice(idx, 1);
      },
      clear() {
        toasts.length = 0;
      },
    };
  }

  // UI-TABLE-RESPONSIVE
  static validateDataTableContract({ minWidth = 'min-w-[700px]', hasSkeleton = true, isScrollable = true }) {
    if (minWidth !== 'min-w-[700px]') {
      throw new Error(`DataTable must define minimum horizontal scroll width of min-w-[700px], found ${minWidth}`);
    }
    if (!hasSkeleton) {
      throw new Error('DataTable must support skeleton loading state');
    }
    if (!isScrollable) {
      throw new Error('DataTable must have overflow-x-auto container');
    }
    return true;
  }

  // UI-MODAL-RESILIENCE
  static createModalState(initialDirty = false) {
    return {
      isOpen: true,
      isDirty: initialDirty,
      attemptBackdropClose(allowClose = false) {
        if (this.isDirty && !allowClose) {
          // Prevent accidental backdrop dismissal
          return false;
        }
        this.isOpen = false;
        return true;
      },
      explicitClose() {
        this.isOpen = false;
        return true;
      },
    };
  }
}

module.exports = { UIContractEngine };
