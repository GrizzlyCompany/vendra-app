import {
  isString,
  isNumber,
  isObject,
  isArray,
  isValidUrl,
  isValidEmail,
  isValidUUID,
  safeGet,
  safeArray,
  safeString,
  safeNumber,
  safeBoolean,
  safeJsonParse,
  safeJsonStringify,
  safeFilter,
  safeMap,
  safeFind,
  safeDateParse,
  safeFormatDate,
  withErrorBoundary,
  assertIsString,
  assertIsNumber,
  assertIsObject,
  assertIsArray
} from '../safe';

describe('Type Guards', () => {
  describe('isString', () => {
    it('should return true for strings', () => {
      expect(isString('hello')).toBe(true);
      expect(isString('')).toBe(true);
    });

    it('should return false for non-strings', () => {
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString([])).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('should return true for valid numbers', () => {
      expect(isNumber(123)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-123)).toBe(true);
      expect(isNumber(123.45)).toBe(true);
    });

    it('should return false for invalid numbers', () => {
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber(Infinity)).toBe(false);
      expect(isNumber('123')).toBe(false);
      expect(isNumber(null)).toBe(false);
    });
  });

  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
    });

    it('should return false for non-objects', () => {
      expect(isObject(null)).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject([])).toBe(false);
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
    });
  });

  describe('isArray', () => {
    it('should return true for arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
    });

    it('should return false for non-arrays', () => {
      expect(isArray({})).toBe(false);
      expect(isArray('string')).toBe(false);
      expect(isArray(null)).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(null)).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID(null)).toBe(false);
    });
  });
});

describe('Safe Accessors', () => {
  describe('safeGet', () => {
    const obj = { a: { b: { c: 'value' } } };

    it('should return nested value', () => {
      expect(safeGet(obj, 'a.b.c', 'default')).toBe('value');
    });

    it('should return default value for missing path', () => {
      expect(safeGet(obj, 'a.b.d', 'default')).toBe('default');
    });

    it('should return default value for invalid object', () => {
      expect(safeGet(null, 'a.b.c', 'default')).toBe('default');
    });
  });

  describe('safeArray', () => {
    it('should return array if valid', () => {
      expect(safeArray([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('should return default value for invalid input', () => {
      expect(safeArray('not-array', [])).toEqual([]);
    });
  });

  describe('safeString', () => {
    it('should return string if valid', () => {
      expect(safeString('hello')).toBe('hello');
    });

    it('should return default value for invalid input', () => {
      expect(safeString(123, 'default')).toBe('default');
    });
  });

  describe('safeNumber', () => {
    it('should return number if valid', () => {
      expect(safeNumber(123)).toBe(123);
    });

    it('should return default value for invalid input', () => {
      expect(safeNumber('not-number', 42)).toBe(42);
    });
  });

  describe('safeBoolean', () => {
    it('should return boolean if valid', () => {
      expect(safeBoolean(true)).toBe(true);
      expect(safeBoolean(false)).toBe(false);
    });

    it('should return default value for invalid input', () => {
      expect(safeBoolean('not-boolean', true)).toBe(true);
    });
  });
});

describe('JSON Operations', () => {
  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      expect(safeJsonParse('{"key": "value"}', {})).toEqual({ key: 'value' });
    });

    it('should return default value for invalid JSON', () => {
      expect(safeJsonParse('invalid json', { default: true })).toEqual({ default: true });
    });
  });

  describe('safeJsonStringify', () => {
    it('should stringify valid objects', () => {
      expect(safeJsonStringify({ key: 'value' })).toBe('{"key":"value"}');
    });

    it('should return default value for invalid input', () => {
      const circular: any = {};
      circular.self = circular;
      expect(safeJsonStringify(circular, 'default')).toBe('default');
    });
  });
});

describe('Array Operations', () => {
  describe('safeFilter', () => {
    it('should filter array safely', () => {
      const arr = [1, 2, 3, 4];
      expect(safeFilter(arr, (x: number) => x > 2)).toEqual([3, 4]);
    });

    it('should return empty array for invalid input', () => {
      expect(safeFilter('not-array', () => true)).toEqual([]);
    });
  });

  describe('safeMap', () => {
    it('should map array safely', () => {
      const arr = [1, 2, 3];
      expect(safeMap(arr, (x: number) => x * 2)).toEqual([2, 4, 6]);
    });

    it('should return default value for invalid input', () => {
      expect(safeMap('not-array', () => 0, [0])).toEqual([0]);
    });
  });

  describe('safeFind', () => {
    it('should find item safely', () => {
      const arr = [1, 2, 3, 4];
      expect(safeFind(arr, (x: number) => x > 2)).toBe(3);
    });

    it('should return default value when not found', () => {
      const arr = [1, 2, 3];
      expect(safeFind(arr, (x: number) => x > 10, 42)).toBe(42);
    });
  });
});

describe('Date Operations', () => {
  describe('safeDateParse', () => {
    it('should parse valid dates', () => {
      const date = new Date('2023-01-01');
      expect(safeDateParse(date)).toEqual(date);
      expect(safeDateParse('2023-01-01')).toEqual(date);
    });

    it('should return default value for invalid dates', () => {
      expect(safeDateParse('invalid-date', new Date())).toBeInstanceOf(Date);
    });
  });

  describe('safeFormatDate', () => {
    it('should format dates safely', () => {
      const date = new Date('2023-01-01');
      const result = safeFormatDate(date);
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // More flexible date format check
    });

    it('should return default value for invalid dates', () => {
      expect(safeFormatDate('invalid-date', {}, 'es-ES', 'N/A')).toBe('N/A');
    });
  });
});

// Error boundary tests are covered in component tests

describe('Assertions', () => {
  describe('assertIsString', () => {
    it('should not throw for strings', () => {
      expect(() => assertIsString('test')).not.toThrow();
    });

    it('should throw for non-strings', () => {
      expect(() => assertIsString(123)).toThrow('Value must be a string');
    });
  });

  describe('assertIsNumber', () => {
    it('should not throw for numbers', () => {
      expect(() => assertIsNumber(123)).not.toThrow();
    });

    it('should throw for non-numbers', () => {
      expect(() => assertIsNumber('123')).toThrow('Value must be a number');
    });
  });

  describe('assertIsObject', () => {
    it('should not throw for objects', () => {
      expect(() => assertIsObject({})).not.toThrow();
    });

    it('should throw for non-objects', () => {
      expect(() => assertIsObject('string')).toThrow('Value must be an object');
    });
  });

  describe('assertIsArray', () => {
    it('should not throw for arrays', () => {
      expect(() => assertIsArray([])).not.toThrow();
    });

    it('should throw for non-arrays', () => {
      expect(() => assertIsArray({})).toThrow('Value must be an array');
    });
  });
});