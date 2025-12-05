GoodPick Go OA 消息体系 v1（给 Replit AI 用）

目标：在 GoodPick Go 现有项目基础上，实现一套可长期扩展的 LINE OA 消息体系，包括：

用户层面的 默认语言 + 习惯语言 识别；

欢迎消息（会员首次进入体系时）；

基础的 活动广播能力（运营可发“新活动通知”）。

要求：所有实现必须满足“生产级运行”的标准，可审计、可扩展、避免骚扰用户。

0. 基本原则（天条）

消息逻辑由 GoodPick Go 系统主导，不依赖 OA 后台规则
OA 后台只能保留极简的默认欢迎语，所有与会员 / 活动 / 积分相关的消息，必须由本系统根据数据和规则生成。

用户语言一次识别，长期使用

第一次识别用户语言，用 LINE 提供的 language 作为“默认语言”；

以后用户在 H5 手动选择语言，则以用户选择为主；

所有 OA 消息都按这个“用户语言偏好”来选多语言模板。

消息要有价值、不骚扰

一切推送必须围绕“欢迎你加入 / 有新活动 / 有权益提醒”等有明确价值的目的；

支持未来在系统中配置频率限制（本版只保留设计和基础字段，逻辑先简化）。

可审计、可回溯、可灰度

每条消息（尤其是广播）都要落到日志表，至少包括：发给谁、属于哪次任务、结果如何；

支持后续按计划 ID 回查发送情况。

1. 用户与语言策略
1.1 概念

line_user_id：LINE 给的用户 ID（用于 Messaging API）。

user_id：GoodPick Go 内部平台用户 ID。

preferred_language：用户当前的“习惯语言”，取值限定为：

'th'（泰文）

'en'（英文）

'zh'（中文）

1.2 初次识别（默认语言）

第一次获得该 line_user_id 时（无论是 OA follow webhook 还是 Web OAuth 登录 H5，谁先做好用谁）：

尝试获取 LINE Profile 的 language 字段（例如 "th", "en", "zh-TW", "zh-CN" 等）。

映射规则（伪代码）：

if language in ["th"]       → "th"
if language in ["en"]       → "en"
if language in ["zh-TW","zh-CN","zh-HK","zh"] → "zh"
否则 → "th"（泰文作为兜底）


在我们系统中，将该用户的 preferred_language 设置为以上映射结果。

说明：

若此时还没有 user_id（仅看到 follow 事件），可以先存在 OA 关联表里，后续登录时再补充 user_id；

若此时已经有 user_id（通过 Web OAuth 登录），可以直接写入 users.preferred_language 字段。

1.3 用户在 H5 中的语言选择

当用户通过 H5 网站使用 GoodPick Go：

若用户已经登录（有 user_id）且界面有语言选择（zh/en/th）：

当用户“手动切换语言”时，更新该用户的 preferred_language 为当前 H5 语言；

若用户从未手动切换语言：

H5 默认使用 preferred_language，如果为空再用 LINE 语言映射一次。

1.4 消息实际发送时使用的语言

发送任意 OA 消息时，语言选择逻辑统一为：

lang_for_message =
  preferred_language（如果有）
  否则 → 根据 LINE language 重新映射一次
  都失败 → 'th'（泰文）


然后使用 lang_for_message 去选择对应语言版本的消息模板（见下文模板设计）。

2. 系统与 OA 的分工
2.1 LINE OA 后台（不由本项目实现）

在 OA 后台可配置一条极简的通用欢迎语（可选），例如：

“感谢添加 GoodPick Go 官方账号，会员优惠和活动信息将通过此账号通知您。”

不在 OA 后台配置任何与“会员、券、积分、具体活动”强相关的自动回复规则。

2.2 GoodPick Go 系统负责的内容（本项目实现）

由后端通过 LINE Messaging API 发送：

会员级欢迎消息

当用户第一次通过 OA / H5，真正成为 GoodPick Go 的“系统内会员”时发送；

一次性，按 preferred_language 选择模板。

活动广播消息（MVP）

管理后台选定一个活动 → 创建广播任务 → 发送给选定 OA 下的用户集合；

优先支持“全部粉丝/会员”的广播；

后续可扩展分群。

（预留）积分 / 券状态提醒等后续消息类型，不在 v1 实现，只在设计上预留可扩展性。

3. 消息类型（v1 范围）

v1 只实现两个类型：

用户欢迎消息（System Welcome）

活动广播消息（Campaign Broadcast）

3.1 用户欢迎消息（System Welcome）

