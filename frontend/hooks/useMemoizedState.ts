import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { safeObjectKeys } from '@/lib/utils';

// Memoize edilmiş state hook'u
export function useMemoizedState<T>(
  initialState: T,
  dependencies: any[] = []
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initialState);
  const prevDeps = useRef(dependencies);

  const memoizedSetState = useCallback((value: T | ((prev: T) => T)) => {
    setState(value);
  }, []);

  // Dependencies değiştiğinde state'i güncelle
  const depsChanged = useMemo(() => {
    if (prevDeps.current.length !== dependencies.length) {
      prevDeps.current = dependencies;
      return true;
    }
    
    for (let i = 0; i < dependencies.length; i++) {
      if (prevDeps.current[i] !== dependencies[i]) {
        prevDeps.current = dependencies;
        return true;
      }
    }
    
    return false;
  }, [dependencies]);

  if (depsChanged) {
    setState(initialState);
  }

  return [state, memoizedSetState];
}

// Optimize edilmiş list state hook'u
export function useOptimizedList<T>(
  initialItems: T[] = [],
  keyExtractor: (item: T) => string | number = (item: any) => item.id
): {
  items: T[];
  addItem: (item: T) => void;
  removeItem: (key: string | number) => void;
  updateItem: (key: string | number, updater: (item: T) => T) => void;
  clearItems: () => void;
  setItems: (items: T[] | ((prev: T[]) => T[])) => void;
} {
  const [items, setItems] = useState<T[]>(initialItems);

  const addItem = useCallback((item: T) => {
    setItems(prev => {
      const key = keyExtractor(item);
      const exists = prev.some(existingItem => keyExtractor(existingItem) === key);
      if (exists) {
        return prev; // Zaten mevcut
      }
      return [...prev, item];
    });
  }, [keyExtractor]);

  const removeItem = useCallback((key: string | number) => {
    setItems(prev => prev.filter(item => keyExtractor(item) !== key));
  }, [keyExtractor]);

  const updateItem = useCallback((key: string | number, updater: (item: T) => T) => {
    setItems(prev => prev.map(item => 
      keyExtractor(item) === key ? updater(item) : item
    ));
  }, [keyExtractor]);

  const clearItems = useCallback(() => {
    setItems([]);
  }, []);

  return {
    items,
    addItem,
    removeItem,
    updateItem,
    clearItems,
    setItems
  };
}

// Optimize edilmiş form state hook'u
export function useOptimizedForm<T extends Record<string, any>>(
  initialValues: T
): {
  values: T;
  setValue: <K extends keyof T>(key: K, value: T[K]) => void;
  setValues: (values: Partial<T>) => void;
  reset: () => void;
  hasChanges: boolean;
  isDirty: boolean;
} {
  const [values, setValues] = useState<T>(initialValues);
  const originalValuesRef = useRef<T>(initialValues);
  const [isDirty, setIsDirty] = useState(false);

  // Update original values when initialValues change
  useEffect(() => {
    originalValuesRef.current = initialValues;
  }, [initialValues]);

  const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => {
      const newValues = { ...prev, [key]: value };
      const hasChanges = safeObjectKeys(newValues).some(k => 
        newValues[k as keyof T] !== originalValuesRef.current[k as keyof T]
      );
      setIsDirty(hasChanges);
      return newValues;
    });
  }, []);

  const setMultipleValues = useCallback((newValues: Partial<T>) => {
    setValues(prev => {
      const updated = { ...prev, ...newValues };
      const hasChanges = safeObjectKeys(updated).some(k => 
        updated[k as keyof T] !== originalValuesRef.current[k as keyof T]
      );
      setIsDirty(hasChanges);
      return updated;
    });
  }, []);

  const reset = useCallback(() => {
    setValues(originalValuesRef.current);
    setIsDirty(false);
  }, []);

  const hasChanges = useMemo(() => {
    return safeObjectKeys(values).some(key => 
      values[key as keyof T] !== originalValuesRef.current[key as keyof T]
    );
  }, [values]);

  return {
    values,
    setValue,
    setValues: setMultipleValues,
    reset,
    hasChanges,
    isDirty
  };
}

// Optimize edilmiş async state hook'u
export function useAsyncState<T>(
  initialState: T,
  asyncUpdater: (current: T) => Promise<T>
): [T, () => Promise<void>, boolean] {
  const [state, setState] = useState<T>(initialState);
  const [loading, setLoading] = useState(false);

  const updateAsync = useCallback(async () => {
    setLoading(true);
    try {
      const newState = await asyncUpdater(state);
      setState(newState);
    } catch (error) {
      console.error('Async state update error:', error);
    } finally {
      setLoading(false);
    }
  }, [state, asyncUpdater]);

  return [state, updateAsync, loading];
}

// Optimize edilmiş counter hook'u
export function useOptimizedCounter(
  initialValue: number = 0,
  min?: number,
  max?: number
): {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  setCount: (value: number) => void;
} {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => {
    setCount(prev => {
      const newValue = prev + 1;
      return max !== undefined ? Math.min(newValue, max) : newValue;
    });
  }, [max]);

  const decrement = useCallback(() => {
    setCount(prev => {
      const newValue = prev - 1;
      return min !== undefined ? Math.max(newValue, min) : newValue;
    });
  }, [min]);

  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  const setCountValue = useCallback((value: number) => {
    let finalValue = value;
    if (min !== undefined) finalValue = Math.max(finalValue, min);
    if (max !== undefined) finalValue = Math.min(finalValue, max);
    setCount(finalValue);
  }, [min, max]);

  return {
    count,
    increment,
    decrement,
    reset,
    setCount: setCountValue
  };
} 