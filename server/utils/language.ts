/**
 * Language Mapping Utility for LINE OA Messaging System
 * 
 * Maps LINE's language codes to GoodPick Go's preferred_language enum values.
 * Used for OA welcome messages and campaign broadcasts.
 */

/**
 * Maps LINE language code to preferred language enum
 * 
 * @param lineLang - Language code from LINE Profile API (e.g., "th", "en", "zh-TW", "zh-CN")
 * @returns Preferred language code: 'th' | 'en' | 'zh'
 * 
 * Mapping Rules:
 * - "th" → "th" (Thai)
 * - "en" → "en" (English)
 * - "zh-TW", "zh-CN", "zh-HK", "zh" → "zh" (Chinese)
 * - Any other value → "th" (Thai as fallback)
 * 
 * @example
 * mapLineLangToPreferredLang("th")      // Returns: "th"
 * mapLineLangToPreferredLang("en")      // Returns: "en"
 * mapLineLangToPreferredLang("zh-TW")   // Returns: "zh"
 * mapLineLangToPreferredLang("zh-CN")   // Returns: "zh"
 * mapLineLangToPreferredLang("zh-HK")   // Returns: "zh"
 * mapLineLangToPreferredLang("zh")      // Returns: "zh"
 * mapLineLangToPreferredLang("fr")      // Returns: "th" (fallback)
 * mapLineLangToPreferredLang("ja")      // Returns: "th" (fallback)
 * mapLineLangToPreferredLang("")        // Returns: "th" (fallback)
 * mapLineLangToPreferredLang(null)      // Returns: "th" (fallback)
 */
export function mapLineLangToPreferredLang(lineLang: string | null | undefined): 'th' | 'en' | 'zh' {
  // Handle null/undefined/empty string
  if (!lineLang) {
    return 'th';
  }

  // Normalize to lowercase for case-insensitive matching
  const normalized = lineLang.toLowerCase().trim();

  // Direct Thai match
  if (normalized === 'th') {
    return 'th';
  }

  // Direct English match
  if (normalized === 'en') {
    return 'en';
  }

  // Chinese variants (Simplified, Traditional, Hong Kong, generic)
  if (normalized === 'zh' || 
      normalized === 'zh-tw' || 
      normalized === 'zh-cn' || 
      normalized === 'zh-hk') {
    return 'zh';
  }

  // Fallback to Thai for any unrecognized language
  return 'th';
}

/**
 * Test Cases (for verification during development)
 * 
 * These test cases demonstrate expected behavior:
 * 
 * Input: "th"      → Expected: "th"  ✓
 * Input: "en"      → Expected: "en"  ✓
 * Input: "zh-TW"   → Expected: "zh"  ✓
 * Input: "zh-CN"   → Expected: "zh"  ✓
 * Input: "zh-HK"   → Expected: "zh"  ✓
 * Input: "zh"      → Expected: "zh"  ✓
 * Input: "fr"      → Expected: "th"  ✓ (fallback)
 * Input: "ja"      → Expected: "th"  ✓ (fallback)
 * Input: "de"      → Expected: "th"  ✓ (fallback)
 * Input: ""        → Expected: "th"  ✓ (fallback)
 * Input: null      → Expected: "th"  ✓ (fallback)
 * Input: undefined → Expected: "th"  ✓ (fallback)
 * Input: "TH"      → Expected: "th"  ✓ (case-insensitive)
 * Input: "EN"      → Expected: "en"  ✓ (case-insensitive)
 * Input: "ZH-TW"   → Expected: "zh"  ✓ (case-insensitive)
 * Input: " th "    → Expected: "th"  ✓ (trimmed)
 */

// Uncomment below for quick manual testing in development:
// if (import.meta.url === `file://${process.argv[1]}`) {
//   console.log('Running language mapping tests...\n');
//   
//   const testCases: Array<[string | null | undefined, 'th' | 'en' | 'zh']> = [
//     ['th', 'th'],
//     ['en', 'en'],
//     ['zh-TW', 'zh'],
//     ['zh-CN', 'zh'],
//     ['zh-HK', 'zh'],
//     ['zh', 'zh'],
//     ['fr', 'th'],
//     ['ja', 'th'],
//     ['', 'th'],
//     [null, 'th'],
//     [undefined, 'th'],
//     ['TH', 'th'],
//     ['EN', 'en'],
//     ['ZH-TW', 'zh'],
//     [' th ', 'th'],
//   ];
//   
//   let passed = 0;
//   let failed = 0;
//   
//   for (const [input, expected] of testCases) {
//     const result = mapLineLangToPreferredLang(input);
//     const status = result === expected ? '✓' : '✗';
//     
//     if (result === expected) {
//       passed++;
//     } else {
//       failed++;
//       console.log(`${status} FAILED: "${input}" → Expected: "${expected}", Got: "${result}"`);
//     }
//   }
//   
//   console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
// }