触发条件（v1）：

用户在 H5 中通过 OA 菜单进入并完成 Web LINE OAuth 登录，

并且是该 line_user_id 第一次成功登录（系统内为“新用户”或“新绑定 OA 用户”）。

作用：

明确告诉用户：现在开始，你在 GoodPick Go 可以做什么；

引导用户进入“我的优惠券 / 活动页”。

内容形式建议（多语言模板）：

类型：图文卡片（图片 + 标题 + 文本 + 按钮）。

元素：

图片：GoodPick Go 统一风格的欢迎图；

标题（多语言）：

th: 欢迎加入 GoodPick Go（泰文版本）

zh: 欢迎加入 GoodPick Go

en: Welcome to GoodPick Go

文案（多语言，2 行以内）：

明确写出“可以在这里查看优惠券/权益”的好处；

按钮：

按钮1：查看我的优惠券 → H5 我的优惠券页面

按钮2：发现优惠活动 → H5 活动列表 / 精选活动

v1 可以先只实现一个欢迎模板（Welcome v1），未来可通过配置扩展为多个版本。

3.2 活动广播消息（Campaign Broadcast）

触发方式：

管理后台在某个活动详情页选择“创建广播任务（MVP）”；

配置目标 OA / 群体范围（v1 可先固定为“该 OA 下所有有 line_user_id 且允许推送的用户”）；

设置发送时间（立即 / 定时）。

内容形式建议：

类型：图文卡片或 Flex Message；

元素：

图片：活动主图；

标题：活动标题（多语言）；

简短说明：主要优惠 / 有效期；

按钮：查看活动详情 → H5 活动详情页。

4. 数据模型设计（v1 要求）

说明：以下为推荐字段，可在 Drizzle Schema 中按实际项目风格命名，但必须满足语义与扩展性。

4.1 用户表扩展：users.preferred_language

在现有 users（或等价用户表）上增加字段：

preferred_language

类型：string / enum：'th' | 'en' | 'zh'

允许为 NULL，首次识别时写入；

用户在 H5 手动切换语言时更新。

4.2 OA 用户关联表：oa_user_links

新表，用来记录“某个 OA 下，这个 line_user_id 与 user_id 的关系，以及欢迎消息状态”。

字段建议：

id – PK

oa_id – 文本，标识 OA（例如 GOODPICK_MAIN_OA，从配置中读取）

line_user_id – LINE 用户 ID

user_id – 平台用户 ID（可空，follow 时可能还不知道）

initial_language – 初次识别到的语言（th/en/zh）

welcome_sent – boolean，是否已发过系统欢迎消息

welcome_sent_at – timestamptz，可空

created_at / updated_at

约束：

UNIQUE (oa_id, line_user_id)。

4.3 消息模板表（可选，v1 可先用常量代码实现）

为便于多语言和将来运营自主配置，可预留 notification_templates 表（v1 可先不完全实现，只保留结构或用代码常量替代）：

id

key – 模板键，如 welcome_v1, campaign_generic_v1

lang – 语言代码（th/en/zh）

title – 标题

body – 主体文案

image_url – 图片地址

button1_label / button1_url

button2_label / button2_url

created_at / updated_at

v1 可以先在代码里写死 Welcome 模板和一个通用活动模板，后续迁移到表中。

4.4 活动广播任务表：campaign_broadcasts

用于记录“针对某个活动的一次广播计划及执行情况”。

字段建议：

id

campaign_id – 活动 ID（关联现有活动表）

oa_id

target_type – v1 写死 'ALL'（后续扩为 SEGMENT）

send_time – 计划发送时间

status – enum: 'pending' | 'sending' | 'done' | 'failed' | 'cancelled'

total_targets – 计划目标人数

sent_count – 实际成功发送数

failed_count – 失败数

created_by – 管理员 ID

created_at / updated_at

4.5 广播日志表（可选，v1 简化）

可预留 broadcast_logs 表，用于记录每条消息的结果（v1 可先选一部分字段）：

id

broadcast_id – 对应 campaign_broadcasts.id

line_user_id

status – 'success' | 'failed'

error_code / error_message（如有）

sent_at

5. 关键流程设计（v1 实现范围）
5.1 用户欢迎消息流程（v1）

触发点：用户通过 OA 菜单进入 H5，并完成 Web LINE OAuth 登录。

流程（后端）：

在 OAuth 回调中：

取得 line_user_id；

如果 users 中没有该用户 → 创建用户；

尝试从 LINE Profile 读取 language，映射得到 default_lang（th/en/zh）。

