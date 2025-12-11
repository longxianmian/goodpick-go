/**
 * Voice Persona管理服务
 * 
 * 规则（文档第6节）：
 * - voice_persona = { lang: string, voiceId: string, gender: 'male'|'female'|'neutral' }
 * - 男号只给男声，女号只给女声
 * - 用户选择的voice写入users.voice_persona
 */

export interface VoiceOption {
  voiceId: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  lang: string;
  description?: string;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  { voiceId: 'aliyun_zh_male_1', name: '中文男声1', gender: 'male', lang: 'zh-CN', description: '温和稳重' },
  { voiceId: 'aliyun_zh_male_2', name: '中文男声2', gender: 'male', lang: 'zh-CN', description: '年轻活力' },
  { voiceId: 'aliyun_zh_female_1', name: '中文女声1', gender: 'female', lang: 'zh-CN', description: '温柔亲和' },
  { voiceId: 'aliyun_zh_female_2', name: '中文女声2', gender: 'female', lang: 'zh-CN', description: '活泼甜美' },
  { voiceId: 'aliyun_zh_neutral_1', name: '中文中性音', gender: 'neutral', lang: 'zh-CN', description: '中性音色' },
  
  { voiceId: 'aliyun_en_male_1', name: 'English Male 1', gender: 'male', lang: 'en-US', description: 'Professional' },
  { voiceId: 'aliyun_en_female_1', name: 'English Female 1', gender: 'female', lang: 'en-US', description: 'Friendly' },
  { voiceId: 'aliyun_en_neutral_1', name: 'English Neutral', gender: 'neutral', lang: 'en-US', description: 'Neutral' },
  
  { voiceId: 'aliyun_th_male_1', name: 'ชายไทย 1', gender: 'male', lang: 'th-TH', description: 'เป็นมิตร' },
  { voiceId: 'aliyun_th_female_1', name: 'หญิงไทย 1', gender: 'female', lang: 'th-TH', description: 'อบอุ่น' },
  { voiceId: 'aliyun_th_neutral_1', name: 'เสียงกลาง', gender: 'neutral', lang: 'th-TH', description: 'เป็นกลาง' },
];

/**
 * 获取用户可用的voice列表（按gender过滤）
 * 规则：男性只能选男声，女性只能选女声，其他只能选中性音
 */
export function getAvailableVoicesForUser(
  userGender: 'male' | 'female' | 'other' | null,
  preferredLang: string
): VoiceOption[] {
  return AVAILABLE_VOICES.filter(voice => {
    if (voice.lang !== preferredLang) return false;
    
    if (userGender === 'male') {
      return voice.gender === 'male';
    } else if (userGender === 'female') {
      return voice.gender === 'female';
    } else if (userGender === 'other') {
      return voice.gender === 'neutral';
    } else {
      return true;
    }
  });
}

/**
 * 验证voice选择是否合法
 * 规则：男性只能选男声，女性只能选女声，其他只能选中性音
 */
export function validateVoiceSelection(
  voiceId: string,
  userGender: 'male' | 'female' | 'other' | null
): boolean {
  const voice = AVAILABLE_VOICES.find(v => v.voiceId === voiceId);
  if (!voice) return false;
  
  if (userGender === 'male' && voice.gender !== 'male') return false;
  if (userGender === 'female' && voice.gender !== 'female') return false;
  if (userGender === 'other' && voice.gender !== 'neutral') return false;
  
  return true;
}
