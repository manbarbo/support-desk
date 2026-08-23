import { formatLog, stringifyLogValue } from './logger.formatter';

describe('logger.formatter', () => {
  describe('formatLog', () => {
    it('should return message and empty metadata when no metadata provided', () => {
      const result = formatLog('test message');

      expect(result).toEqual({
        message: 'test message',
        metadata: {},
      });
    });

    it('should return message and metadata when provided', () => {
      const metadata = { ticketId: '123', context: 'TestHandler' };

      const result = formatLog('test message', metadata);

      expect(result).toEqual({
        message: 'test message',
        metadata: { ticketId: '123', context: 'TestHandler' },
      });
    });

    it('should handle empty metadata object', () => {
      const result = formatLog('test message', {});

      expect(result).toEqual({
        message: 'test message',
        metadata: {},
      });
    });
  });

  describe('stringifyLogValue', () => {
    it('should return string as-is', () => {
      expect(stringifyLogValue('hello')).toBe('hello');
    });

    it('should return empty string for undefined', () => {
      expect(stringifyLogValue(undefined)).toBe('');
    });

    it('should return "null" for null', () => {
      expect(stringifyLogValue(null)).toBe('null');
    });

    it('should stringify numbers', () => {
      expect(stringifyLogValue(42)).toBe('42');
    });

    it('should stringify objects', () => {
      expect(stringifyLogValue({ key: 'value' })).toBe('{"key":"value"}');
    });

    it('should stringify arrays', () => {
      expect(stringifyLogValue([1, 2, 3])).toBe('[1,2,3]');
    });

    it('should handle unserializable values', () => {
      const circular: any = {};
      circular.self = circular;

      expect(stringifyLogValue(circular)).toBe('[Unserializable value]');
    });

    it('should handle booleans', () => {
      expect(stringifyLogValue(true)).toBe('true');
      expect(stringifyLogValue(false)).toBe('false');
    });
  });
});