更新用户语言偏好：

若 users.preferred_language 为空：

设置为 default_lang；

在 oa_user_links 中 upsert：

根据 (oa_id, line_user_id) 查记录；

不存在则创建一条：

initial_language = default_lang

welcome_sent = false

存在则仅补充 user_id。

若 welcome_sent = false：

选择 welcome 模板：

lang = users.preferred_language（如果有）
否则使用 initial_language；

构造 LINE 消息结构（图文卡片）；

调用 LINE Messaging API pushMessage 发送；

成功后设置：

welcome_sent = true

welcome_sent_at = now()。

v1 可以先在 OAuth 回调中直接发送欢迎消息（注意做超时保护），后续可改为后台任务定时发送。

5.2 活动广播流程（v1）

触发方式：管理员在后台选中一个活动，点击“创建广播任务（MVP）”。

流程：

前端（管理后台）：

在活动详情页中增加一个按钮：

创建 OA 广播任务（MVP）

点击弹框确认：

选择 OA（若只有一个可默认）；

选择发送时间（默认“立即发送”）。

调用后端 API：POST /api/admin/campaigns/:id/broadcasts

Body：{ oaId, sendTime }

后端创建一条 campaign_broadcasts 记录：

status = 'pending'

增加一个执行 API（v1 手动触发）：

POST /api/admin/broadcasts/run-pending

内部逻辑：

查询所有 status = 'pending' 且 send_time <= now() 的任务；

对每个任务：

将状态设为 'sending'；

根据 oa_id 在 oa_user_links 中查出所有 line_user_id（可以先不区分是否关注）；

分批发送（例如每批 300～500 个）：

优先使用 LINE multicast（如可用），不行则循环 pushMessage；

统计成功 / 失败数量；

更新 sent_count / failed_count 和 status（done 或 failed）。

消息语言选择：

对每个 line_user_id：

优先使用对应 user.preferred_language；

若没有，则使用 oa_user_links.initial_language；

再不行用 th；

用这个 lang 选取活动广播模板（如：标题、文案、按钮文本）。

v1 不实现复杂限频 / 分群逻辑，只要架子符合未来扩展，代码结构清晰可维护。

6. v1 开发任务分解（Replit AI 执行顺序建议）

请 Replit AI 在开发环境（Replit）中按以下顺序实现，并在每一步完成后通过接口测试：

数据层改造

在 users 表中增加 preferred_language 字段（Drizzle schema + migration）。

新建 oa_user_links 表（Drizzle schema + migration）。

新建 campaign_broadcasts 表（Drizzle schema + migration）。

若合适，可预留 notification_templates 和 broadcast_logs 的 schema（v1 可不完全使用）。

语言识别与写入

在 LINE Web OAuth 回调中：

获取 LINE Profile 的 language；

实现映射函数 mapLineLangToPreferredLang；

对新用户写入 users.preferred_language；

对 oa_user_links 做 upsert，并写入 initial_language。

在 H5 语言切换逻辑中：

若用户已登录，则在后端更新 users.preferred_language 为当前 H5 语言。

欢迎消息实现（System Welcome v1）

在后端新增一个 service，例如 src/domain/notifications/welcome.service.ts：

负责：

根据 user_id / line_user_id 决定是否需要发送欢迎消息；

按语言选择 Welcome 模板；

通过 LINE Messaging API 发送；

更新 oa_user_links.welcome_sent。

在 OAuth 回调成功逻辑中：

调用该 service（可在处理完登录后异步触发）。

活动广播 MVP

后端：

实现 POST /api/admin/campaigns/:id/broadcasts 创建广播任务；

实现 POST /api/admin/broadcasts/run-pending 执行广播任务；

在执行函数中：

查询目标用户集合（基于 oa_user_links）；

按用户语言选择模板；

调用 LINE API 发送。

管理后台前端：

在活动详情页增加按钮 / 表单；

调用上述 API。

测试与保护

在开发环境中，使用测试 OA / 测试 LINE 账号进行实际消息发送测试；

确保：

欢迎消息只发送一次；

活动广播不会发送给空用户集；

所有失败调用都有日志输出。

给 Replit AI 的附加说明：

所有与 LINE Messaging API 相关的配置（Channel Access Token 等）必须通过 .env 注入，不得写死在代码中；

所有新增模块请按现有项目的代码风格命名和组织；

在任何可能阻塞请求的地方（如批量发送消息）应考虑异步处理或后台任务模式，避免阻塞用户的正常 API 请求。