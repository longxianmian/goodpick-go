import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LanguageSelector } from '@/components/LanguageSelector';
import SiteFooter from '@/components/layout/SiteFooter';
import { Shield } from 'lucide-react';
import { formatTextContent } from '@/lib/formatTextContent';

const privacyContent = {
  'zh-cn': {
    title: '隐私政策',
    version: '隐私政策（v1.0）',
    effectiveDate: '生效日期：2025 年 11 月 20 日',
    intro: '本隐私政策适用于由 GoodPick Go／相关品牌提供的优惠活动、电子优惠券、会员服务以及关联的 H5 页面、运营后台等（统称"本服务"）。',
    sections: [
      {
        title: '1. 运营方及联系方式',
        content: `本服务的运营方 / 数据控制者为：

运营方 / 数据控制者：GEN CROSS CO., LTD.

注册号：0105567072731

注册地址：27 Soi Prachanukul, Wong Sawang, Bang Sue, Bangkok

联系邮箱：bencothailand2024@gmail.com

联系电话：093-607-7989

联系人：PAN

如您对本隐私政策或您的个人数据处理有疑问、意见或投诉，可通过上述联系方式与我们联络。`
      },
      {
        title: '2. 我们收集哪些信息',
        content: `根据您使用本服务的具体功能，我们可能收集并处理以下类别的个人数据（视情况而定）：

账户与身份信息

LINE 账号标识（如 userId、displayName、头像）

手机号码（如您或商户在核销、会员登记时填写）

会员编号、内部用户 ID

优惠券与活动信息

您领取的优惠券、参与的活动、核销记录

优惠券有效期、使用门店、使用时间、优惠金额

与商户门店关联的信息（例如门店名称、城市、楼层等）

设备与日志信息

浏览器类型、操作系统、语言设置

访问日期时间、页面点击、错误日志

IP 地址及近似地理位置（用于安全与统计）

位置信息（可选）

当您授权浏览器或设备分享位置时，我们可获取 GPS 或基站定位信息，用来为您推荐附近门店、计算距离等。

您可以在设备或浏览器设置中随时关闭定位授权。

与我们沟通产生的信息

您通过客服邮箱、表单或其他渠道向我们发送的咨询、反馈或投诉内容

为处理投诉所需的相关记录（例如交易或核销信息）`
      },
      {
        title: '3. 我们如何使用您的信息（处理目的）',
        content: `我们基于以下目的使用您的个人数据：

提供和运营本服务

为您创建或识别会员身份

向您展示活动详情、计算优惠额度、发放和核销优惠券

记录和展示您的优惠券、积分或权益使用情况

履行与您或商户的合同关系

根据与合作商户签订的协议，为其会员或顾客提供数字优惠券与营销工具

协助商户核对核销记录，进行结算与对账（仅使用必要数据）

安全与防欺诈

防止同一用户恶意重复领取或滥用活动

监测异常登录、异常核销行为

保障系统与数据的安全性和完整性

优化服务与统计分析

分析活动效果（例如领取率、核销率、回头率）

优化页面设计和产品功能

生成不指向特定个人的汇总统计报告

遵守法律义务

回应主管机关的合法要求

履行适用法律法规（例如税务、会计或消费者保护）的义务`
      },
      {
        title: '4. 我们如何分享和转移您的信息',
        content: `我们不会向无关第三方出售您的个人数据，只在以下情形下共享：

合作商户与门店

为完成活动或优惠券核销，我们可能与您使用优惠券的合作商户共享必要信息（例如：优惠券 ID、核销时间、门店信息）。

如为会员活动，商户或品牌方可能看到与其活动相关的会员数据（如会员编号、领取/核销次数），但不会看到本政策未载明的额外数据。

技术与服务供应商

云服务器提供商、短信或邮件服务商、数据分析服务提供商等；

这些供应商仅在履行约定服务所必需的范围内使用您的数据，并受保密义务约束。

法律与合规要求

当法律、法规、法院判决或行政机关命令要求时，我们可能根据合法程序披露必要信息。

公司重组或资产转让

如发生合并、分立、收购或资产转让，我们可能在合理必要的范围内向交易相关方提供匿名或去标识化的信息；如涉及个人数据，我们会在法律要求的范围内通知您并确保接收方继续受到本政策保护。

除非得到您的明示同意，否则我们不会将您的个人数据用于本政策列明目的之外的其他用途。`
      },
      {
        title: '5. 数据存储与保留期限',
        content: `存储地点

您的数据主要存储在我们或服务供应商在泰国或其他具备适当数据安全保障的地区所提供的服务器上。

保留期限

在您使用本服务期间，我们会在实现本隐私政策所述目的所必需的期限内保留您的数据；

对于需要符合法律法规或税务、会计要求的数据，我们可能在业务关系结束后继续保留一定年限；

当数据不再需要时，我们会根据安全的方式进行删除或匿名化处理。`
      },
      {
        title: '6. 您的权利',
        content: `在适用法律允许的范围内，您享有以下权利：

访问权：有权请求我们确认是否正在处理与您相关的个人数据，并获取该等数据的副本。

更正权：如您发现数据不准确或不完整，有权要求更正或补充。

删除权：在符合法律条件的情况下，您可以要求我们删除与您有关的个人数据。

限制处理权：在特定情形下，您可以要求我们暂时停止处理您的数据。

数据可携带权（如适用）：请求我们以结构化、常用且机器可读的格式向您或您指定的第三方传输部分个人数据。

撤回同意权：对于基于您同意而进行的某些处理活动，您可以随时撤回同意；但撤回同意不影响撤回前的处理合法性。

投诉权：如您认为我们违反了数据保护法律，您有权向当地监管机构提出投诉。

为保障安全，我们可能会在处理您的请求前要求核实您的身份。`
      },
      {
        title: '7. 儿童数据',
        content: `本服务主要面向成年消费者与商户员工，并非专门为儿童设计。
如我们在不知情情况下收集了 20 岁以下（或当地法律定义的未成年人）的个人数据，我们将尽快删除或采取其他适当措施，除非法律另有规定。`
      },
      {
        title: '8. 本政策的更新',
        content: `我们可能会不时更新本隐私政策，以反映服务或适用法律的变化。
当政策发生实质性变更时，我们将通过页面公告或其他适当方式提醒您，并在显著位置更新生效日期。

当前版本：v1.0

生效日期：2025 年 11 月 20 日

继续使用本服务即表示您已阅读、理解并同意受更新后的隐私政策约束。`
      }
    ]
  },
  'en-us': {
    title: 'Privacy Policy',
    version: 'Privacy Policy (v1.0)',
    effectiveDate: 'Effective date: 20 November 2025',
    intro: 'This Privacy Policy applies to GoodPick Go and related brands providing digital coupons, promotional campaigns, membership services and the associated H5 pages and admin portals (collectively, the "Service").',
    sections: [
      {
        title: '1. Service Operator & Contact Details',
        content: `The Service is operated and your personal data is controlled by:

Service operator / Data controller: GEN CROSS CO., LTD.

Registration No.: 0105567072731

Registered address: 27 Soi Prachanukul, Wong Sawang, Bang Sue, Bangkok

Contact email: bencothailand2024@gmail.com

Contact phone: 093-607-7989

Contact person: PAN

If you have any questions, comments or complaints regarding this Policy or our handling of your personal data, please contact us using the details above.`
      },
      {
        title: '2. Personal Data We Collect',
        content: `Depending on how you use the Service, we may collect and process the following categories of personal data (as applicable):

Account & identity information

LINE account identifiers (e.g. userId, displayName, avatar)

Mobile phone number (when provided by you or by a merchant during redemption / membership enrolment)

Member ID, internal user ID

Coupon & campaign information

Coupons you receive, campaigns you participate in, redemption history

Coupon validity, participating stores, time of use, discount amount

Store information linked to a campaign (e.g. store name, city, floor)

Device & log information

Browser type, operating system, language settings

Access date and time, page clicks, error logs

IP address and approximate location (for security and analytics)

Location data (optional)

When you allow your browser or device to share location, we may receive GPS or network-based location information to recommend nearby stores, calculate distance, etc.

You can disable location sharing in your device or browser settings at any time.

Communication data

Content of your enquiries, feedback or complaints sent via email, forms or other channels

Records necessary for handling complaints (e.g. transaction or redemption details)`
      },
      {
        title: '3. Purposes of Processing',
        content: `We use your personal data for the following purposes:

To provide and operate the Service

Create or identify your membership profile

Display campaign details, calculate discounts, issue and redeem coupons

Record and show your coupon, points or benefit usage

To perform our contract with you or merchants

Perform agreements with partner merchants to provide digital coupons and marketing tools to their customers or members

Assist merchants in verifying redemption records and performing settlement and reconciliation (using only necessary data)

Security & fraud prevention

Prevent abusive or fraudulent use of promotions

Monitor suspicious login or redemption activities

Protect the security and integrity of our systems and data

Service improvement & analytics

Analyse campaign performance (e.g. claim rate, redemption rate, repeat purchase)

Improve page design and product features

Generate aggregated statistics that do not identify individuals

Legal compliance

Respond to lawful requests from competent authorities

Comply with applicable legal obligations (e.g. tax, accounting, consumer protection)`
      },
      {
        title: '4. Data Sharing & Transfers',
        content: `We do not sell your personal data to unrelated third parties. We share data only in the situations below:

Partner merchants and stores

To complete campaigns or coupon redemptions, we may share necessary information (e.g. coupon ID, redemption time, store information) with the merchant where you use a coupon.

For membership campaigns, merchants or brand owners may access member data related to their own campaigns (such as member ID, number of claims / redemptions), but not other data not described in this Policy.

Technical and service providers

Cloud hosting providers, SMS/email providers, analytics providers, etc.

These providers may only use data as necessary to perform services for us and are bound by confidentiality obligations.

Legal & regulatory requirements

We may disclose information when required by law, court order or lawful request of authorities.

Corporate transactions

In case of merger, acquisition, restructuring or asset transfer, we may provide anonymous or de-identified information to relevant parties. If personal data must be transferred, we will notify you where required by law and ensure that the recipient continues to protect your data.

We will not use your personal data for purposes other than those described in this Policy without your consent, unless permitted by law.`
      },
      {
        title: '5. Data Storage & Retention',
        content: `Storage location

Data is mainly stored on servers located in Thailand or other locations that provide appropriate data security safeguards.

Retention period

We retain your data for as long as necessary to fulfil the purposes described in this Policy while you use the Service.

Certain data may be retained longer where required by law or for tax and accounting purposes.

When data is no longer needed, we will delete or anonymise it using secure methods.`
      },
      {
        title: '6. Your Rights',
        content: `Subject to applicable laws, you may have the following rights:

Right of access – to know whether we process your data and to obtain a copy.

Right to rectification – to have inaccurate or incomplete data corrected.

Right to erasure – to request deletion of your personal data in certain circumstances.

Right to restriction – to request temporary restriction of processing in specific situations.

Right to data portability (where applicable) – to request that certain data be transferred to you or a third party in a structured, commonly used and machine-readable format.

Right to withdraw consent – where processing is based on your consent, you may withdraw it at any time, without affecting the lawfulness of processing based on consent before its withdrawal.

Right to complain – you may lodge a complaint with a competent supervisory authority if you believe that our processing violates data protection laws.

We may need to verify your identity before responding to your request.`
      },
      {
        title: '7. Children\'s Data',
        content: `The Service is intended for adult consumers and merchant staff and is not specifically directed at children.
If we become aware that we have unintentionally collected personal data from a minor (as defined under applicable law), we will delete such data or take other appropriate measures, unless we are required by law to retain it.`
      },
      {
        title: '8. Changes to This Policy',
        content: `We may update this Privacy Policy from time to time to reflect changes in our Service or legal requirements.
When material changes are made, we will notify you by a prominent notice on the Service or by other appropriate means and update the effective date.

Current version: v1.0

Effective date: 20 November 2025

Your continued use of the Service after changes become effective constitutes your acceptance of the updated Policy.`
      }
    ]
  },
  'th-th': {
    title: 'นโยบายความเป็นส่วนตัว',
    version: 'นโยบายความเป็นส่วนตัว (ฉบับที่ 1.0)',
    effectiveDate: 'วันที่มีผลบังคับใช้: 20 พฤศจิกายน 2025',
    intro: 'นโยบายฉบับนี้ใช้กับการให้บริการของ GoodPick Go และแบรนด์ที่เกี่ยวข้อง ซึ่งให้บริการคูปองดิจิทัล แคมเปญโปรโมชั่น ระบบสมาชิก รวมถึงหน้า H5 และระบบหลังบ้าน (เรียกรวมกันว่า "บริการ")',
    sections: [
      {
        title: '1. ผู้ให้บริการและผู้ควบคุมข้อมูลส่วนบุคคล',
        content: `บริการนี้ดำเนินการโดย และข้อมูลส่วนบุคคลของท่านอยู่ภายใต้การควบคุมของ

ผู้ให้บริการ / ผู้ควบคุมข้อมูลส่วนบุคคล: GEN CROSS CO., LTD.

เลขทะเบียนนิติบุคคล: 0105567072731

ที่อยู่จดทะเบียน: 27 Soi Prachanukul, Wong Sawang, Bang Sue, Bangkok

อีเมลติดต่อ: bencothailand2024@gmail.com

โทรศัพท์ติดต่อ: 093-607-7989

ผู้ติดต่อ: PAN

หากท่านมีคำถาม ข้อเสนอแนะ หรือข้อร้องเรียนเกี่ยวกับนโยบายฉบับนี้ หรือการประมวลผลข้อมูลส่วนบุคคลของท่าน สามารถติดต่อเราได้ตามช่องทางข้างต้น`
      },
      {
        title: '2. ข้อมูลส่วนบุคคลที่เราเก็บรวบรวม',
        content: `ขึ้นอยู่กับลักษณะการใช้บริการของท่าน เราอาจเก็บและใช้ข้อมูลดังต่อไปนี้ (ตามความเหมาะสม):

ข้อมูลบัญชีและตัวตน

ตัวระบุบัญชี LINE (เช่น userId, displayName, รูปโปรไฟล์)

หมายเลขโทรศัพท์มือถือ (เมื่อท่านหรือร้านค้ากรอกในขั้นตอนสมัครสมาชิกหรือใช้คูปอง)

รหัสสมาชิก รหัสผู้ใช้ภายในระบบ

ข้อมูลคูปองและแคมเปญ

คูปองที่ท่านได้รับ แคมเปญที่เข้าร่วม ประวัติการใช้คูปอง

วันหมดอายุคูปอง ร้านค้าที่ร่วมรายการ เวลาที่ใช้คูปอง จำนวนส่วนลด

ข้อมูลสาขาร้านค้า (เช่น ชื่อร้าน จังหวัด/อำเภอ ชั้น ฯลฯ)

ข้อมูลอุปกรณ์และบันทึกการใช้งาน

ประเภทเบราว์เซอร์ ระบบปฏิบัติการ ภาษา

วันที่และเวลาที่เข้าใช้บริการ การคลิกหน้าเว็บ ข้อผิดพลาดของระบบ

ที่อยู่ IP และตำแหน่งโดยประมาณ (เพื่อความปลอดภัยและการวิเคราะห์)

ข้อมูลตำแหน่งที่ตั้ง (เมื่อท่านยินยอม)

เมื่อท่านอนุญาตให้เบราว์เซอร์หรืออุปกรณ์แชร์ตำแหน่ง เราอาจได้รับข้อมูลตำแหน่ง GPS หรือจากเครือข่าย เพื่อใช้แนะนำร้านค้าใกล้เคียงหรือคำนวณระยะทาง

ท่านสามารถปิดการแชร์ตำแหน่งในตั้งค่าอุปกรณ์หรือเบราว์เซอร์ได้ทุกเมื่อ

ข้อมูลการติดต่อสื่อสาร

เนื้อหาข้อความที่ท่านส่งถึงเราผ่านอีเมล ฟอร์ม หรือช่องทางอื่น

ข้อมูลที่จำเป็นต่อการพิจารณาข้อร้องเรียน (เช่น ข้อมูลการใช้คูปอง)`
      },
      {
        title: '3. วัตถุประสงค์ในการใช้ข้อมูล',
        content: `เราใช้ข้อมูลส่วนบุคคลของท่านเพื่อวัตถุประสงค์ต่อไปนี้:

ให้บริการและดำเนินงานระบบ

สร้างและยืนยันตัวตนสมาชิก

แสดงรายละเอียดแคมเปญ คำนวณส่วนลด ออกคูปองและบันทึกการใช้

แสดงประวัติการใช้คูปอง คะแนน หรือสิทธิประโยชน์ของท่าน

ปฏิบัติตามสัญญากับท่านหรือกับร้านค้า

ให้บริการระบบคูปองและการตลาดดิจิทัลแก่ร้านค้าที่เป็นคู่ค้า

ช่วยร้านค้าตรวจสอบประวัติการใช้คูปองและดำเนินการกระทบยอด/ชำระเงิน โดยใช้เฉพาะข้อมูลที่จำเป็น

ความปลอดภัยและการป้องกันการทุจริต

ป้องกันการใช้สิทธิ์ซ้ำหรือใช้โปรโมชั่นในทางที่ผิด

ตรวจสอบพฤติกรรมการเข้าสู่ระบบหรือการใช้คูปองที่ผิดปกติ

รักษาความปลอดภัยของระบบและข้อมูล

พัฒนาบริการและวิเคราะห์สถิติ

วิเคราะห์ผลลัพธ์ของแคมเปญ (เช่น อัตราการรับคูปอง อัตราการใช้คูปอง)

ปรับปรุงการออกแบบหน้าเว็บและฟังก์ชันต่าง ๆ

จัดทำรายงานเชิงสถิติในลักษณะข้อมูลรวมซึ่งไม่สามารถระบุตัวบุคคลได้

การปฏิบัติตามกฎหมาย

ปฏิบัติตามคำสั่งศาล หรือคำขอของหน่วยงานของรัฐที่มีอำนาจ

ปฏิบัติตามกฎหมายที่ใช้บังคับ เช่น กฎหมายภาษี กฎหมายคุ้มครองผู้บริโภค ฯลฯ`
      },
      {
        title: '4. การเปิดเผยและโอนข้อมูล',
        content: `เราไม่ขายข้อมูลส่วนบุคคลให้บุคคลที่สามที่ไม่เกี่ยวข้อง และจะเปิดเผยข้อมูลเฉพาะในกรณีต่อไปนี้:

ร้านค้าคู่ค้าและสาขา

เพื่อให้สามารถใช้คูปองได้ เราอาจเปิดเผยข้อมูลที่จำเป็น (เช่น หมายเลขคูปอง เวลาใช้คูปอง ข้อมูลสาขา) ให้แก่ร้านค้าที่ท่านใช้คูปอง

ในกรณีแคมเปญสมาชิก ร้านค้าหรือเจ้าของแบรนด์อาจเห็นข้อมูลสมาชิกที่เกี่ยวข้องกับแคมเปญของตนเองเท่านั้น

ผู้ให้บริการด้านเทคโนโลยี

ผู้ให้บริการคลาวด์ ผู้ให้บริการส่ง SMS/อีเมล ผู้ให้บริการวิเคราะห์ข้อมูล ฯลฯ

ผู้ให้บริการเหล่านี้จะใช้ข้อมูลเท่าที่จำเป็นต่อการให้บริการ และอยู่ภายใต้ข้อกำหนดด้านความลับ

ข้อกำหนดทางกฎหมาย

เมื่อมีกฎหมายหรือคำสั่งของหน่วยงานรัฐที่มีอำนาจ เราอาจต้องเปิดเผยข้อมูลตามที่กฎหมายกำหนด

การปรับโครงสร้างธุรกิจ

หากมีการควบรวมกิจการ การโอนทรัพย์สิน หรือการปรับโครงสร้างองค์กร เราอาจโอนข้อมูลในขอบเขตที่จำเป็น โดยจะดำเนินการตามกฎหมายและให้ผู้รับโอนปกป้องข้อมูลของท่านในระดับที่เหมาะสม`
      },
      {
        title: '5. การจัดเก็บและระยะเวลาการเก็บรักษา',
        content: `สถานที่จัดเก็บ

ข้อมูลของท่านจะถูกจัดเก็บบนเซิร์ฟเวอร์ในประเทศไทยหรือสถานที่อื่นที่มีมาตรการรักษาความปลอดภัยข้อมูลที่เหมาะสม

ระยะเวลาการเก็บรักษา

เราจะเก็บข้อมูลของท่านตราบเท่าที่จำเป็นเพื่อให้บรรลุวัตถุประสงค์ที่ระบุในนโยบายฉบับนี้

ข้อมูลบางประเภทอาจถูกเก็บไว้นานกว่าเมื่อกฎหมาย ภาษี หรือข้อกำหนดทางบัญชีกำหนดให้เก็บรักษาไว้

เมื่อข้อมูลไม่จำเป็นอีกต่อไป เราจะลบหรือทำให้ไม่สามารถระบุตัวตนได้โดยใช้วิธีที่ปลอดภัย`
      },
      {
        title: '6. สิทธิของท่าน',
        content: `ภายใต้กฎหมายที่บังคับใช้ ท่านมีสิทธิดังต่อไปนี้:

สิทธิในการเข้าถึง – ทราบว่าเราประมวลผลข้อมูลของท่านหรือไม่ และขอรับสำเนาข้อมูล

สิทธิในการแก้ไข – แก้ไขข้อมูลที่ไม่ถูกต้องหรือไม่สมบูรณ์

สิทธิในการลบ – ขอให้ลบข้อมูลส่วนบุคคลในบางสถานการณ์

สิทธิในการจำกัดการประมวลผล – ขอให้หยุดประมวลผลข้อมูลชั่วคราวในบางสถานการณ์

สิทธิในการโอนย้ายข้อมูล (หากบังคับใช้) – ขอให้โอนข้อมูลในรูปแบบที่อ่านได้ด้วยเครื่องไปยังท่านหรือบุคคลที่สาม

สิทธิในการถอนความยินยอม – ถอนความยินยอมได้ทุกเมื่อโดยไม่กระทบต่อความชอบด้วยกฎหมายของการประมวลผลก่อนหน้า

สิทธิในการร้องเรียน – ท่านสามารถยื่นข้อร้องเรียนต่อหน่วยงานกำกับดูแลหากเชื่อว่าการประมวลผลของเราละเมิดกฎหมายคุ้มครองข้อมูล

เราอาจต้องยืนยันตัวตนของท่านก่อนตอบสนองต่อคำขอของท่าน`
      },
      {
        title: '7. ข้อมูลของเด็ก',
        content: `บริการนี้มีวัตถุประสงค์สำหรับผู้บริโภคที่เป็นผู้ใหญ่และพนักงานร้านค้า และไม่ได้มุ่งหมายโดยเฉพาะสำหรับเด็ก
หากเราทราบว่าได้เก็บข้อมูลส่วนบุคคลของผู้เยาว์โดยไม่ได้ตั้งใจ เราจะลบข้อมูลดังกล่าวหรือใช้มาตรการที่เหมาะสม เว้นแต่กฎหมายกำหนดให้เก็บรักษาไว้`
      },
      {
        title: '8. การเปลี่ยนแปลงนโยบาย',
        content: `เราอาจปรับปรุงนโยบายความเป็นส่วนตัวฉบับนี้เป็นครั้งคราวเพื่อสะท้อนการเปลี่ยนแปลงในบริการหรือข้อกำหนดทางกฎหมาย
เมื่อมีการเปลี่ยนแปลงที่สำคัญ เราจะแจ้งให้ท่านทราบผ่านประกาศบนบริการหรือวิธีการอื่นที่เหมาะสม และจะอัปเดตวันที่มีผลบังคับใช้

ฉบับปัจจุบัน: v1.0

วันที่มีผลบังคับใช้: 20 พฤศจิกายน 2025

การใช้บริการต่อไปหลังจากการเปลี่ยนแปลงมีผลบังคับใช้ถือเป็นการยอมรับนโยบายที่ปรับปรุงแล้ว`
      }
    ]
  }
};

export default function PrivacyPage() {
  const { language } = useLanguage();
  const content = privacyContent[language] || privacyContent['zh-cn'];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold" data-testid="privacy-title">
              {content.title}
            </h1>
          </div>
          <LanguageSelector />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <Card data-testid="privacy-content">
            <CardHeader>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">{content.version}</h2>
                <p className="text-sm text-muted-foreground">{content.effectiveDate}</p>
                <p className="text-sm text-muted-foreground leading-relaxed" data-testid="privacy-intro">
                  {content.intro}
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {content.sections.map((section, index) => (
                <section key={index} data-testid={`privacy-section${index + 1}`}>
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
