import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LanguageSelector } from '@/components/LanguageSelector';
import SiteFooter from '@/components/layout/SiteFooter';
import { FileText } from 'lucide-react';
import { formatTextContent } from '@/lib/formatTextContent';

const termsContent = {
  'zh-cn': {
    title: '使用条款',
    version: '使用条款（v1.0）',
    effectiveDate: '生效日期：2025 年 11 月 20 日',
    intro: '欢迎您使用 GoodPick Go 及相关品牌所提供的优惠券与会员服务（以下简称"本服务"）。在访问或使用本服务前，请仔细阅读本使用条款。一旦您访问、注册、领取或使用优惠券，即视为您已阅读、理解并同意受本条款约束。',
    sections: [
      {
        title: '1. 运营方信息',
        content: `本服务由以下主体运营：

GEN CROSS CO., LTD.

注册号：0105567072731

注册地址：27 Soi Prachanukul, Wong Sawang, Bang Sue, Bangkok

联系邮箱：bencothailand2024@gmail.com

联系电话：093-607-7989`
      },
      {
        title: '2. 服务内容',
        content: `提供线上活动详情页、电子优惠券与二维码核销功能；

为合作商户提供会员识别、营销与统计工具；

可能接入第三方平台（如 LINE、支付服务商）以便完成登录、消息推送或支付等功能。

具体功能以您实际看到的页面和与商户之间的活动规则为准。`
      },
      {
        title: '3. 用户责任',
        content: `您承诺：

按照法律法规及本条款使用本服务，不得利用本服务从事任何违法或有害行为；

如通过 LINE 或其他方式登录，应妥善保管账号信息，不得将账号出借、转让给他人使用；

在填写手机号、姓名等信息时，应确保真实、准确、完整；

不得通过技术手段绕过系统限制，批量或恶意领取、使用优惠券；

遵守各具体活动页面或商户另行公示的活动规则。

如因您违反上述约定而给我们或第三方造成损失，您应自行承担全部责任并赔偿因此产生的损失（在适用法律允许的范围内）。`
      },
      {
        title: '4. 优惠券与活动规则',
        content: `每个优惠券或活动的具体适用条件（例如：可用门店、时间范围、最低消费金额、不可叠加使用等），以活动详情页或商户线下公示为准；

优惠券一经领取，仅在有效期内、符合条件时方可使用，逾期或不符合条件的将无法使用；

除非活动规则明确说明，否则优惠券不得兑换现金，不设找零，不可转售；

对于因网络、系统或其他非故意原因导致的重复发券、金额错误等，我们有权在符合法律的前提下进行更正、撤销或与商户协商采取其他合理措施。`
      },
      {
        title: '5. 第三方服务与链接',
        content: `本服务可能包含指向第三方网站、应用或支付页面的链接（例如：商户官网、地图导航、支付页面等）。
这些第三方服务由相应提供商独立运营，适用其各自的条款与隐私政策，我们不对其内容、安全性或隐私做出保证。如您选择使用，应自行判断和承担相应风险。`
      },
      {
        title: '6. 服务中断与变更',
        content: `在以下情形下，我们可能会暂时中断或变更本服务的部分或全部功能：

系统维护、升级或安全性相关的紧急情况；

受不可抗力或其他我们合理控制范围之外因素的影响（例如：网络故障、供应商服务中断等）；

出于法律、监管要求或商户合作调整的需要。

我们会在合理范围内提前或事后通过页面公告等方式提醒您，但在适用法律允许的最大范围内，对此类中断或变更所导致的损失不承担赔偿责任。`
      },
      {
        title: '7. 责任限制',
        content: `在适用法律允许的最大范围内：

本服务以"现状"及"可用"状态提供，我们不对服务的绝对连续性、无错误或适合特定用途作出保证；

对于因电信故障、第三方服务问题、不可抗力、用户自身原因等造成的损失，我们不承担间接、附带、特别或惩罚性损害赔偿责任；

如因我们可归责的原因给您造成直接损失，我们承担的总责任上限以相关活动中我们自有奖励或补偿的实际金额为限，除非适用法律另有强制规定。`
      },
      {
        title: '8. 条款修改',
        content: `我们有权根据业务需要或法律变化，对本条款进行修改。修改后的条款将在页面上发布并标注最新生效日期。
如您在条款修改后继续使用本服务，即视为您同意受新的条款约束。`
      },
      {
        title: '9. 适用法律与争议解决',
        content: `本条款的订立、履行与解释，原则上适用泰王国法律。
如因本服务产生任何争议，双方应首先友好协商解决；协商不成时，可提交有管辖权的法院处理。`
      }
    ]
  },
  'en-us': {
    title: 'Terms of Use',
    version: 'Terms of Use (v1.0)',
    effectiveDate: 'Effective date: 20 November 2025',
    intro: 'Welcome to GoodPick Go and related brands (the "Service"). By accessing the Service or claiming/using any coupon, you agree to be bound by these Terms of Use ("Terms"). Please read them carefully.',
    sections: [
      {
        title: '1. Service Operator',
        content: `The Service is operated by:

GEN CROSS CO., LTD.

Registration No.: 0105567072731

Registered address: 27 Soi Prachanukul, Wong Sawang, Bang Sue, Bangkok

Email: bencothailand2024@gmail.com

Phone: 093-607-7989`
      },
      {
        title: '2. Scope of the Service',
        content: `The Service may include:

Online campaign pages, digital coupons and QR-code redemption;

Membership identification, marketing and analytics tools for partner merchants;

Integration with third-party platforms (such as LINE or payment providers) to enable login, notifications or payments.

The actual features available to you may vary depending on the campaign and merchant.`
      },
      {
        title: '3. Your Responsibilities',
        content: `You agree to:

Use the Service in compliance with applicable laws and these Terms, and not for any unlawful or harmful purpose;

Safeguard your login credentials (e.g. LINE account) and not share or transfer your account to others;

Provide accurate and complete information (such as phone number) when required;

Refrain from using technical methods to circumvent system limits or to fraudulently claim or use coupons;

Comply with any additional rules or conditions published on campaign pages or by merchants.

If you breach these obligations and cause damage to us or any third party, you may be liable for such damage to the extent permitted by law.`
      },
      {
        title: '4. Coupons & Campaign Rules',
        content: `Each coupon or campaign may have specific conditions (e.g. eligible stores, time period, minimum spending, non-combinable). Such conditions are as shown on the campaign page or merchant notice and prevail over these general Terms.

Coupons are valid only within their validity period and when all conditions are met. Expired or ineligible coupons cannot be redeemed.

Unless expressly stated otherwise, coupons have no cash value, cannot be exchanged for cash, and no change will be given. Reselling coupons is prohibited.

In the event of system errors or other unintended issues (e.g. duplicate issuance), we reserve the right, in compliance with applicable law, to correct or cancel affected coupons or take other reasonable remedial actions together with merchants.`
      },
      {
        title: '5. Third-Party Services & Links',
        content: `The Service may include links or access to third-party websites or services (such as merchant sites, map/navigation, or payment pages).
These are provided by independent third parties under their own terms and privacy policies. We are not responsible for their content, security or privacy practices. Your use of such services is at your own risk.`
      },
      {
        title: '6. Service Availability & Changes',
        content: `We may temporarily suspend or modify part or all of the Service in the following situations:

System maintenance, upgrades or security-related emergencies;

Events beyond our reasonable control, such as network failures or outages of service providers;

Legal or regulatory requirements, or changes in merchant cooperation.

Where reasonable, we will notify you via the Service. To the maximum extent permitted by law, we are not liable for losses arising from such suspension or modification.`
      },
      {
        title: '7. Limitation of Liability',
        content: `To the fullest extent permitted by law:

The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied;

We are not liable for any indirect, incidental, special or consequential damages arising out of or in connection with your use of the Service;

Our aggregate liability for direct damages, if any, shall be limited to the amount of any direct benefits or compensation provided by us in the relevant campaign, unless mandatory law requires otherwise.`
      },
      {
        title: '8. Changes to the Terms',
        content: `We may revise these Terms from time to time. Updated Terms will be posted on the Service with a new effective date.
Your continued use of the Service after the updated Terms become effective constitutes your acceptance of them.`
      },
      {
        title: '9. Governing Law & Dispute Resolution',
        content: `These Terms are governed by the laws of the Kingdom of Thailand, unless otherwise required by mandatory local law.
Any dispute arising out of or in connection with the Service should first be resolved through good-faith negotiations. If no agreement is reached, the dispute may be submitted to a competent court.`
      }
    ]
  },
  'th-th': {
    title: 'ข้อกำหนดการใช้บริการ',
    version: 'ข้อกำหนดการใช้บริการ (ฉบับที่ 1.0)',
    effectiveDate: 'วันที่มีผลบังคับใช้: 20 พฤศจิกายน 2025',
    intro: 'ยินดีต้อนรับสู่บริการ GoodPick Go และแบรนด์ที่เกี่ยวข้อง ("บริการ") เมื่อท่านเข้าใช้บริการ รับคูปอง หรือใช้คูปอง ถือว่าท่านได้อ่าน ทำความเข้าใจ และยอมรับข้อกำหนดการใช้บริการฉบับนี้',
    sections: [
      {
        title: '1. ผู้ให้บริการ',
        content: `บริการนี้ดำเนินการโดย

GEN CROSS CO., LTD.

เลขทะเบียนนิติบุคคล: 0105567072731

ที่อยู่จดทะเบียน: 27 Soi Prachanukul, Wong Sawang, Bang Sue, Bangkok

อีเมล: bencothailand2024@gmail.com

โทรศัพท์: 093-607-7989`
      },
      {
        title: '2. ขอบเขตของบริการ',
        content: `บริการอาจประกอบด้วย:

หน้าแคมเปญออนไลน์ คูปองดิจิทัล และการสแกน QR เพื่อใช้คูปอง

เครื่องมือด้านสมาชิก การตลาด และการวิเคราะห์สำหรับร้านค้าคู่ค้า

การเชื่อมต่อกับแพลตฟอร์มภายนอก (เช่น LINE หรือผู้ให้บริการชำระเงิน) เพื่อใช้สำหรับเข้าสู่ระบบ การแจ้งเตือน หรือการชำระเงิน`
      },
      {
        title: '3. หน้าที่และความรับผิดชอบของผู้ใช้',
        content: `ท่านตกลงว่า:

จะใช้บริการตามกฎหมายที่เกี่ยวข้องและข้อกำหนดฉบับนี้ ไม่ใช้บริการเพื่อวัตถุประสงค์ที่ผิดกฎหมายหรือก่อให้เกิดความเสียหาย;

จะเก็บรักษาบัญชีและรหัสผ่านไว้เป็นความลับ ไม่ให้บุคคลอื่นใช้บัญชีแทนท่าน;

จะให้ข้อมูลที่ถูกต้องและเป็นปัจจุบันเมื่อมีการร้องขอ (เช่น หมายเลขโทรศัพท์);

จะไม่ใช้เทคนิคหรือโปรแกรมใด ๆ เพื่อเลี่ยงข้อจำกัดของระบบ หรือรับ/ใช้คูปองเกินสิทธิ์;

จะปฏิบัติตามเงื่อนไขเฉพาะของแต่ละแคมเปญที่ระบุโดยร้านค้าหรือในหน้าแคมเปญ

หากท่านฝ่าฝืนข้อกำหนดและทำให้เรา หรือบุคคลที่สามได้รับความเสียหาย ท่านอาจต้องรับผิดชอบต่อความเสียหายนั้นตามที่กฎหมายอนุญาต`
      },
      {
        title: '4. คูปองและกติกาแคมเปญ',
        content: `เงื่อนไขเฉพาะของแต่ละคูปองหรือแคมเปญ (เช่น ร้านค้าที่ร่วมรายการ ช่วงเวลาใช้คูปอง ยอดใช้จ่ายขั้นต่ำ การใช้ร่วมกับโปรโมชั่นอื่น) จะระบุไว้ที่หน้าแคมเปญหรือประกาศของร้านค้า และให้ยึดถือตามนั้นเป็นหลัก

คูปองสามารถใช้ได้เฉพาะภายในระยะเวลาที่กำหนด และเมื่อเป็นไปตามเงื่อนไขทั้งหมดเท่านั้น

เว้นแต่จะระบุไว้เป็นอย่างอื่น คูปองไม่สามารถแลกเป็นเงินสด ไม่มีเงินทอน และห้ามขายต่อ

หากเกิดข้อผิดพลาดของระบบหรือเหตุขัดข้องอื่น ๆ เราขอสงวนสิทธิในการแก้ไข ยกเลิก หรือดำเนินมาตรการอื่นที่เหมาะสมร่วมกับร้านค้า ภายใต้กรอบของกฎหมาย`
      },
      {
        title: '5. บริการและลิงก์ของบุคคลที่สาม',
        content: `บริการอาจมีลิงก์ไปยังเว็บไซต์หรือบริการของบุคคลที่สาม (เช่น เว็บไซต์ร้านค้า แผนที่/นำทาง หน้าให้บริการชำระเงิน ฯลฯ)
บริการเหล่านั้นดำเนินการโดยผู้ให้บริการภายนอกภายใต้ข้อกำหนดและนโยบายความเป็นส่วนตัวของตนเอง เราไม่รับผิดชอบต่อเนื้อหา ความปลอดภัย หรือแนวทางด้านความเป็นส่วนตัวของบริการภายนอกดังกล่าว การใช้งานอยู่ภายใต้ดุลยพินิจและความเสี่ยงของท่านเอง`
      },
      {
        title: '6. การหยุดให้บริการชั่วคราวและการเปลี่ยนแปลงบริการ',
        content: `เราอาจหยุดให้บริการชั่วคราวหรือปรับเปลี่ยนบริการส่วนใดส่วนหนึ่งในกรณีดังต่อไปนี้:

การบำรุงรักษาหรือปรับปรุงระบบ รวมถึงเหตุฉุกเฉินด้านความปลอดภัย;

เหตุสุดวิสัยหรือเหตุการณ์ที่อยู่นอกเหนือการควบคุมอย่างสมเหตุสมผลของเรา;

การเปลี่ยนแปลงด้านกฎหมาย ข้อกำหนดของหน่วยงานรัฐ หรือการเปลี่ยนแปลงสัญญากับร้านค้าคู่ค้า

เราจะพยายามแจ้งให้ท่านทราบผ่านประกาศบนหน้าเว็บหรือช่องทางที่เหมาะสม และในขอบเขตที่กฎหมายอนุญาต เราจะไม่รับผิดต่อความเสียหายที่เกิดจากการหยุดหรือเปลี่ยนแปลงดังกล่าว`
      },
      {
        title: '7. การจำกัดความรับผิด',
        content: `ภายในขอบเขตที่กฎหมายอนุญาตสูงสุด:

บริการนี้ให้ในลักษณะ "ตามสภาพ" และ "ตามที่มีอยู่" โดยไม่มีการรับประกันใด ๆ เกี่ยวกับความต่อเนื่อง ปราศจากข้อผิดพลาด หรือความเหมาะสมต่อวัตถุประสงค์เฉพาะ;

เราไม่รับผิดชอบต่อความเสียหายทางอ้อม ความเสียหายพิเศษ หรือความเสียหายเชิงลงโทษที่เกิดจากการใช้บริการ;

หากเรามีความรับผิดต่อความเสียหายโดยตรง ความรับผิดรวมสูงสุดจะจำกัดอยู่ที่มูลค่าประโยชน์หรือค่าชดเชยที่เรามอบให้ในแคมเปญที่เกี่ยวข้อง เว้นแต่กฎหมายจะกำหนดเป็นอย่างอื่น`
      },
      {
        title: '8. การแก้ไขข้อกำหนด',
        content: `เราอาจปรับปรุงข้อกำหนดฉบับนี้เป็นครั้งคราว ข้อกำหนดที่ปรับปรุงแล้วจะเผยแพร่บนบริการพร้อมวันที่มีผลบังคับใช้ใหม่
หากท่านยังคงใช้บริการหลังจากข้อกำหนดฉบับใหม่มีผลบังคับใช้ ถือว่าท่านยอมรับข้อกำหนดดังกล่าวแล้ว`
      },
      {
        title: '9. กฎหมายที่ใช้บังคับและการระงับข้อพิพาท',
        content: `ข้อกำหนดฉบับนี้อยู่ภายใต้กฎหมายแห่งราชอาณาจักรไทย (ยกเว้นที่กฎหมายบังคับของประเทศอื่นกำหนดไว้เป็นอย่างอื่น)
หากเกิดข้อพิพาทเกี่ยวกับบริการ ทั้งสองฝ่ายจะพยายามเจรจาไกล่เกลี่ยกันก่อน หากไม่สามารถตกลงกันได้ อาจนำคดีขึ้นสู่ศาลที่มีเขตอำนาจ`
      }
    ]
  }
};

export default function TermsPage() {
  const { language } = useLanguage();
  const content = termsContent[language] || termsContent['zh-cn'];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold" data-testid="terms-title">
              {content.title}
            </h1>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <Card data-testid="terms-content">
            <CardHeader>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">{content.version}</h2>
                <p className="text-sm text-muted-foreground">{content.effectiveDate}</p>
                <p className="text-sm text-muted-foreground leading-relaxed" data-testid="terms-intro">
                  {content.intro}
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {content.sections.map((section, index) => (
                <section key={index} data-testid={`terms-section${index + 1}`}>
                  <h3 className="text-base font-semibold mb-3">
                    {section.title}
                  </h3>
                  <div className="space-y-3 text-muted-foreground">
                    {formatTextContent(section.content)}
                  </div>
                </section>
              ))}
            </CardContent>
          </Card>
        </div>

        <SiteFooter />
      </main>
    </div>
  );
}
