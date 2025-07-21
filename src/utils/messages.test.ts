/**
 * Tests for Messages Utility
 */

import { Messages, formatMessage, formatQualityList } from './messages.js';

describe('Messages Utility', () => {
  describe('Messages object', () => {
    it('should have all experience messages', () => {
      expect(Messages.experience.success).toBe('Experienceed');
      expect(Messages.experience.successWithQualities).toBe('Experienceed ({qualities})');
      expect(Messages.experience.batch).toBe('Experienceed {count} experiences');
      expect(Messages.experience.similar).toBe('Similar: {content}');
      expect(Messages.experience.from).toBe('From: {experiencer}');
      expect(Messages.experience.as).toBe('As: {perspective}');
      expect(Messages.experience.when).toBe('When: {processing}');
      expect(Messages.experience.captured).toBe('Captured: {timeAgo}');
    });

    it('should have all recall messages', () => {
      expect(Messages.recall.found).toBe('Found {count} experiences');
      expect(Messages.recall.none).toBe('No experiences found');
      expect(Messages.recall.from).toBe('From {timeAgo}');
      expect(Messages.recall.qualities).toBe('Qualities: {qualities}');
    });

    it('should have all reconsider messages', () => {
      expect(Messages.reconsider.success).toBe('Updated');
      expect(Messages.reconsider.successWithQualities).toBe('Updated ({qualities})');
      expect(Messages.reconsider.batch).toBe('Updated {count} experiences');
    });

    it('should have all release messages', () => {
      expect(Messages.release.success).toBe('Released');
      expect(Messages.release.batch).toBe('Released {count} experiences');
    });

    it('should have all time messages', () => {
      expect(Messages.time.justNow).toBe('just now');
      expect(Messages.time.minutesAgo).toBe('{minutes} minutes ago');
      expect(Messages.time.oneMinuteAgo).toBe('1 minute ago');
      expect(Messages.time.hoursAgo).toBe('{hours} hours ago');
      expect(Messages.time.oneHourAgo).toBe('1 hour ago');
      expect(Messages.time.yesterday).toBe('yesterday');
      expect(Messages.time.daysAgo).toBe('{days} days ago');
    });

    it('should have all processing messages', () => {
      expect(Messages.processing.during).toBe('during conversation');
      expect(Messages.processing.rightAfter).toBe('right after');
      expect(Messages.processing.longAfter).toBe('long after');
    });

    it('should have all quality type messages', () => {
      // Base qualities
      expect(Messages.qualities['embodied']).toBe('embodied');
      expect(Messages.qualities['focus']).toBe('focus');
      expect(Messages.qualities['mood']).toBe('mood');
      expect(Messages.qualities['purpose']).toBe('purpose');
      expect(Messages.qualities['space']).toBe('space');
      expect(Messages.qualities['time']).toBe('time');
      expect(Messages.qualities['presence']).toBe('presence');

      // Embodied sub-qualities
      expect(Messages.qualities['embodied.thinking']).toBe('embodied.thinking');
      expect(Messages.qualities['embodied.sensing']).toBe('embodied.sensing');

      // Focus sub-qualities
      expect(Messages.qualities['focus.narrow']).toBe('focus.narrow');
      expect(Messages.qualities['focus.broad']).toBe('focus.broad');

      // Mood sub-qualities
      expect(Messages.qualities['mood.open']).toBe('mood.open');
      expect(Messages.qualities['mood.closed']).toBe('mood.closed');

      // Purpose sub-qualities
      expect(Messages.qualities['purpose.goal']).toBe('purpose.goal');
      expect(Messages.qualities['purpose.wander']).toBe('purpose.wander');

      // Space sub-qualities
      expect(Messages.qualities['space.here']).toBe('space.here');
      expect(Messages.qualities['space.there']).toBe('space.there');

      // Time sub-qualities
      expect(Messages.qualities['time.past']).toBe('time.past');
      expect(Messages.qualities['time.future']).toBe('time.future');

      // Presence sub-qualities
      expect(Messages.qualities['presence.individual']).toBe('presence.individual');
      expect(Messages.qualities['presence.collective']).toBe('presence.collective');
    });
  });

  describe('formatMessage', () => {
    it('should replace single placeholder', () => {
      const result = formatMessage('Hello {name}!', { name: 'Alice' });
      expect(result).toBe('Hello Alice!');
    });

    it('should replace multiple placeholders', () => {
      const result = formatMessage('Found {count} experiences from {timeAgo}', {
        count: 5,
        timeAgo: 'yesterday'
      });
      expect(result).toBe('Found 5 experiences from yesterday');
    });

    it('should handle missing values', () => {
      const result = formatMessage('Hello {name}!', {});
      expect(result).toBe('Hello {name}!');
    });

    it('should handle partial replacements', () => {
      const result = formatMessage('Hello {name}! You have {count} messages', {
        name: 'Bob'
        // count is missing
      });
      expect(result).toBe('Hello Bob! You have {count} messages');
    });

    it('should convert non-string values to strings', () => {
      const result = formatMessage('Count: {count}, Active: {active}', {
        count: 42,
        active: true
      });
      expect(result).toBe('Count: 42, Active: true');
    });

    it('should handle undefined values by keeping placeholder', () => {
      const result = formatMessage('Value: {value}', {
        value: undefined
      });
      expect(result).toBe('Value: {value}');
    });

    it('should handle null values', () => {
      const result = formatMessage('Value: {value}', {
        value: null
      });
      expect(result).toBe('Value: null');
    });

    it('should handle empty template', () => {
      const result = formatMessage('', { any: 'value' });
      expect(result).toBe('');
    });

    it('should handle template with no placeholders', () => {
      const result = formatMessage('No placeholders here', { any: 'value' });
      expect(result).toBe('No placeholders here');
    });

    it('should handle nested objects', () => {
      const result = formatMessage('Object: {obj}', {
        obj: { nested: 'value' }
      });
      expect(result).toBe('Object: [object Object]');
    });

    it('should handle arrays', () => {
      const result = formatMessage('Array: {arr}', {
        arr: [1, 2, 3]
      });
      expect(result).toBe('Array: 1,2,3');
    });

    it('should handle special characters in keys', () => {
      const result = formatMessage('Hello {user_name}!', {
        user_name: 'Charlie'
      });
      expect(result).toBe('Hello Charlie!');
    });

    it('should not replace invalid placeholder formats', () => {
      const result = formatMessage('Hello { name } and {name2}', {
        name: 'Alice',
        name2: 'Bob'
      });
      expect(result).toBe('Hello { name } and Bob');
    });
  });

  describe('formatQualityList', () => {
    it('should format single quality', () => {
      const result = formatQualityList(['mood.open']);
      expect(result).toBe('mood.open');
    });

    it('should format multiple qualities', () => {
      const result = formatQualityList(['mood.open', 'embodied.sensing', 'presence.collective']);
      expect(result).toBe('mood.open, embodied.sensing, presence.collective');
    });

    it('should handle empty array', () => {
      const result = formatQualityList([]);
      expect(result).toBe('');
    });

    it('should handle unknown qualities', () => {
      const result = formatQualityList(['unknown.quality', 'mood.open']);
      expect(result).toBe('unknown.quality, mood.open');
    });

    it('should use Messages.qualities mapping', () => {
      const result = formatQualityList(['embodied', 'focus', 'mood']);
      expect(result).toBe('embodied, focus, mood');
    });

    it('should handle all quality types', () => {
      const allQualities = [
        'embodied',
        'embodied.thinking',
        'embodied.sensing',
        'focus',
        'focus.narrow',
        'focus.broad',
        'mood',
        'mood.open',
        'mood.closed',
        'purpose',
        'purpose.goal',
        'purpose.wander',
        'space',
        'space.here',
        'space.there',
        'time',
        'time.past',
        'time.future',
        'presence',
        'presence.individual',
        'presence.collective'
      ];
      
      const result = formatQualityList(allQualities);
      expect(result).toBe(allQualities.join(', '));
    });

    it('should preserve order', () => {
      const qualities = ['presence.collective', 'embodied.sensing', 'mood.open'];
      const result = formatQualityList(qualities);
      expect(result).toBe('presence.collective, embodied.sensing, mood.open');
    });

    it('should handle duplicates', () => {
      const result = formatQualityList(['mood.open', 'mood.open', 'embodied']);
      expect(result).toBe('mood.open, mood.open, embodied');
    });
  });
});