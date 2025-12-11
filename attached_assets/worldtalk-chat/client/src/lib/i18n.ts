// 支持55种语言：12种完整UI + 43种仅翻译
export type Language = 
  // 12种完整UI支持
  | 'zh' | 'en' | 'th' | 'ja' | 'id' | 'es' | 'fr' | 'ar' | 'hi' | 'de' | 'ru' | 'pt'
  // 43种额外翻译支持（UI显示英文）
  | 'vi' | 'ko' | 'ms' | 'tl' | 'my' | 'km' | 'lo' | 'ne' | 'si' 
  | 'ta' | 'te' | 'ml' | 'kn' | 'pa' | 'gu' | 'mr' | 'bn' | 'ur'
  | 'it' | 'nl' | 'pl' | 'tr' | 'ro' | 'sv' | 'no' | 'da' | 'fi' 
  | 'cs' | 'el' | 'hu' | 'uk' | 'bg' | 'sr' | 'hr' | 'sk' | 'sl'
  | 'he' | 'fa' | 'sw' | 'am' | 'zu' | 'af';

// 完全支持UI翻译的语言集合 - 扩展支持更多语言
const SUPPORTED_UI_LANGUAGES: Set<Language> = new Set(['zh', 'en', 'th', 'ja', 'id', 'es', 'fr', 'ar', 'hi', 'de', 'ru', 'pt'] as const);

export interface I18nMessages {
  // Navigation
  chats: string;
  friends: string;
  groups: string;
  profile: string;
  discover: string;
  shop: string;
  worldInbox: string;
  
  // Common
  add: string;
  cancel: string;
  create: string;
  send: string;
  sent: string;
  back: string;
  settings: string;
  logout: string;
  inviteFriends: string;
  scanQR: string;
  confirm: string;
  delete: string;
  save: string;
  saving: string;
  copy: string;
  search: string;
  share: string;
  all: string;
  you: string;
  other: string;
  original: string;
  bind: string;
  
  // Friends
  friendsList: string;
  addFriend: string;
  friendId: string;
  addFriendPlaceholder: string;
  newFriendRequest: string;
  acceptFriendRequest: string;
  rejectFriendRequest: string;
  
  // Groups
  groupsList: string;
  createGroup: string;
  groupName: string;
  groupNamePlaceholder: string;
  selectMembers: string;
  selectedMembers: string;
  selectAll: string;
  deselectAll: string;
  searchFriends: string;
  noSearchResults: string;
  
  // Search and forms
  searchUsers: string;
  searchPlaceholder: string;
  searchResults: string;
  searching: string;
  noUsersFound: string;
  addByUsername: string;
  
  // Chat
  typeMessage: string;
  online: string;
  offline: string;
  translating: string;
  aiAssistantName: string;
  autoTranslated: string;
  typeInYourLanguage: string;
  worldChatPlaceholder: string;
  
  // Profile
  myQrCode: string;
  languageSettings: string;
  voiceSettings: string;
  voiceSettingsDesc: string;
  remoteVoiceForMe: string;
  remoteVoiceForMeDesc: string;
  myDefaultVoiceForOthers: string;
  myDefaultVoiceForOthersDesc: string;
  autoCallTranscript: string;
  autoCallTranscriptDesc: string;
  voiceOptionDefault: string;
  voiceOptionMale: string;
  voiceOptionFemale: string;
  voiceOptionMaleDeep: string;
  voiceOptionFemaleSweet: string;
  voiceOptionNeutral: string;
  notifications: string;
  otherSettings: string;
  myLanguage: string;
  multilingualCard: string;
  myShareLink: string;
  viewCard: string;
  qrCodePlaceholder: string;
  scanQRToViewCard: string;
  scanQRToAddFriend: string;
  cameraPermissionDenied: string;
  externalAccounts: string;
  connected: string;
  notConfigured: string;
  lineNotConfigured: string;
  systemSettings: string;
  soundEffects: string;
  searchChats: string;
  searchContactsOrGroups: string;
  contacts: string;
  group: string;
  noResultsFound: string;
  tryDifferentKeyword: string;
  searchContactsAndGroups: string;
  enterNameToSearch: string;
  
  // World Inbox
  noConversations: string;
  worldInboxEmptyHint: string;
  conversationNotFound: string;
  
  // External Channels
  channelWhatsapp: string;
  channelWechat: string;
  channelLine: string;
  channelMessenger: string;
  channelTelegram: string;
  channelInstagram: string;
  channelViber: string;
  
  // Languages
  chinese: string;
  thai: string;
  english: string;
  japanese: string;
  indonesian: string;
  spanish: string;
  french: string;
  arabic: string;
  hindi: string;
  german: string;
  russian: string;
  portuguese: string;
  
  // Guest User
  guestAccountNotice: string;
  upgradeToInviteFriends: string;
  upgradeAccount: string;
  guestChatRestricted: string;
  guestUpgradeToChatWithFriends: string;
  upgradeNow: string;
  
  // Status
  loading: string;
  error: string;
  success: string;
  saved: string;
  saveFailed: string;
  
  // Time
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  yesterday: string;
  daysAgo: string;
  
  // Chats page
  noMessages: string;
  mePrefix: string;
  unknownUser: string;
  groupLabel: string;
  emptyChatsHint: string;
  emptyChatRecord: string;
  noGroupsHint: string;
  noFriendsHint: string;
  loadingMessages: string;
  loadMore: string;
  startConversation: string;
  welcomeToGroup: string;

  // Chat Info page
  chatInfo: string;
  searchChatHistory: string;
  clearChatHistory: string;
  muteNotifications: string;
  pinChat: string;
  reminders: string;
  setChatBackground: string;
  report: string;

  // Chat Action Panel
  selectFunction: string;
  gallery: string;
  camera: string;
  voiceCall: string;
  location: string;
  file: string;
  favorites: string;
  businessCard: string;
  videoCall: string;

  // Action Messages
  voiceCallNeedSDK: string;
  videoCallNeedSDK: string;
  favoritesNotImplemented: string;
  locationPermissionError: string;
  locationNotSupported: string;
  viewLocation: string;
  clickToOpenMaps: string;
  
  // Business Card Fields
  businessCardPrefix: string;
  emailLabel: string;
  phoneLabel: string;
  phoneNotSet: string;
  selectContact: string;
  searchContacts: string;
  myCard: string;

  // Call invitation
  inviteToCall: string;
  noFriends: string;
  invite: string;
  
  // Error messages
  loginFailed: string;
  loginError: string;
  lineLoginError: string;
  authFailed: string;
  loginParamsMissing: string;
  redirectFailed: string;
  addFriendFailed: string;
  createGroupFailed: string;
  loadChatsFailed: string;
  loadFriendsFailed: string;
  loadGroupsFailed: string;
  getLocationFailed: string;
  translationError: string;
  webrtcNetworkRestricted: string;
  mediaPermissionDenied: string;
  failedToAcceptFriend: string;
  failedToDeclineFriend: string;
  alreadyFriends: string;
  friendRequestAlreadySent: string;
  cannotAddYourself: string;
  
  // Success messages
  friendRequestSent: string;
  friendRequestAccepted: string;
  friendRequestDeclined: string;
  groupCreated: string;
  callInviteSent: string;
  
  // Dialog and modal content
  switchLanguage: string;
  switchLanguageConfirm: string;
  uiWillShow: string;
  uiWillShowEnglish: string;
  onlyChatTranslation: string;
  applying: string;
  
  // Language Picker
  languageSearchPlaceholder: string;
  chatTranslationOnly: string;
  chatTranslationNote: string;
  fullUiSupport: string;
  fullUiSupportLanguages: string;
  uiAutoAdapt: string;
  uiAutoAdaptNote: string;
  
  // Login page
  appDescription: string;
  loginWithLine: string;
  chatWithWorldFriends: string;
  supportsMultilingualTranslation: string;
  supportedLanguages: string;
  guestLogin: string;
  sixDigitSignup: string;
  usernameSignup: string;
  lineLogin: string;
  connectWithoutBarriers: string;

  // Invite System
  invite_friends: string;
  invite_to_group: string;
  invite_to_chat: string;
  sms: string;
  email: string;
  invite_to_yulink: string;
  copied: string;
  invite_link_copied: string;
  generating_link: string;
  show_qr_code: string;
  scan_to_join: string;
  share_link: string;
  share_to_platform: string;
  invite_tips_title: string;
  invite_tip_1: string;
  invite_tip_2: string;
  invite_tip_3: string;
  invite_message: string;
  failed_to_generate_invite_link: string;
  invite_accepted_successfully: string;
  failed_to_accept_invite: string;
  invite_link_expired: string;
  invalid_invite_link: string;
  invite_error: string;
  back_to_home: string;
  multilingual_instant_communication: string;
  youre_invited_to_join: string;
  click_accept_to_join_conversation: string;
  auto_translation: string;
  cross_language_communication: string;
  voice_video_calls: string;
  high_quality_communication: string;
  group_chat: string;
  connect_with_friends: string;
  accepting: string;
  processing_invite: string;
  accept_invitation: string;
  by_accepting_you_agree: string;
  terms_and_privacy: string;
  
  // Validation messages
  enterUsername: string;
  enterGroupName: string;
  selectOneFriend: string;
  groupNeedAtLeastThreePeople: string;
  
  // Development
  inDevelopment: string;
  
  // New Profile Menu Items
  myServices: string;
  myFavorites: string;
  myDiscovery: string;
  ordersAndPoints: string;
  emoticons: string;
  personalProfile: string;
  accountSecurity: string;
  friendPermissions: string;
  userAgreement: string;
  privacyPolicy: string;
  
  // Account types
  personalAccount: string;
  accountId: string;
  personal: string;
  creator: string;
  enterprise: string;
  noOtherAccounts: string;
  
  // New menu items
  services: string;
  stickers: string;
  
  // Commerce
  orders: string;
  order: string;
  cart: string;
  points: string;
  wallet: string;
  myOrders: string;
  myCart: string;
  myPoints: string;
  myWallet: string;
  noOrders: string;
  noCartItems: string;
  totalPoints: string;
  balance: string;
  availableBalance: string;
  emptyState: string;
  totalSpent: string;
  orderCount: string;
  lastPayment: string;
  viewOrders: string;
  goShopping: string;
  transactionHistory: string;
  viewAll: string;
  noTransactions: string;
  completed: string;
  processing: string;
  failed: string;
  orderStatus: string;
  orderDetails: string;
  orderItems: string;
  orderTime: string;
  paymentStatus: string;
  paid: string;
  pending: string;
  cancelled: string;
  
  // Friend requests
  friendRequests: string;
  wantsToBeYourFriend: string;
  accept: string;
  decline: string;
  
  // Membership Cards
  myMembershipCards: string;
  membershipTierRegular: string;
  membershipTierSilver: string;
  membershipTierGold: string;
  membershipTierPlatinum: string;
  currentPoints: string;
  pointsSuffix: string;
  
  // Account Types
  lineAccount: string;
  phoneAccount: string;
  guestAccount: string;
  
  // PWA Installation
  installSuccess: string;
  appInstalledSuccessfully: string;
  iosInstallGuide: string;
  iosInstallInstructions: string;
  manualInstall: string;
  manualInstallInstructions: string;
  addToHomeScreen: string;
  installLikeApp: string;
  
  // Friend Request Toasts
  friendRequestAcceptedToast: string;
  friendAddedSuccessfully: string;
  operationFailed: string;
  acceptFriendRequestFailed: string;
  friendRequestDeclinedToast: string;
  friendRequestDeclinedMessage: string;
  declineFriendRequestFailed: string;
  pendingFriendRequests: string;
  noFriendRequests: string;
  
  // New page content translations
  comingSoon: string;
  noFavorites: string;
  noEmoticons: string;
  username: string;
  firstName: string;
  lastName: string;
  nickname: string;
  phoneNumber: string;
  languagePreference: string;
  notSet: string;
  memberSince: string;
  editProfile: string;
  saveChanges: string;
  editing: string;
  usernameTaken: string;
  profileUpdateSuccess: string;
  profileUpdateFailed: string;
  selectLanguage: string;
  usernameRequired: string;
  firstNameRequired: string;
  upgradeForSecurity: string;
  accountType: string;
  linkedAccounts: string;
  lineAndPhone: string;
  lineOnly: string;
  phoneOnly: string;
  none: string;
  changePassword: string;
  twoFactorAuth: string;
  notEnabled: string;
  securityTips: string;
  securityTip1: string;
  securityTip2: string;
  securityTip3: string;
  
  // Profile Edit
  pleaseSelectImage: string;
  avatarUpdated: string;
  uploadFailed: string;
  profileUpdated: string;
  saveFailed: string;
  uploading: string;
  tapToChangeAvatar: string;
  enterFirstName: string;
  enterLastName: string;
  profileEditNote: string;
  accountIdCopied: string;
  copyFailed: string;
  
  // Service Center
  serviceCenter: string;
  accountAndIdentity: string;
  myWorkAccounts: string;
  manageEnterpriseIdentities: string;
  myCreatorAccounts: string;
  manageContentCreatorIdentities: string;
  applyEnterpriseAccount: string;
  createEnterpriseWizard: string;
  
  // OA Page - Discovery Account Management
  oaContentUpload: string;
  oaProductUpload: string;
  oaContentManagement: string;
  oaProductManagement: string;
  oaPublishContent: string;
  oaUploadProduct: string;
  oaArticle: string;
  oaVideo: string;
  oaProduct: string;
  oaTitle: string;
  oaTitlePlaceholder: string;
  oaDescription: string;
  oaDescriptionPlaceholder: string;
  oaSelectVideo: string;
  oaVideoCover: string;
  oaUploadImages: string;
  oaMaxImages: string;
  oaProductCover: string;
  oaPrice: string;
  oaPricePlaceholder: string;
  oaPublish: string;
  oaPublishing: string;
  oaNoContent: string;
  oaStartPublish: string;
  oaNoProducts: string;
  oaUploadProductFirst: string;
  oaViews: string;
  oaLikes: string;
  oaBindProduct: string;
  oaBoundProduct: string;
  oaSelectProductToBind: string;
  oaUnbind: string;
  oaClose: string;
  oaContentList: string;
  oaProductList: string;
  oaPublishSuccess: string;
  oaPublishFailed: string;
  oaDeleteSuccess: string;
  oaDeleteFailed: string;
  oaBindSuccess: string;
  oaBindFailed: string;
  oaStatContent: string;
  oaStatFollowers: string;
  oaStatViews: string;
  oaStatEarnings: string;
  oaDrafts: string;
  oaOnline: string;
  oaTrash: string;
  oaMoveToBin: string;
  oaRestore: string;
  oaPermanentDelete: string;
  oaRestoreSuccess: string;
  oaAll: string;
  close: string;
  
  // Content Detail Page
  followNow: string;
  following: string;
  saySmething: string;
  noImage: string;
  contentNotFound: string;
  viewProduct: string;
  tagsLabel: string;
  invalidDate: string;
  shareSuccess: string;
  shareFailed: string;
  linkCopied: string;
  copiedToClipboard: string;
  
  // LINE OA Invitation
  lineOaInviteTitle: string;
  lineOaInviteDesc: string;
  lineOaFollowMe: string;
  lineOaLoginToConnect: string;
}

const messages: Record<Language, I18nMessages> = {
  zh: {
    chats: '聊天',
    friends: '好友',
    groups: '群聊',
    profile: '我的',
    discover: '发现',
    shop: '购物',
    worldInbox: '世界聊',
    add: '添加',
    cancel: '取消',
    create: '创建',
    send: '发送',
    sent: '已发送',
    back: '返回',
    settings: '设置',
    logout: '退出登录',
    inviteFriends: '邀请好友',
    scanQR: '扫一扫',
    all: '全部',
    you: '你',
    other: '对方',
    original: '原文',
    bind: '去绑定',
    friendsList: '好友列表',
    addFriend: '添加好友',
    friendId: '好友ID',
    addFriendPlaceholder: '输入好友ID或手机号...',
    newFriendRequest: '新的好友请求',
    acceptFriendRequest: '接受',
    rejectFriendRequest: '拒绝',
    groupsList: '群聊列表',
    createGroup: '创建群聊',
    groupName: '群聊名称',
    groupNamePlaceholder: '输入群聊名称...',
    selectMembers: '选择成员',
    selectedMembers: '已选择成员',
    selectAll: '全选',
    deselectAll: '取消全选',
    searchFriends: '搜索好友',
    noSearchResults: '没有找到匹配的好友',
    typeMessage: '输入消息...',
    online: '在线',
    offline: '离线',
    translating: '翻译中...',
    aiAssistantName: '我的助手',
    autoTranslated: '机翻',
    typeInYourLanguage: '用你熟悉的语言输入 · 自动翻译发送',
    worldChatPlaceholder: '在这里用你熟悉的语言输入，对方会看到TA那边的版本…',
    myQrCode: '我的二维码',
    languageSettings: '语言设置',
    voiceSettings: '语音设置',
    voiceSettingsDesc: '设置语音消息和语音通话的音色偏好',
    remoteVoiceForMe: '我听别人的声音',
    remoteVoiceForMeDesc: '别人的语音翻译成我的语言时，用什么声音播放',
    myDefaultVoiceForOthers: '别人听我的声音',
    myDefaultVoiceForOthersDesc: '我的语音翻译成对方语言时，用什么声音播放',
    autoCallTranscript: '自动生成通话记录',
    autoCallTranscriptDesc: '通话结束后自动生成双语文字记录',
    voiceOptionDefault: '默认',
    voiceOptionMale: '男声',
    voiceOptionFemale: '女声',
    voiceOptionMaleDeep: '磁性男声',
    voiceOptionFemaleSweet: '甜美女声',
    voiceOptionNeutral: '中性',
    notifications: '消息通知',
    otherSettings: '其他设置',
    myLanguage: '我的语言',
    multilingualCard: '我的二维码',
    myShareLink: '我的专属链接',
    viewCard: '查看名片',
    qrCodePlaceholder: '二维码占位符（扫一扫加我）',
    scanQRToViewCard: '扫描二维码查看多语言名片',
    scanQRToAddFriend: '扫描好友二维码即可添加好友',
    cameraPermissionDenied: '相机权限被拒绝，请在设置中允许访问相机',
    externalAccounts: '外部账号管理',
    connected: '已连接',
    notConfigured: '未配置',
    lineNotConfigured: 'LINE未配置',
    systemSettings: '系统管理',
    soundEffects: '音效管理',
    searchChats: '搜索聊天',
    searchContactsOrGroups: '搜索联系人或群组...',
    contacts: '联系人',
    group: '群组',
    noResultsFound: '未找到匹配的结果',
    tryDifferentKeyword: '尝试输入不同的关键词',
    searchContactsAndGroups: '搜索联系人和群组',
    enterNameToSearch: '输入姓名或群组名称开始搜索',
    noConversations: '暂无会话',
    worldInboxEmptyHint: '从外部渠道收到的消息会显示在这里',
    conversationNotFound: '找不到该会话',
    channelWhatsapp: 'WhatsApp',
    channelWechat: '微信',
    channelLine: 'LINE',
    channelMessenger: 'Messenger',
    channelTelegram: 'Telegram',
    channelInstagram: 'Instagram',
    channelViber: 'Viber',
    chinese: '中文',
    thai: '泰文',
    english: '英文',
    japanese: '日文',
    indonesian: '印尼文',
    spanish: '西班牙文',
    french: '法文',
    arabic: '阿拉伯文',
    hindi: '印地文',
    german: '德文',
    russian: '俄文',
    portuguese: '葡萄牙文',
    
    // Guest User
    guestAccountNotice: '访客账户提醒',
    upgradeToInviteFriends: '升级账户后即可邀请好友加入聊天',
    upgradeAccount: '升级账户',
    guestChatRestricted: '访客账户限制',
    guestUpgradeToChatWithFriends: '游客只能与AI助理聊天，升级账户后即可与好友畅聊',
    upgradeNow: '立即升级',
    loading: '加载中...',
    error: '错误',
    success: '成功',
    saved: '已保存',
    saveFailed: '保存失败',
    justNow: '刚刚',
    minutesAgo: '分钟前',
    hoursAgo: '小时前',
    yesterday: '昨天',
    daysAgo: '天前',
    noMessages: '暂无消息',
    mePrefix: '我: ',
    unknownUser: '未知用户',
    groupLabel: '(群聊)',
    emptyChatsHint: '暂无聊天，快去添加好友或创建群聊吧！',
    chatInfo: '聊天信息',
    searchChatHistory: '查找聊天记录',
    clearChatHistory: '清空聊天记录',
    muteNotifications: '消息免打扰',
    pinChat: '置顶聊天',
    reminders: '提醒',
    setChatBackground: '设置当前聊天背景',
    report: '投诉',
    selectFunction: '选择功能',
    gallery: '相册',
    camera: '拍摄',
    voiceCall: '语音通话',
    location: '位置',
    file: '文件',
    favorites: '收藏夹',
    businessCard: '名片',
    videoCall: '视频',
    voiceCallNeedSDK: '语音通话功能需对接 WebRTC/第三方 SDK',
    videoCallNeedSDK: '视频通话功能需对接 WebRTC/第三方 SDK',
    favoritesNotImplemented: '收藏夹功能待实现',
    locationPermissionError: '无法获取当前位置，请检查位置权限设置',
    locationNotSupported: '当前设备不支持定位功能',
    viewLocation: '查看位置',
    clickToOpenMaps: '点击打开 Google 地图导航',
    businessCardPrefix: '名片',
    emailLabel: '邮箱',
    phoneLabel: '电话',
    phoneNotSet: '未设置',
    selectContact: '选择联系人',
    searchContacts: '搜索联系人',
    myCard: '我的名片',
    inviteToCall: '邀请加入通话',
    noFriends: '暂无好友',
    invite: '邀请',
    
    // 新增字段
    confirm: '确定',
    delete: '删除',
    save: '保存',
    saving: '保存中...',
    copy: '复制',
    search: '搜索',
    share: '分享',
    searchUsers: '搜索用户',
    searchPlaceholder: '搜索用户名、姓名或邮箱...',
    searchResults: '搜索结果',
    searching: '搜索中...',
    noUsersFound: '未找到匹配的用户',
    addByUsername: '按用户名添加好友',
    emptyChatRecord: '暂无聊天记录，快去添加好友或加入群聊吧！',
    noGroupsHint: '暂无群聊，快去创建一个群聊吧！',
    noFriendsHint: '暂无好友，快去添加一些好友吧！',
    loadingMessages: '加载消息中...',
    loadMore: '加载更多消息',
    startConversation: '开始与 {} 的对话',
    welcomeToGroup: '欢迎加入 {}',
    
    // 错误消息
    loginFailed: '登录失败，请重试',
    loginError: '登录错误',
    lineLoginError: 'LINE登录出现错误',
    authFailed: '认证失败，请重试',
    loginParamsMissing: '登录参数缺失',
    redirectFailed: '重定向失败，请重试',
    addFriendFailed: '添加好友失败',
    createGroupFailed: '创建群聊失败',
    loadChatsFailed: '无法加载聊天列表',
    loadFriendsFailed: '无法加载好友列表',
    loadGroupsFailed: '无法加载群聊列表',
    getLocationFailed: '获取位置失败',
    translationError: '翻译错误',
    webrtcNetworkRestricted: '当前网络环境限制导致通话无法建立，请切换到手机数据流量后重试',
    mediaPermissionDenied: '无法访问摄像头或麦克风，请检查浏览器权限设置',
    failedToAcceptFriend: '接受好友请求失败',
    failedToDeclineFriend: '拒绝好友请求失败',
    alreadyFriends: '你们已经是好友了',
    friendRequestAlreadySent: '好友请求已发送过了',
    cannotAddYourself: '不能添加自己为好友',
    
    // 成功消息
    friendRequestSent: '好友请求已发送',
    friendRequestAccepted: '好友请求已接受',
    friendRequestDeclined: '好友请求已拒绝',
    groupCreated: '群聊创建成功',
    callInviteSent: '已邀请 {} 位好友加入{}通话',
    
    // 对话框内容
    switchLanguage: '切换语言',
    switchLanguageConfirm: '确定要切换到 {} 吗？',
    uiWillShow: '• UI界面将显示为该语言',
    uiWillShowEnglish: '• UI界面将使用英文显示',
    onlyChatTranslation: '• 仅支持聊天消息翻译功能',
    applying: '应用中...',
    
    // Language Picker
    languageSearchPlaceholder: '搜索/Search/検索/ค้นหา/Cari/Tìm kiếm',
    chatTranslationOnly: '(聊天翻译)',
    chatTranslationNote: '• <strong>聊天翻译</strong>：বাংলা、اردو、Türkçe、Tiếng Việt 等支持聊天翻译，UI使用英文',
    fullUiSupport: '完整UI翻译支持的语言',
    fullUiSupportLanguages: '简体中文、English、ไทย、日本語、Bahasa Indonesia、Español、Français、العربية、हिन्दी、Deutsch、Русский、Português',
    uiAutoAdapt: 'UI语言自动适配',
    uiAutoAdaptNote: '系统UI语言根据您的浏览器自动适配，此设置仅控制您接收的消息语言。',
    
    // 登录页面
    appDescription: '多语言即时沟通系统',
    loginWithLine: '使用 LINE 登录',
    chatWithWorldFriends: '全世界都听得懂！',
    supportsMultilingualTranslation: '支持多语言翻译功能',
    supportedLanguages: '中文 • English • ไทย • 日本語 • Bahasa Indonesia • Español • Français • العربية • हिन्दी • Deutsch • Русский • Português',
    guestLogin: '立即体验',
    sixDigitSignup: '6位数注册',
    usernameSignup: '用户名注册',
    lineLogin: 'LINE登录',
    connectWithoutBarriers: '全世界都听得懂！',
    
    // 验证消息
    enterUsername: '请输入用户名进行搜索',
    enterGroupName: '请输入群聊名称',
    selectOneFriend: '请至少选择一位好友',
    groupNeedAtLeastThreePeople: '建群至少需要3人（包括您自己），请再选择至少2位好友',
    
    // 开发
    inDevelopment: '开发中...',
    
    // New Profile Menu Items
    myServices: '我的服务',
    myFavorites: '我的收藏',
    myDiscovery: '我的发现',
    ordersAndPoints: '订单和积分',
    emoticons: '表情包',
    personalProfile: '个人资料',
    accountSecurity: '账号安全',
    friendPermissions: '添加好友',
    userAgreement: '用户协议',
    privacyPolicy: '隐私政策',
    
    // 账号类型
    personalAccount: '个人账号',
    accountId: '账号ID',
    personal: '个人',
    creator: '自媒体',
    enterprise: '企业',
    noOtherAccounts: '暂无其他账号',
    
    // 新增菜单项
    services: '服务',
    stickers: '表情包',
    
    // 商城功能
    orders: '订单',
    order: '订单',
    cart: '购物车',
    points: '积分',
    wallet: '钱包',
    myOrders: '我的订单',
    myCart: '我的购物车',
    myPoints: '我的积分',
    myWallet: '我的钱包',
    noOrders: '暂无订单',
    noCartItems: '购物车为空',
    totalPoints: '总积分',
    balance: '余额',
    availableBalance: '可用余额',
    emptyState: '暂无数据',
    totalSpent: '累计消费',
    orderCount: '订单数',
    lastPayment: '最近支付',
    viewOrders: '查看订单',
    goShopping: '去购物',
    transactionHistory: '交易记录',
    viewAll: '查看全部',
    noTransactions: '暂无交易记录',
    completed: '已完成',
    processing: '处理中',
    failed: '失败',
    orderStatus: '订单状态',
    orderDetails: '订单详情',
    orderItems: '商品明细',
    orderTime: '下单时间',
    paymentStatus: '支付状态',
    paid: '已支付',
    pending: '待支付',
    cancelled: '已取消',
    
    // 好友请求
    friendRequests: '好友请求',
    wantsToBeYourFriend: '想要成为你的好友',
    accept: '接受',
    decline: '拒绝',
    
    // Membership Cards
    myMembershipCards: '我的会员卡',
    membershipTierRegular: '普通会员',
    membershipTierSilver: '银卡会员',
    membershipTierGold: '金卡会员',
    membershipTierPlatinum: '白金会员',
    currentPoints: '当前积分',
    pointsSuffix: '分',
    
    // Account Types
    lineAccount: 'LINE账号',
    phoneAccount: '手机账号',
    guestAccount: '访客账号',
    
    // PWA Installation
    installSuccess: '安装成功！',
    appInstalledSuccessfully: 'Trustalk 已成功添加到您的主屏幕',
    iosInstallGuide: 'iOS 安装指南',
    iosInstallInstructions: '请点击浏览器底部的分享按钮，然后选择\'添加到主屏幕\'',
    manualInstall: '手动安装',
    manualInstallInstructions: '请在浏览器菜单中选择\'添加到主屏幕\'或\'安装应用\'',
    addToHomeScreen: '添加到桌面',
    installLikeApp: '一键安装，像App一样使用',
    
    // Friend Request Toasts
    friendRequestAcceptedToast: '好友请求已接受',
    friendAddedSuccessfully: '您已成功添加新好友',
    operationFailed: '操作失败',
    acceptFriendRequestFailed: '接受好友请求失败，请重试',
    friendRequestDeclinedToast: '好友请求已拒绝',
    friendRequestDeclinedMessage: '已拒绝该好友请求',
    declineFriendRequestFailed: '拒绝好友请求失败，请重试',
    pendingFriendRequests: '待处理好友请求',
    noFriendRequests: '暂无好友请求',
    
    // New page content
    comingSoon: '即将推出',
    noFavorites: '暂无收藏',
    noEmoticons: '暂无表情包',
    username: '用户名',
    firstName: '名字',
    lastName: '姓氏',
    nickname: '昵称',
    phoneNumber: '手机号码',
    languagePreference: '语言偏好',
    notSet: '未设置',
    memberSince: '注册时间',
    editProfile: '编辑资料',
    saveChanges: '保存更改',
    editing: '编辑中',
    usernameTaken: '用户名已被占用',
    profileUpdateSuccess: '资料更新成功',
    profileUpdateFailed: '资料更新失败',
    selectLanguage: '选择语言',
    usernameRequired: '用户名不能为空',
    firstNameRequired: '名字不能为空',
    upgradeForSecurity: '升级账号以获得更好的安全性',
    accountType: '账号类型',
    linkedAccounts: '关联账号',
    lineAndPhone: 'LINE 和 手机',
    lineOnly: '仅 LINE',
    phoneOnly: '仅手机',
    none: '无',
    changePassword: '修改密码',
    twoFactorAuth: '两步验证',
    notEnabled: '未启用',
    securityTips: '安全提示',
    securityTip1: '定期更换密码，使用强密码',
    securityTip2: '不要与他人分享您的账号信息',
    securityTip3: '启用两步验证以增强账号安全',

    // Invite System
    invite_friends: '邀请好友',
    invite_to_chat: '邀请到此聊天',
    invite_to_group: '邀请加入群聊',
    sms: '短信',
    email: '邮件',
    invite_to_yulink: '邀请你加入Trustalk聊天',
    copied: '已复制',
    invite_link_copied: '邀请链接已复制',
    generating_link: '生成链接中...',
    show_qr_code: '显示二维码',
    scan_to_join: '扫码加入',
    share_link: '分享链接',
    share_to_platform: '分享到平台',
    invite_tips_title: '邀请提示',
    invite_tip_1: '邀请链接7天有效，过期后需重新生成',
    invite_tip_2: '受邀者可直接加入，无需注册',
    invite_tip_3: '支持多语言自动翻译和语音视频通话',
    invite_message: '加入我在{appName}的{roomName}！',
    failed_to_generate_invite_link: '生成邀请链接失败',
    invite_accepted_successfully: '邀请接受成功',
    failed_to_accept_invite: '接受邀请失败',
    invite_link_expired: '邀请链接已过期',
    invalid_invite_link: '邀请链接无效',
    invite_error: '邀请错误',
    back_to_home: '返回首页',
    multilingual_instant_communication: '多语言即时沟通',
    youre_invited_to_join: '邀请你加入',
    click_accept_to_join_conversation: '点击接受邀请加入会话',
    auto_translation: '自动翻译',
    cross_language_communication: '跨语言无障碍沟通',
    voice_video_calls: '语音视频通话',
    high_quality_communication: '高质量实时通信',
    group_chat: '群组聊天',
    connect_with_friends: '与朋友保持联系',
    accepting: '接受中...',
    processing_invite: '正在处理邀请...',
    accept_invitation: '接受邀请',
    by_accepting_you_agree: '接受邀请即表示你同意',
    terms_and_privacy: '使用条款和隐私政策',
    
    // Profile Edit
    pleaseSelectImage: '请选择图片',
    avatarUpdated: '头像已更新',
    uploadFailed: '上传失败',
    profileUpdated: '个人资料已更新',
    uploading: '上传中...',
    tapToChangeAvatar: '点击更换头像',
    enterFirstName: '请输入名字',
    enterLastName: '请输入姓氏',
    profileEditNote: '修改后的信息将对所有好友可见',
    accountIdCopied: '账号ID已复制',
    copyFailed: '复制失败',
    
    // Service Center
    serviceCenter: '服务中心',
    accountAndIdentity: '账号与身份',
    myWorkAccounts: '我的工作号',
    manageEnterpriseIdentities: '查看/管理企业工作身份',
    myCreatorAccounts: '我的发现号',
    manageContentCreatorIdentities: '查看/管理内容创作身份',
    applyEnterpriseAccount: '申请企业号',
    createEnterpriseWizard: '进入企业号创建向导',
    oaContentUpload: '内容/商品上传',
    oaProductUpload: '商品上传',
    oaContentManagement: '内容/商品管理',
    oaProductManagement: '商品管理',
    oaPublishContent: '发布内容',
    oaUploadProduct: '上传产品',
    oaArticle: '图文',
    oaVideo: '视频',
    oaProduct: '商品',
    oaTitle: '标题',
    oaTitlePlaceholder: '请输入标题',
    oaDescription: '描述',
    oaDescriptionPlaceholder: '请输入描述',
    oaSelectVideo: '选择视频',
    oaVideoCover: '视频封面（可选）',
    oaUploadImages: '上传图片',
    oaMaxImages: '最多9张',
    oaProductCover: '商品封面',
    oaPrice: '价格',
    oaPricePlaceholder: '请输入价格',
    oaPublish: '发布',
    oaPublishing: '发布中...',
    oaNoContent: '暂无内容，点击上方"发布内容"开始发布',
    oaStartPublish: '开始发布',
    oaNoProducts: '暂无商品，点击上方"上传产品"开始上传',
    oaUploadProductFirst: '暂无商品，请先上传商品',
    oaViews: '浏览',
    oaLikes: '点赞',
    oaBindProduct: '绑定商品推广',
    oaBoundProduct: '已绑定商品',
    oaSelectProductToBind: '选择要在内容中推广的商品',
    oaUnbind: '取消绑定',
    oaClose: '关闭',
    oaContentList: '内容列表',
    oaProductList: '商品列表',
    oaPublishSuccess: '发布成功',
    oaPublishFailed: '发布失败',
    oaDeleteSuccess: '删除成功',
    oaDeleteFailed: '删除失败',
    oaBindSuccess: '绑定成功',
    oaBindFailed: '绑定失败',
    oaStatContent: '总作品数',
    oaStatFollowers: '总粉丝数',
    oaStatViews: '总播放量',
    oaStatEarnings: '本月收益',
    oaDrafts: '草稿箱',
    oaOnline: '已上架',
    oaTrash: '回收桶',
    oaMoveToBin: '移至回收桶',
    oaRestore: '恢复',
    oaPermanentDelete: '永久删除',
    oaRestoreSuccess: '已恢复',
    oaAll: '全部',
    close: '关闭',
    followNow: '立即关注',
    following: '已关注',
    saySmething: '说点什么...',
    noImage: '暂无图片',
    contentNotFound: '内容不存在或已被删除',
    viewProduct: '查看',
    tagsLabel: '标签',
    invalidDate: '日期无效',
    shareSuccess: '分享成功',
    shareFailed: '分享失败',
    linkCopied: '链接已复制',
    copiedToClipboard: '已复制到剪贴板',
    lineOaInviteTitle: '这是我的多语言LINE账号',
    lineOaInviteDesc: '点击打开关注我就能实现多语言沟通了！',
    lineOaFollowMe: '在LINE上关注我',
    lineOaLoginToConnect: '登录后开始多语言聊天'
  },
  en: {
    chats: 'Chats',
    friends: 'Friends',
    groups: 'Groups',
    profile: 'Profile',
    discover: 'Discover',
    shop: 'Shopping',
    worldInbox: 'World Inbox',
    add: 'Add',
    cancel: 'Cancel',
    create: 'Create',
    send: 'Send',
    sent: 'Sent',
    back: 'Back',
    settings: 'Settings',
    logout: 'Logout',
    inviteFriends: 'Invite Friends',
    scanQR: 'Scan QR',
    all: 'All',
    you: 'You',
    other: 'Other',
    original: 'Original',
    bind: 'Bind',
    confirm: 'Confirm',
    delete: 'Delete',
    save: 'Save',
    saving: 'Saving',
    copy: 'Copy',
    search: 'Search',
    share: 'Share',
    friendsList: 'Friends List',
    addFriend: 'Add Friend',
    friendId: 'Friend ID',
    addFriendPlaceholder: 'Enter friend ID or phone...',
    newFriendRequest: 'New friend request',
    acceptFriendRequest: 'Accept',
    rejectFriendRequest: 'Reject',
    groupsList: 'Groups List',
    createGroup: 'Create Group',
    groupName: 'Group Name',
    groupNamePlaceholder: 'Enter group name...',
    selectMembers: 'Select Members',
    selectedMembers: 'Selected Members',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    searchFriends: 'Search Friends',
    noSearchResults: 'No matching friends found',
    typeMessage: 'Type a message...',
    online: 'Online',
    offline: 'Offline',
    translating: 'Translating...',
    aiAssistantName: 'My Assistant',
    autoTranslated: 'Auto-translated',
    typeInYourLanguage: 'Type in your familiar language · Auto-translate & send',
    worldChatPlaceholder: 'Type in your familiar language here, they will see their version…',
    myQrCode: 'My QR Code',
    languageSettings: 'Language Settings',
    voiceSettings: 'Voice Settings',
    voiceSettingsDesc: 'Set voice preferences for messages and calls',
    remoteVoiceForMe: 'Voice I hear from others',
    remoteVoiceForMeDesc: 'When others\' voice is translated to my language',
    myDefaultVoiceForOthers: 'Voice others hear from me',
    myDefaultVoiceForOthersDesc: 'When my voice is translated to others\' language',
    autoCallTranscript: 'Auto-generate call transcript',
    autoCallTranscriptDesc: 'Automatically create bilingual transcript after calls',
    voiceOptionDefault: 'Default',
    voiceOptionMale: 'Male',
    voiceOptionFemale: 'Female',
    voiceOptionMaleDeep: 'Deep Male',
    voiceOptionFemaleSweet: 'Sweet Female',
    voiceOptionNeutral: 'Neutral',
    notifications: 'Notifications',
    otherSettings: 'Other Settings',
    myLanguage: 'My Language',
    multilingualCard: 'My QR Code',
    myShareLink: 'My Share Link',
    viewCard: 'View Card',
    qrCodePlaceholder: 'QR Code Placeholder (Scan to add me)',
    scanQRToViewCard: 'Scan QR code to view multilingual card',
    scanQRToAddFriend: 'Scan a friend\'s QR code to add them',
    cameraPermissionDenied: 'Camera permission denied. Please allow camera access in settings',
    externalAccounts: 'External Accounts Management',
    connected: 'Connected',
    notConfigured: 'Not Configured',
    lineNotConfigured: 'LINE Not Configured',
    systemSettings: 'System Settings',
    soundEffects: 'Sound Effects',
    searchChats: 'Search Chats',
    searchContactsOrGroups: 'Search contacts or groups...',
    contacts: 'Contacts',
    group: 'Group',
    noResultsFound: 'No results found',
    tryDifferentKeyword: 'Try a different keyword',
    searchContactsAndGroups: 'Search Contacts and Groups',
    enterNameToSearch: 'Enter a name or group name to search',
    noConversations: 'No conversations',
    worldInboxEmptyHint: 'Messages from external channels will appear here',
    conversationNotFound: 'Conversation not found',
    channelWhatsapp: 'WhatsApp',
    channelWechat: 'WeChat',
    channelLine: 'LINE',
    channelMessenger: 'Messenger',
    channelTelegram: 'Telegram',
    channelInstagram: 'Instagram',
    channelViber: 'Viber',
    chinese: 'Chinese',
    thai: 'Thai',
    english: 'English',
    japanese: 'Japanese',
    indonesian: 'Indonesian',
    spanish: 'Spanish',
    french: 'French',
    arabic: 'Arabic',
    hindi: 'Hindi',
    german: 'German',
    russian: 'Russian',
    portuguese: 'Portuguese',
    searchUsers: 'Search Users',
    searchPlaceholder: 'Search...',
    searchResults: 'Search Results',
    searching: 'Searching...',
    noUsersFound: 'No users found',
    addByUsername: 'Add by username',
    
    // Guest User
    guestAccountNotice: 'Guest Account Notice',
    upgradeToInviteFriends: 'Upgrade your account to invite friends and join conversations',
    upgradeAccount: 'Upgrade Account',
    guestChatRestricted: 'Guest Account Limitation',
    guestUpgradeToChatWithFriends: 'Guest users can only chat with AI Assistant. Please upgrade to chat with friends.',
    upgradeNow: 'Upgrade Now',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    saved: 'Saved',
    saveFailed: 'Save failed',
    justNow: 'Just now',
    minutesAgo: 'minutes ago',
    hoursAgo: 'hours ago',
    yesterday: 'Yesterday',
    daysAgo: 'days ago',
    noMessages: 'No messages',
    mePrefix: 'Me: ',
    unknownUser: 'Unknown user',
    groupLabel: '(Group)',
    emptyChatsHint: 'No chats yet, add friends or create groups to get started!',
    chatInfo: 'Chat Info',
    searchChatHistory: 'Search Chat History',
    clearChatHistory: 'Clear Chat History',
    muteNotifications: 'Mute Notifications',
    pinChat: 'Pin Chat',
    reminders: 'Reminders',
    setChatBackground: 'Set Chat Background',
    report: 'Report',
    selectFunction: 'Select Function',
    gallery: 'Gallery',
    camera: 'Camera',
    voiceCall: 'Voice Call',
    location: 'Location',
    file: 'File',
    favorites: 'Favorites',
    businessCard: 'Business Card',
    videoCall: 'Video Call',
    voiceCallNeedSDK: 'Voice call feature requires WebRTC/third-party SDK integration',
    videoCallNeedSDK: 'Video call feature requires WebRTC/third-party SDK integration',
    favoritesNotImplemented: 'Favorites feature is not yet implemented',
    locationPermissionError: 'Unable to get current location, please check location permissions',
    locationNotSupported: 'Location services are not supported on this device',
    viewLocation: 'View Location',
    clickToOpenMaps: 'Click to open Google Maps',
    businessCardPrefix: 'Business Card',
    emailLabel: 'Email',
    phoneLabel: 'Phone',
    phoneNotSet: 'Not set',
    selectContact: 'Select Contact',
    searchContacts: 'Search contacts',
    myCard: 'My Card',
    inviteToCall: 'Invite to Call',
    noFriends: 'No friends',
    invite: 'Invite',
    
    // New fields
    emptyChatRecord: 'No chat records yet, add friends or join groups to start!',
    noGroupsHint: 'No groups yet, create a group to start!',
    noFriendsHint: 'No friends yet, add some friends!',
    loadingMessages: 'Loading messages...',
    loadMore: 'Load more messages',
    startConversation: 'Start conversation with {}',
    welcomeToGroup: 'Welcome to {}',
    
    // Error messages
    loginFailed: 'Login failed, please try again',
    loginError: 'Login error',
    lineLoginError: 'LINE login error occurred',
    authFailed: 'Authentication failed, please try again',
    loginParamsMissing: 'Login parameters missing',
    redirectFailed: 'Redirect failed, please try again',
    addFriendFailed: 'Failed to add friend',
    createGroupFailed: 'Failed to create group',
    loadChatsFailed: 'Unable to load chat list',
    loadFriendsFailed: 'Unable to load friends list',
    loadGroupsFailed: 'Unable to load groups list',
    getLocationFailed: 'Failed to get location',
    translationError: 'Translation error',
    webrtcNetworkRestricted: 'Network restrictions prevent establishing a call. Switch to mobile data (4G/5G) and retry',
    mediaPermissionDenied: 'Microphone/Camera permission denied. Please allow access and try again',
    failedToAcceptFriend: 'Failed to accept friend request',
    failedToDeclineFriend: 'Failed to decline friend request',
    alreadyFriends: 'Already friends',
    friendRequestAlreadySent: 'Friend request already sent',
    cannotAddYourself: 'Cannot add yourself as friend',
    
    // Success messages
    friendRequestSent: 'Friend request sent',
    friendRequestAccepted: 'Friend request accepted',
    friendRequestDeclined: 'Friend request declined',
    groupCreated: 'Group created successfully',
    callInviteSent: 'Invited {} friends to {} call',
    
    // Dialog content
    switchLanguage: 'Switch Language',
    switchLanguageConfirm: 'Are you sure you want to switch to {}?',
    uiWillShow: '• UI will be displayed in this language',
    uiWillShowEnglish: '• UI will be displayed in English',
    onlyChatTranslation: '• Only supports chat message translation',
    applying: 'Applying...',
    
    // Language Picker
    languageSearchPlaceholder: '搜索/Search/検索/ค้นหา/Cari/Tìm kiếm',
    chatTranslationOnly: '(Chat Translation)',
    chatTranslationNote: '• <strong>Chat Translation</strong>: বাংলা, اردو, Türkçe, Tiếng Việt support chat translation with English UI',
    fullUiSupport: 'Languages with Full UI Translation Support',
    fullUiSupportLanguages: '简体中文、English、ไทย、日本語、Bahasa Indonesia、Español、Français、العربية、हिन्दी、Deutsch、Русский、Português',
    uiAutoAdapt: 'UI Auto-Adapts to Browser Language',
    uiAutoAdaptNote: 'System UI language automatically adapts to your browser. This setting only controls the language of messages you receive.',
    
    // Login page
    appDescription: 'Multilingual instant communication system',
    loginWithLine: 'Sign in with LINE',
    chatWithWorldFriends: 'Communication without barriers',
    guestLogin: 'Try Now',
    sixDigitSignup: '6-Digit ID',
    usernameSignup: 'Username',
    lineLogin: 'LINE Login',
    connectWithoutBarriers: 'Communication without barriers',
    
    // Validation messages
    enterUsername: 'Please enter username to search',
    enterGroupName: 'Please enter group name',
    selectOneFriend: 'Please select at least one friend',
    groupNeedAtLeastThreePeople: 'Groups require at least 3 people (including yourself). Please select at least 2 more friends',
    
    // Development
    inDevelopment: 'In development...',
    
    // New Profile Menu Items
    myServices: 'My Services',
    myFavorites: 'My Favorites',
    myDiscovery: 'My Discovery',
    ordersAndPoints: 'Orders & Points',
    emoticons: 'Emoticons',
    personalProfile: 'Personal Profile',
    accountSecurity: 'Account Security',
    friendPermissions: 'Add Friends',
    userAgreement: 'User Agreement',
    privacyPolicy: 'Privacy Policy',
    
    // Account types
    personalAccount: 'Personal Account',
    accountId: 'Account ID',
    personal: 'Personal',
    creator: 'Creator',
    enterprise: 'Enterprise',
    noOtherAccounts: 'No other accounts',
    
    services: 'Services',
    stickers: 'Stickers',
    
    // Commerce
    orders: 'Orders',
    order: 'Order',
    cart: 'Cart',
    points: 'Points',
    wallet: 'Wallet',
    myOrders: 'My Orders',
    myCart: 'My Cart',
    myPoints: 'My Points',
    myWallet: 'My Wallet',
    noOrders: 'No orders yet',
    noCartItems: 'Cart is empty',
    totalPoints: 'Total Points',
    balance: 'Balance',
    availableBalance: 'Available Balance',
    emptyState: 'No data',
    totalSpent: 'Total Spent',
    orderCount: 'Orders',
    lastPayment: 'Last Payment',
    viewOrders: 'View Orders',
    goShopping: 'Go Shopping',
    transactionHistory: 'Transaction History',
    viewAll: 'View All',
    noTransactions: 'No transactions yet',
    completed: 'Completed',
    processing: 'Processing',
    failed: 'Failed',
    orderStatus: 'Order Status',
    orderDetails: 'Order Details',
    orderItems: 'Items',
    orderTime: 'Order Time',
    paymentStatus: 'Payment Status',
    paid: 'Paid',
    pending: 'Pending',
    cancelled: 'Cancelled',
    
    // Friend requests
    friendRequests: 'Friend Requests',
    wantsToBeYourFriend: 'wants to be your friend',
    accept: 'Accept',
    decline: 'Decline',
    
    // Membership Cards
    myMembershipCards: 'My Membership Cards',
    membershipTierRegular: 'Regular Member',
    membershipTierSilver: 'Silver Member',
    membershipTierGold: 'Gold Member',
    membershipTierPlatinum: 'Platinum Member',
    currentPoints: 'Current Points',
    pointsSuffix: 'pts',
    
    // Account Types
    lineAccount: 'LINE Account',
    phoneAccount: 'Phone Account',
    guestAccount: 'Guest Account',
    
    // PWA Installation
    installSuccess: 'Installation Successful!',
    appInstalledSuccessfully: 'Trustalk has been successfully added to your home screen',
    iosInstallGuide: 'iOS Installation Guide',
    iosInstallInstructions: 'Please tap the share button at the bottom of the browser, then select \'Add to Home Screen\'',
    manualInstall: 'Manual Installation',
    manualInstallInstructions: 'Please select \'Add to Home Screen\' or \'Install App\' in your browser menu',
    addToHomeScreen: 'Add to Home Screen',
    installLikeApp: 'Install with one tap, use like an app',
    
    // Friend Request Toasts
    friendRequestAcceptedToast: 'Friend Request Accepted',
    friendAddedSuccessfully: 'You have successfully added a new friend',
    operationFailed: 'Operation Failed',
    acceptFriendRequestFailed: 'Failed to accept friend request, please try again',
    friendRequestDeclinedToast: 'Friend Request Declined',
    friendRequestDeclinedMessage: 'The friend request has been declined',
    declineFriendRequestFailed: 'Failed to decline friend request, please try again',
    pendingFriendRequests: 'Pending Friend Requests',
    noFriendRequests: 'No Friend Requests',
    
    // New page content
    comingSoon: 'Coming Soon',
    noFavorites: 'No Favorites',
    noEmoticons: 'No Emoticons',
    username: 'Username',
    firstName: 'First Name',
    lastName: 'Last Name',
    nickname: 'Nickname',
    phoneNumber: 'Phone Number',
    languagePreference: 'Language Preference',
    notSet: 'Not Set',
    memberSince: 'Member Since',
    editProfile: 'Edit Profile',
    saveChanges: 'Save Changes',
    editing: 'Editing',
    usernameTaken: 'Username is already taken',
    profileUpdateSuccess: 'Profile updated successfully',
    profileUpdateFailed: 'Failed to update profile',
    selectLanguage: 'Select Language',
    usernameRequired: 'Username is required',
    firstNameRequired: 'First name is required',
    upgradeForSecurity: 'Upgrade your account for better security',
    accountType: 'Account Type',
    linkedAccounts: 'Linked Accounts',
    lineAndPhone: 'LINE and Phone',
    lineOnly: 'LINE Only',
    phoneOnly: 'Phone Only',
    none: 'None',
    changePassword: 'Change Password',
    twoFactorAuth: 'Two-Factor Authentication',
    notEnabled: 'Not Enabled',
    securityTips: 'Security Tips',
    securityTip1: 'Change your password regularly and use strong passwords',
    securityTip2: 'Do not share your account information with others',
    securityTip3: 'Enable two-factor authentication for enhanced security',
    
    supportsMultilingualTranslation: 'Supports multi-language translation',
    supportedLanguages: 'Chinese • English • Thai • Japanese • Indonesian • Spanish • French • Arabic • Hindi • German • Russian • Portuguese',

    // Invite System
    invite_friends: 'Invite Friends',
    invite_to_group: 'Invite to Group',
    invite_to_chat: 'Invite to Chat',
    sms: 'SMS',
    email: 'Email',
    invite_to_yulink: 'Invite you to join Trustalk chat',
    copied: 'Copied',
    invite_link_copied: 'Invite link copied',
    generating_link: 'Generating link...',
    show_qr_code: 'Show QR Code',
    scan_to_join: 'Scan to join',
    share_link: 'Share Link',
    share_to_platform: 'Share to Platform',
    invite_tips_title: 'Invite Tips',
    invite_tip_1: 'Invite links are valid for 7 days, regenerate after expiration',
    invite_tip_2: 'Recipients can join directly without registration',
    invite_tip_3: 'Supports multi-language auto-translation and voice/video calls',
    invite_message: 'Join my {roomName} on {appName}!',
    failed_to_generate_invite_link: 'Failed to generate invite link',
    invite_accepted_successfully: 'Invitation accepted successfully',
    failed_to_accept_invite: 'Failed to accept invitation',
    invite_link_expired: 'Invite link has expired',
    invalid_invite_link: 'Invalid invite link',
    invite_error: 'Invitation Error',
    back_to_home: 'Back to Home',
    multilingual_instant_communication: 'Multilingual Instant Communication',
    youre_invited_to_join: 'You\'re invited to join',
    click_accept_to_join_conversation: 'Click accept to join conversation',
    auto_translation: 'Auto Translation',
    cross_language_communication: 'Cross-language barrier-free communication',
    voice_video_calls: 'Voice & Video Calls',
    high_quality_communication: 'High-quality real-time communication',
    group_chat: 'Group Chat',
    connect_with_friends: 'Stay connected with friends',
    accepting: 'Accepting...',
    processing_invite: 'Processing invitation...',
    accept_invitation: 'Accept Invitation',
    by_accepting_you_agree: 'By accepting, you agree to',
    terms_and_privacy: 'Terms of Service and Privacy Policy',
    
    // Profile Edit
    pleaseSelectImage: 'Please select an image',
    avatarUpdated: 'Avatar updated',
    uploadFailed: 'Upload failed',
    profileUpdated: 'Profile updated',
    uploading: 'Uploading...',
    tapToChangeAvatar: 'Tap to change avatar',
    enterFirstName: 'Please enter first name',
    enterLastName: 'Please enter last name',
    profileEditNote: 'Changed information will be visible to all friends',
    accountIdCopied: 'Account ID copied',
    copyFailed: 'Copy failed',
    
    // Service Center
    serviceCenter: 'Service Center',
    accountAndIdentity: 'Account & Identity',
    myWorkAccounts: 'My Work Accounts',
    manageEnterpriseIdentities: 'View/manage enterprise identities',
    myCreatorAccounts: 'My Creator Accounts',
    manageContentCreatorIdentities: 'View/manage creator identities',
    applyEnterpriseAccount: 'Apply for Enterprise Account',
    createEnterpriseWizard: 'Enter enterprise creation wizard',
    oaContentUpload: 'Content/Product Upload',
    oaProductUpload: 'Product Upload',
    oaContentManagement: 'Content/Product Management',
    oaProductManagement: 'Product Management',
    oaPublishContent: 'Publish Content',
    oaUploadProduct: 'Upload Product',
    oaArticle: 'Article',
    oaVideo: 'Video',
    oaProduct: 'Product',
    oaTitle: 'Title',
    oaTitlePlaceholder: 'Enter title',
    oaDescription: 'Description',
    oaDescriptionPlaceholder: 'Enter description',
    oaSelectVideo: 'Select Video',
    oaVideoCover: 'Video Cover (Optional)',
    oaUploadImages: 'Upload Images',
    oaMaxImages: 'Max 9 images',
    oaProductCover: 'Product Cover',
    oaPrice: 'Price',
    oaPricePlaceholder: 'Enter price',
    oaPublish: 'Publish',
    oaPublishing: 'Publishing...',
    oaNoContent: 'No content yet, click "Publish Content" to start',
    oaStartPublish: 'Start Publishing',
    oaNoProducts: 'No products yet, click "Upload Product" to start',
    oaUploadProductFirst: 'No products yet, please upload a product first',
    oaViews: 'Views',
    oaLikes: 'Likes',
    oaBindProduct: 'Bind Product Promotion',
    oaBoundProduct: 'Product Bound',
    oaSelectProductToBind: 'Select a product to promote in this content',
    oaUnbind: 'Unbind',
    oaClose: 'Close',
    oaContentList: 'Content List',
    oaProductList: 'Product List',
    oaPublishSuccess: 'Published successfully',
    oaPublishFailed: 'Failed to publish',
    oaDeleteSuccess: 'Deleted successfully',
    oaDeleteFailed: 'Failed to delete',
    oaBindSuccess: 'Bound successfully',
    oaBindFailed: 'Failed to bind',
    oaStatContent: 'Total Works',
    oaStatFollowers: 'Total Followers',
    oaStatViews: 'Total Views',
    oaStatEarnings: 'Monthly Earnings',
    oaDrafts: 'Drafts',
    oaOnline: 'Published',
    oaTrash: 'Trash',
    oaMoveToBin: 'Move to Trash',
    oaRestore: 'Restore',
    oaPermanentDelete: 'Delete Permanently',
    oaRestoreSuccess: 'Restored',
    oaAll: 'All',
    close: 'Close',
    followNow: 'Follow',
    following: 'Following',
    saySmething: 'Say something...',
    noImage: 'No image',
    contentNotFound: 'Content not found or deleted',
    viewProduct: 'View',
    tagsLabel: 'Tags',
    invalidDate: 'Invalid date',
    shareSuccess: 'Shared successfully',
    shareFailed: 'Share failed',
    linkCopied: 'Link copied',
    copiedToClipboard: 'Copied to clipboard',
    lineOaInviteTitle: 'This is my multilingual LINE account',
    lineOaInviteDesc: 'Follow me to enable multilingual communication!',
    lineOaFollowMe: 'Follow me on LINE',
    lineOaLoginToConnect: 'Login to start multilingual chat'
  },
  th: {
    chats: 'แชท',
    friends: 'เพื่อน',
    groups: 'กลุ่ม',
    profile: 'โปรไฟล์',
    discover: 'ค้นพบ',
    shop: 'ช้อปปิ้ง',
    worldInbox: 'กล่องจดหมายโลก',
    add: 'เพิ่ม',
    cancel: 'ยกเลิก',
    create: 'สร้าง',
    send: 'ส่ง',
    sent: 'ส่งแล้ว',
    back: 'กลับ',
    settings: 'การตั้งค่า',
    logout: 'ออกจากระบบ',
    inviteFriends: 'เชิญเพื่อน',
    scanQR: 'สแกน QR',
    all: 'ทั้งหมด',
    you: 'คุณ',
    other: 'อีกฝ่าย',
    original: 'ต้นฉบับ',
    bind: 'ผูก',
    friendsList: 'รายชื่อเพื่อน',
    addFriend: 'เพิ่มเพื่อน',
    friendId: 'ID เพื่อน',
    addFriendPlaceholder: 'ป้อน ID เพื่อนหรือเบอร์โทร...',
    newFriendRequest: 'คำขอเป็นเพื่อนใหม่',
    acceptFriendRequest: 'ยอมรับ',
    rejectFriendRequest: 'ปฏิเสธ',
    groupsList: 'รายการกลุ่ม',
    createGroup: 'สร้างกลุ่ม',
    groupName: 'ชื่อกลุ่ม',
    groupNamePlaceholder: 'ป้อนชื่อกลุ่ม...',
    selectMembers: 'เลือกสมาชิก',
    selectedMembers: 'สมาชิกที่เลือก',
    selectAll: 'เลือกทั้งหมด',
    deselectAll: 'ยกเลิกทั้งหมด',
    searchFriends: 'ค้นหาเพื่อน',
    noSearchResults: 'ไม่พบเพื่อนที่ตรงกัน',
    typeMessage: 'พิมพ์ข้อความ...',
    online: 'ออนไลน์',
    offline: 'ออฟไลน์',
    translating: 'กำลังแปล...',
    aiAssistantName: 'ผู้ช่วยของฉัน',
    myQrCode: 'QR Code ของฉัน',
    languageSettings: 'การตั้งค่าภาษา',
    voiceSettings: 'การตั้งค่าเสียง',
    voiceSettingsDesc: 'ตั้งค่าเสียงสำหรับข้อความและการโทร',
    remoteVoiceForMe: 'เสียงที่ฉันได้ยินจากคนอื่น',
    remoteVoiceForMeDesc: 'เมื่อเสียงของคนอื่นถูกแปลเป็นภาษาของฉัน',
    myDefaultVoiceForOthers: 'เสียงที่คนอื่นได้ยินจากฉัน',
    myDefaultVoiceForOthersDesc: 'เมื่อเสียงของฉันถูกแปลเป็นภาษาของคนอื่น',
    autoCallTranscript: 'สร้างบันทึกการโทรอัตโนมัติ',
    autoCallTranscriptDesc: 'สร้างบันทึกสองภาษาหลังจบการโทร',
    voiceOptionDefault: 'ค่าเริ่มต้น',
    voiceOptionMale: 'ชาย',
    voiceOptionFemale: 'หญิง',
    voiceOptionMaleDeep: 'ชายเสียงทุ้ม',
    voiceOptionFemaleSweet: 'หญิงเสียงหวาน',
    voiceOptionNeutral: 'เป็นกลาง',
    notifications: 'การแจ้งเตือน',
    otherSettings: 'การตั้งค่าอื่นๆ',
    myLanguage: 'ภาษาของฉัน',
    multilingualCard: 'QR Code ของฉัน',
    myShareLink: 'ลิงก์แชร์ของฉัน',
    viewCard: 'ดูบัตร',
    qrCodePlaceholder: 'QR Code (สแกนเพื่อเพิ่มฉัน)',
    scanQRToViewCard: 'สแกน QR เพื่อดูบัตรหลายภาษา',
    scanQRToAddFriend: 'สแกน QR ของเพื่อนเพื่อเพิ่มเขา',
    cameraPermissionDenied: 'ไม่อนุญาตให้เข้าถึงกล้อง กรุณาอนุญาตการเข้าถึงกล้องในการตั้งค่า',
    externalAccounts: 'การจัดการบัญชีภายนอก',
    connected: 'เชื่อมต่อแล้ว',
    notConfigured: 'ยังไม่ได้กำหนดค่า',
    lineNotConfigured: 'LINE ยังไม่ได้กำหนดค่า',
    systemSettings: 'การจัดการระบบ',
    soundEffects: 'การจัดการเอฟเฟกต์เสียง',
    searchChats: 'ค้นหาแชท',
    searchContactsOrGroups: 'ค้นหาผู้ติดต่อหรือกลุ่ม...',
    contacts: 'ผู้ติดต่อ',
    group: 'กลุ่ม',
    noResultsFound: 'ไม่พบผลลัพธ์',
    tryDifferentKeyword: 'ลองใช้คำค้นหาอื่น',
    searchContactsAndGroups: 'ค้นหาผู้ติดต่อและกลุ่ม',
    enterNameToSearch: 'ป้อนชื่อหรือชื่อกลุ่มเพื่อค้นหา',
    
    // Guest User
    guestAccountNotice: 'การแจ้งเตือนบัญชีแขก',
    upgradeToInviteFriends: 'อัพเกรดบัญชีเพื่อเชิญเพื่อนและเข้าร่วมการสนทนา',
    upgradeAccount: 'อัพเกรดบัญชี',
    guestChatRestricted: 'ข้อจำกัดบัญชีแขก',
    guestUpgradeToChatWithFriends: 'ผู้เยี่ยมชมสามารถแชทกับผู้ช่วย AI เท่านั้น กรุณาอัพเกรดเพื่อแชทกับเพื่อน',
    upgradeNow: 'อัพเกรดทันที',
    loading: 'กำลังโหลด...',
    error: 'ข้อผิดพลาด',
    success: 'สำเร็จ',
    saved: 'บันทึกแล้ว',
    saveFailed: 'บันทึกไม่สำเร็จ',
    justNow: 'เมื่อกี้',
    minutesAgo: 'นาทีที่แล้ว',
    hoursAgo: 'ชั่วโมงที่แล้ว',
    yesterday: 'เมื่อวาน',
    daysAgo: 'วันที่แล้ว',
    noMessages: 'ไม่มีข้อความ',
    mePrefix: 'ฉัน: ',
    unknownUser: 'ผู้ใช้ที่ไม่รู้จัก',
    groupLabel: '(กลุ่ม)',
    emptyChatsHint: 'ยังไม่มีแชท เพิ่มเพื่อนหรือสร้างกลุ่มเพื่อเริ่มต้น!',
    chatInfo: 'ข้อมูลแชท',
    searchChatHistory: 'ค้นหาประวัติแชท',
    clearChatHistory: 'ลบประวัติแชท',
    muteNotifications: 'ปิดเสียงแจ้งเตือน',
    pinChat: 'ตรึงแชท',
    reminders: 'การเตือน',
    setChatBackground: 'ตั้งค่าพื้นหลังแชท',
    report: 'รายงาน',
    selectFunction: 'เลือกฟังก์ชัน',
    gallery: 'แกลลอรี่',
    camera: 'กล้อง',
    voiceCall: 'โทรเสียง',
    location: 'ตำแหน่ง',
    file: 'ไฟล์',
    favorites: 'รายการโปรด',
    businessCard: 'นามบัตร',
    videoCall: 'วิดีโอ',
    voiceCallNeedSDK: 'คุณลักษณะโทรเสียงต้องการ WebRTC/SDK ของบุคคลที่สาม',
    videoCallNeedSDK: 'คุณลักษณะวิดีโอต้องการ WebRTC/SDK ของบุคคลที่สาม',
    favoritesNotImplemented: 'คุณลักษณะรายการโปรดยังไม่ได้พัฒนา',
    locationPermissionError: 'ไม่สามารถรับตำแหน่งปัจจุบัน โปรดตรวจสอบการตั้งค่าสิทธิ์ตำแหน่ง',
    locationNotSupported: 'อุปกรณ์นี้ไม่รองรับบริการตำแหน่ง',
    viewLocation: 'ดูตำแหน่ง',
    clickToOpenMaps: 'คลิกเพื่อเปิด Google Maps',
    businessCardPrefix: 'นามบัตร',
    emailLabel: 'อีเมล',
    phoneLabel: 'โทรศัพท์',
    phoneNotSet: 'ไม่ได้ตั้ง',
    selectContact: 'เลือกผู้ติดต่อ',
    searchContacts: 'ค้นหาผู้ติดต่อ',
    myCard: 'นามบัตรของฉัน',
    inviteToCall: 'เชิญเข้าร่วมการโทร',
    noFriends: 'ไม่มีเพื่อน',
    invite: 'เชิญ',
    
    // New fields
    confirm: 'ยืนยัน',
    delete: 'ลบ',
    save: 'บันทึก',
    saving: 'Saving...',
    copy: 'คัดลอก',
    search: 'ค้นหา',
    share: 'แชร์',
    searchUsers: 'ค้นหาผู้ใช้',
    searchPlaceholder: 'ค้นหาชื่อผู้ใช้, ชื่อ หรืออีเมล...',
    searchResults: 'ผลการค้นหา',
    searching: 'กำลังค้นหา...',
    noUsersFound: 'ไม่พบผู้ใช้ที่ตรงกัน',
    addByUsername: 'เพิ่มเพื่อนด้วยชื่อผู้ใช้',
    channelWhatsapp: 'WhatsApp',
    channelWechat: 'WeChat',
    channelLine: 'LINE',
    channelMessenger: 'Messenger',
    channelTelegram: 'Telegram',
    channelInstagram: 'Instagram',
    channelViber: 'Viber',
    emptyChatRecord: 'ยังไม่มีบันทึกแชท เพิ่มเพื่อนหรือเข้าร่วมกลุ่มเพื่อเริ่มต้น!',
    noGroupsHint: 'ยังไม่มีกลุ่ม สร้างกลุ่มเพื่อเริ่มต้น!',
    noFriendsHint: 'ยังไม่มีเพื่อน เพิ่มเพื่อนสักคนสิ!',
    loadingMessages: 'กำลังโหลดข้อความ...',
    loadMore: 'โหลดข้อความเพิ่มเติม',
    startConversation: 'เริ่มการสนทนากับ {}',
    welcomeToGroup: 'ยินดีต้อนรับสู่ {}',
    
    // Error messages
    loginFailed: 'เข้าสู่ระบบล้มเหลว กรุณาลองใหม่',
    loginError: 'ข้อผิดพลาดในการเข้าสู่ระบบ',
    lineLoginError: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ LINE',
    authFailed: 'การรับรองตัวตนล้มเหลว กรุณาลองใหม่',
    loginParamsMissing: 'พารามิเตอร์การเข้าสู่ระบบขาดหาย',
    redirectFailed: 'การเปลี่ยนเส้นทางล้มเหลว กรุณาลองใหม่',
    addFriendFailed: 'เพิ่มเพื่อนล้มเหลว',
    createGroupFailed: 'สร้างกลุ่มล้มเหลว',
    loadChatsFailed: 'ไม่สามารถโหลดรายการแชทได้',
    loadFriendsFailed: 'ไม่สามารถโหลดรายการเพื่อนได้',
    loadGroupsFailed: 'ไม่สามารถโหลดรายการกลุ่มได้',
    getLocationFailed: 'ไม่สามารถรับตำแหน่งได้',
    translationError: 'ข้อผิดพลาดในการแปล',
    webrtcNetworkRestricted: 'เครือข่ายปัจจุบันไม่สามารถเชื่อมต่อการโทรได้ กรุณาเปลี่ยนไปใช้เครือข่ายมือถือและลองอีกครั้ง',
    mediaPermissionDenied: 'ไม่สามารถเข้าถึงไมโครโฟนหรือกล้อง กรุณาอนุญาตการเข้าถึงและลองอีกครั้ง',
    
    // Success messages
    friendRequestSent: 'ส่งคำขอเป็นเพื่อนแล้ว',
    groupCreated: 'สร้างกลุ่มสำเร็จ',
    callInviteSent: 'เชิญเพื่อน {} คนเข้าร่วมการโทร{}',
    
    // Dialog content
    switchLanguage: 'เปลี่ยนภาษา',
    switchLanguageConfirm: 'คุณแน่ใจหรือไม่ที่จะเปลี่ยนเป็น {}?',
    uiWillShow: '• UI จะแสดงเป็นภาษานี้',
    uiWillShowEnglish: '• UI จะแสดงเป็นภาษาอังกฤษ',
    onlyChatTranslation: '• รองรับเฉพาะการแปลข้อความแชท',
    applying: 'กำลังปรับใช้...',
    
    // Language Picker
    languageSearchPlaceholder: '搜索/Search/検索/ค้นหา/Cari/Tìm kiếm',
    chatTranslationOnly: '(การแปลแชท)',
    chatTranslationNote: '• <strong>การแปลแชท</strong>: বাংলা, اردو, Türkçe, Tiếng Việt รองรับการแปลแชท โดยใช้ UI เป็นภาษาอังกฤษ',
    fullUiSupport: 'ภาษาที่รองรับการแปล UI แบบเต็มรูปแบบ',
    fullUiSupportLanguages: '简体中文、English、ไทย、日本語、Bahasa Indonesia、Español、Français、العربية、हिन्दी、Deutsch、Русский、Português',
    
    // Login page
    appDescription: 'ระบบสื่อสารทันทีหลายภาษา',
    loginWithLine: 'เข้าสู่ระบบด้วย LINE',
    chatWithWorldFriends: 'การสื่อสารไร้ขีดจำกัด',
    supportsMultilingualTranslation: 'รองรับการแปลภาษาหลายภาษา',
    supportedLanguages: 'ไทย • English • 中文 • 日本語 • Bahasa Indonesia • Español • Français • العربية • हिन्दी • Deutsch • Русский • Português',
    guestLogin: 'ทดลองใช้',
    sixDigitSignup: 'ID 6 หลัก',
    usernameSignup: 'ชื่อผู้ใช้',
    lineLogin: 'เข้าสู่ระบบด้วย LINE',
    connectWithoutBarriers: 'การสื่อสารไร้ขีดจำกัด',
    
    // Validation messages
    enterUsername: 'กรุณาป้อนชื่อผู้ใช้เพื่อค้นหา',
    enterGroupName: 'กรุณาป้อนชื่อกลุ่ม',
    selectOneFriend: 'กรุณาเลือกเพื่อนอย่างน้อยหนึ่งคน',
    groupNeedAtLeastThreePeople: 'การสร้างกลุ่มต้องมีอย่างน้อย 3 คน (รวมคุณด้วย) กรุณาเลือกเพื่อนอีกอย่างน้อย 2 คน',
    
    // Development
    inDevelopment: 'กำลังพัฒนา...',
    
    // New Profile Menu Items
    myServices: 'บริการของฉัน',
    myFavorites: 'รายการโปรด',
    myDiscovery: 'การค้นพบของฉัน',
    ordersAndPoints: 'คำสั่งซื้อและคะแนน',
    emoticons: 'อิโมติคอน',
    personalProfile: 'โปรไฟล์ส่วนตัว',
    accountSecurity: 'ความปลอดภัยบัญชี',
    friendPermissions: 'เพิ่มเพื่อน',
    userAgreement: 'ข้อตกลงผู้ใช้',
    privacyPolicy: 'นโยบายความเป็นส่วนตัว',
    
    // Account types
    personalAccount: 'บัญชีส่วนตัว',
    accountId: 'รหัสบัญชี',
    personal: 'ส่วนตัว',
    creator: 'ผู้สร้างคอนเทนต์',
    enterprise: 'องค์กร',
    noOtherAccounts: 'ไม่มีบัญชีอื่น',
    
    services: 'บริการ',
    stickers: 'สติกเกอร์',
    
    // Commerce
    orders: 'คำสั่งซื้อ',
    cart: 'ตะกร้า',
    points: 'คะแนน',
    wallet: 'กระเป๋าเงิน',
    myOrders: 'คำสั่งซื้อของฉัน',
    myCart: 'ตะกร้าของฉัน',
    myPoints: 'คะแนนของฉัน',
    myWallet: 'กระเป๋าเงินของฉัน',
    noOrders: 'ยังไม่มีคำสั่งซื้อ',
    noCartItems: 'ตะกร้าว่างเปล่า',
    totalPoints: 'คะแนนทั้งหมด',
    balance: 'ยอดคงเหลือ',
    availableBalance: 'ยอดคงเหลือที่ใช้ได้',
    emptyState: 'ไม่มีข้อมูล',
    
    // Friend requests
    friendRequests: 'คำขอเป็นเพื่อน',
    wantsToBeYourFriend: 'ต้องการเป็นเพื่อนกับคุณ',
    accept: 'ยอมรับ',
    decline: 'ปฏิเสธ',
    
    // Membership Cards
    myMembershipCards: 'บัตรสมาชิกของฉัน',
    membershipTierRegular: 'สมาชิกทั่วไป',
    membershipTierSilver: 'สมาชิกซิลเวอร์',
    membershipTierGold: 'สมาชิกโกลด์',
    membershipTierPlatinum: 'สมาชิกแพลทินัม',
    currentPoints: 'คะแนนปัจจุบัน',
    pointsSuffix: 'คะแนน',
    
    // Account Types
    lineAccount: 'บัญชี LINE',
    phoneAccount: 'บัญชีโทรศัพท์',
    guestAccount: 'บัญชีแขก',
    
    // PWA Installation
    installSuccess: 'ติดตั้งสำเร็จ!',
    appInstalledSuccessfully: 'Trustalk ถูกเพิ่มลงในหน้าจอหลักของคุณเรียบร้อยแล้ว',
    iosInstallGuide: 'คู่มือการติดตั้ง iOS',
    iosInstallInstructions: 'โปรดแตะปุ่มแชร์ที่ด้านล่างของเบราว์เซอร์ จากนั้นเลือก \'เพิ่มลงในหน้าจอหลัก\'',
    manualInstall: 'การติดตั้งด้วยตนเอง',
    manualInstallInstructions: 'โปรดเลือก \'เพิ่มลงในหน้าจอหลัก\' หรือ \'ติดตั้งแอป\' ในเมนูเบราว์เซอร์',
    addToHomeScreen: 'เพิ่มลงในหน้าจอหลัก',
    installLikeApp: 'ติดตั้งด้วยการแตะเดียว ใช้งานเหมือนแอป',
    
    // Friend Request Toasts
    friendRequestAcceptedToast: 'ยอมรับคำขอเป็นเพื่อนแล้ว',
    friendAddedSuccessfully: 'คุณได้เพิ่มเพื่อนใหม่เรียบร้อยแล้ว',
    operationFailed: 'การดำเนินการล้มเหลว',
    acceptFriendRequestFailed: 'ไม่สามารถยอมรับคำขอเป็นเพื่อนได้ กรุณาลองอีกครั้ง',
    friendRequestDeclinedToast: 'ปฏิเสธคำขอเป็นเพื่อนแล้ว',
    friendRequestDeclinedMessage: 'คำขอเป็นเพื่อนถูกปฏิเสธแล้ว',
    declineFriendRequestFailed: 'ไม่สามารถปฏิเสธคำขอเป็นเพื่อนได้ กรุณาลองอีกครั้ง',
    pendingFriendRequests: 'คำขอเป็นเพื่อนที่รอดำเนินการ',
    noFriendRequests: 'ไม่มีคำขอเป็นเพื่อน',
    
    // New page content
    comingSoon: 'เร็วๆ นี้',
    noFavorites: 'ไม่มีรายการโปรด',
    noEmoticons: 'ไม่มีอิโมติคอน',
    username: 'ชื่อผู้ใช้',
    firstName: 'ชื่อจริง',
    lastName: 'นามสกุล',
    nickname: 'Nickname',
    phoneNumber: 'หมายเลขโทรศัพท์',
    languagePreference: 'ภาษาที่ต้องการ',
    notSet: 'ไม่ได้ตั้งค่า',
    memberSince: 'สมาชิกตั้งแต่',
    editProfile: 'แก้ไขโปรไฟล์',
    saveChanges: 'Save Changes',
    editing: 'Editing',
    usernameTaken: 'Username is already taken',
    profileUpdateSuccess: 'Profile updated successfully',
    profileUpdateFailed: 'Failed to update profile',
    selectLanguage: 'Select Language',
    usernameRequired: 'ต้องระบุชื่อผู้ใช้',
    firstNameRequired: 'ต้องระบุชื่อ',
    upgradeForSecurity: 'อัปเกรดบัญชีของคุณเพื่อความปลอดภัยที่ดีขึ้น',
    accountType: 'ประเภทบัญชี',
    linkedAccounts: 'บัญชีที่เชื่อมโยง',
    lineAndPhone: 'LINE และโทรศัพท์',
    lineOnly: 'เฉพาะ LINE',
    phoneOnly: 'เฉพาะโทรศัพท์',
    none: 'ไม่มี',
    changePassword: 'เปลี่ยนรหัสผ่าน',
    twoFactorAuth: 'การยืนยันตัวตนสองขั้นตอน',
    notEnabled: 'ไม่ได้เปิดใช้งาน',
    securityTips: 'เคล็ดลับความปลอดภัย',
    securityTip1: 'เปลี่ยนรหัสผ่านเป็นประจำและใช้รหัสผ่านที่แข็งแกร่ง',
    securityTip2: 'อย่าแชร์ข้อมูลบัญชีของคุณกับผู้อื่น',
    securityTip3: 'เปิดใช้งานการยืนยันตัวตนสองขั้นตอนเพื่อเพิ่มความปลอดภัย',
    
    friendRequestAccepted: 'ยอมรับคำขอเป็นเพื่อนแล้ว',
    friendRequestDeclined: 'ปฏิเสธคำขอเป็นเพื่อนแล้ว',
    failedToAcceptFriend: 'ไม่สามารถยอมรับคำขอเป็นเพื่อนได้',
    failedToDeclineFriend: 'ไม่สามารถปฏิเสธคำขอเป็นเพื่อนได้',
    alreadyFriends: 'เป็นเพื่อนกันอยู่แล้ว',
    friendRequestAlreadySent: 'ส่งคำขอเป็นเพื่อนไปแล้ว',
    cannotAddYourself: 'ไม่สามารถเพิ่มตัวเองเป็นเพื่อน',

    // Invite System
    invite_friends: 'เชิญเพื่อน',
    invite_to_group: 'เชิญเข้ากลุ่ม',
    invite_to_chat: 'เชิญเข้าแชท',
    sms: 'SMS',
    email: 'อีเมล',
    invite_to_yulink: 'เชิญคุณเข้าร่วมแชท Trustalk',
    copied: 'คัดลอกแล้ว',
    invite_link_copied: 'คัดลอกลิงก์เชิญแล้ว',
    generating_link: 'กำลังสร้างลิงก์...',
    show_qr_code: 'แสดง QR Code',
    scan_to_join: 'สแกนเพื่อเข้าร่วม',
    share_link: 'แชร์ลิงก์',
    share_to_platform: 'แชร์ไปยังแพลตฟอร์ม',
    invite_tips_title: 'เคล็ดลับการเชิญ',
    invite_tip_1: 'ลิงก์เชิญใช้งานได้ 7 วัน หลังจากนั้นต้องสร้างใหม่',
    invite_tip_2: 'ผู้ได้รับเชิญสามารถเข้าร่วมโดยตรงโดยไม่ต้องลงทะเบียน',
    invite_tip_3: 'รองรับการแปลภาษาอัตโนมัติและการโทรเสียง/วิดีโอ',
    invite_message: 'เข้าร่วม {roomName} ของฉันบน {appName}!',
    failed_to_generate_invite_link: 'ไม่สามารถสร้างลิงก์เชิญได้',
    invite_accepted_successfully: 'ยอมรับคำเชิญสำเร็จ',
    failed_to_accept_invite: 'ไม่สามารถยอมรับคำเชิญได้',
    invite_link_expired: 'ลิงก์เชิญหมดอายุแล้ว',
    invalid_invite_link: 'ลิงก์เชิญไม่ถูกต้อง',
    invite_error: 'ข้อผิดพลาดในการเชิญ',
    back_to_home: 'กลับหน้าหลัก',
    multilingual_instant_communication: 'การสื่อสารทันทีหลายภาษา',
    youre_invited_to_join: 'คุณได้รับเชิญให้เข้าร่วม',
    click_accept_to_join_conversation: 'คลิกยอมรับเพื่อเข้าร่วมการสนทนา',
    auto_translation: 'การแปลอัตโนมัติ',
    cross_language_communication: 'การสื่อสารข้ามภาษาโดยไม่มีอุปสรรค',
    voice_video_calls: 'การโทรเสียง & วิดีโอ',
    high_quality_communication: 'การสื่อสารแบบเรียลไทม์คุณภาพสูง',
    group_chat: 'แชทกลุ่ม',
    connect_with_friends: 'เชื่อมต่อกับเพื่อนๆ',
    accepting: 'กำลังยอมรับ...',
    processing_invite: 'กำลังประมวลผลคำเชิญ...',
    accept_invitation: 'ยอมรับคำเชิญ',
    by_accepting_you_agree: 'การยอมรับคำเชิญแสดงว่าคุณยอมรับ',
    terms_and_privacy: 'ข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว',
    
    // Profile Edit
    pleaseSelectImage: 'กรุณาเลือกรูปภาพ',
    avatarUpdated: 'อัปเดตรูปโปรไฟล์แล้ว',
    uploadFailed: 'การอัปโหลดล้มเหลว',
    profileUpdated: 'อัปเดตโปรไฟล์แล้ว',
    uploading: 'กำลังอัปโหลด...',
    tapToChangeAvatar: 'แตะเพื่อเปลี่ยนรูปโปรไฟล์',
    enterFirstName: 'กรุณาป้อนชื่อ',
    enterLastName: 'กรุณาป้อนนามสกุล',
    profileEditNote: 'ข้อมูลที่แก้ไขจะมองเห็นได้โดยเพื่อนทั้งหมด',
    accountIdCopied: 'คัดลอกรหัสบัญชีแล้ว',
    copyFailed: 'การคัดลอกล้มเหลว',
    
    // Service Center
    serviceCenter: 'ศูนย์บริการ',
    accountAndIdentity: 'บัญชีและตัวตน',
    myWorkAccounts: 'บัญชีทำงานของฉัน',
    manageEnterpriseIdentities: 'ดู/จัดการตัวตนองค์กร',
    myCreatorAccounts: 'บัญชีผู้สร้างของฉัน',
    manageContentCreatorIdentities: 'ดู/จัดการตัวตนผู้สร้างเนื้อหา',
    applyEnterpriseAccount: 'สมัครบัญชีองค์กร',
    createEnterpriseWizard: 'เข้าสู่ตัวช่วยสร้างองค์กร',
    oaContentUpload: 'อัปโหลดเนื้อหา/สินค้า',
    oaProductUpload: 'อัปโหลดสินค้า',
    oaContentManagement: 'จัดการเนื้อหา/สินค้า',
    oaProductManagement: 'จัดการสินค้า',
    oaPublishContent: 'เผยแพร่เนื้อหา',
    oaUploadProduct: 'อัปโหลดสินค้า',
    oaArticle: 'บทความ',
    oaVideo: 'วิดีโอ',
    oaProduct: 'สินค้า',
    oaTitle: 'ชื่อเรื่อง',
    oaTitlePlaceholder: 'ใส่ชื่อเรื่อง',
    oaDescription: 'คำอธิบาย',
    oaDescriptionPlaceholder: 'ใส่คำอธิบาย',
    oaSelectVideo: 'เลือกวิดีโอ',
    oaVideoCover: 'ปกวิดีโอ (ไม่บังคับ)',
    oaUploadImages: 'อัปโหลดรูปภาพ',
    oaMaxImages: 'สูงสุด 9 รูป',
    oaProductCover: 'ปกสินค้า',
    oaPrice: 'ราคา',
    oaPricePlaceholder: 'ใส่ราคา',
    oaPublish: 'เผยแพร่',
    oaPublishing: 'กำลังเผยแพร่...',
    oaNoContent: 'ยังไม่มีเนื้อหา คลิก "เผยแพร่เนื้อหา" เพื่อเริ่มต้น',
    oaStartPublish: 'เริ่มเผยแพร่',
    oaNoProducts: 'ยังไม่มีสินค้า คลิก "อัปโหลดสินค้า" เพื่อเริ่มต้น',
    oaUploadProductFirst: 'ยังไม่มีสินค้า กรุณาอัปโหลดสินค้าก่อน',
    oaViews: 'ยอดดู',
    oaLikes: 'ถูกใจ',
    oaBindProduct: 'ผูกสินค้าโปรโมท',
    oaBoundProduct: 'สินค้าที่ผูกแล้ว',
    oaSelectProductToBind: 'เลือกสินค้าเพื่อโปรโมทในเนื้อหานี้',
    oaUnbind: 'ยกเลิกการผูก',
    oaClose: 'ปิด',
    oaContentList: 'รายการเนื้อหา',
    oaProductList: 'รายการสินค้า',
    oaPublishSuccess: 'เผยแพร่สำเร็จ',
    oaPublishFailed: 'เผยแพร่ไม่สำเร็จ',
    oaDeleteSuccess: 'ลบสำเร็จ',
    oaDeleteFailed: 'ลบไม่สำเร็จ',
    oaBindSuccess: 'ผูกสำเร็จ',
    oaBindFailed: 'ผูกไม่สำเร็จ',
    oaStatContent: 'ผลงานทั้งหมด',
    oaStatFollowers: 'ผู้ติดตามทั้งหมด',
    oaStatViews: 'ยอดดูทั้งหมด',
    oaStatEarnings: 'รายได้เดือนนี้',
    oaDrafts: 'ฉบับร่าง',
    oaOnline: 'เผยแพร่แล้ว',
    oaTrash: 'ถังขยะ',
    oaMoveToBin: 'ย้ายไปถังขยะ',
    oaRestore: 'กู้คืน',
    oaPermanentDelete: 'ลบถาวร',
    oaRestoreSuccess: 'กู้คืนแล้ว',
    oaAll: 'ทั้งหมด',
    close: 'ปิด',
    followNow: 'ติดตาม',
    following: 'กำลังติดตาม',
    saySmething: 'พูดอะไรสักอย่าง...',
    noImage: 'ไม่มีรูปภาพ',
    contentNotFound: 'ไม่พบเนื้อหาหรือถูกลบ',
    viewProduct: 'ดู',
    tagsLabel: 'แท็ก',
    invalidDate: 'วันที่ไม่ถูกต้อง',
    shareSuccess: 'แชร์สำเร็จ',
    shareFailed: 'แชร์ล้มเหลว',
    linkCopied: 'คัดลอกลิงก์แล้ว',
    copiedToClipboard: 'คัดลอกไปยังคลิปบอร์ดแล้ว',
    lineOaInviteTitle: 'นี่คือบัญชี LINE หลายภาษาของฉัน',
    lineOaInviteDesc: 'ติดตามฉันเพื่อเริ่มการสื่อสารหลายภาษา!',
    lineOaFollowMe: 'ติดตามฉันบน LINE',
    lineOaLoginToConnect: 'เข้าสู่ระบบเพื่อเริ่มแชทหลายภาษา'
  },
  ja: {
    chats: 'チャット',
    friends: '友達',
    groups: 'グループ',
    profile: 'プロフィール',
    discover: '発見',
    shop: 'ショッピング',
    worldInbox: 'ワールドインボックス',
    add: '追加',
    cancel: 'キャンセル',
    create: '作成',
    send: '送信',
    back: '戻る',
    settings: '設定',
    logout: 'ログアウト',
    inviteFriends: '友達を招待',
    scanQR: 'QRスキャン',
    friendsList: '友達リスト',
    addFriend: '友達を追加',
    friendId: '友達ID',
    addFriendPlaceholder: '友達IDまたは電話番号を入力...',
    newFriendRequest: '新しい友達リクエスト',
    acceptFriendRequest: '承認',
    rejectFriendRequest: '拒否',
    groupsList: 'グループリスト',
    createGroup: 'グループを作成',
    groupName: 'グループ名',
    groupNamePlaceholder: 'グループ名を入力...',
    selectMembers: 'メンバーを選択',
    selectedMembers: '選択されたメンバー',
    selectAll: 'すべて選択',
    deselectAll: 'すべて選択解除',
    searchFriends: '友達を検索',
    noSearchResults: '一致する友達が見つかりません',
    typeMessage: 'メッセージを入力...',
    online: 'オンライン',
    offline: 'オフライン',
    translating: '翻訳中...',
    aiAssistantName: 'マイアシスタント',
    myQrCode: '私のQRコード',
    languageSettings: '言語設定',
    voiceSettings: '音声設定',
    voiceSettingsDesc: 'メッセージと通話の音声設定',
    remoteVoiceForMe: '他の人から聞く声',
    remoteVoiceForMeDesc: '他の人の声が私の言語に翻訳される時',
    myDefaultVoiceForOthers: '他の人が私から聞く声',
    myDefaultVoiceForOthersDesc: '私の声が他の人の言語に翻訳される時',
    autoCallTranscript: '通話記録を自動生成',
    autoCallTranscriptDesc: '通話後に二言語記録を自動作成',
    voiceOptionDefault: 'デフォルト',
    voiceOptionMale: '男性',
    voiceOptionFemale: '女性',
    voiceOptionMaleDeep: '低い男声',
    voiceOptionFemaleSweet: '甘い女声',
    voiceOptionNeutral: 'ニュートラル',
    notifications: '通知',
    otherSettings: 'その他の設定',
    myLanguage: '私の言語',
    multilingualCard: '私のQRコード',
    myShareLink: '共有リンク',
    viewCard: 'カードを表示',
    qrCodePlaceholder: 'QRコード（スキャンして追加）',
    scanQRToViewCard: 'QRコードをスキャンして多言語カードを表示',
    scanQRToAddFriend: '友達のQRコードをスキャンして追加',
    cameraPermissionDenied: 'カメラ権限が拒否されました。設定でカメラアクセスを許可してください',
    externalAccounts: '外部アカウント管理',
    connected: '接続済み',
    notConfigured: '未設定',
    lineNotConfigured: 'LINE未設定',
    systemSettings: 'システム管理',
    soundEffects: 'サウンド管理',
    searchChats: 'チャット検索',
    searchContactsOrGroups: '連絡先またはグループを検索...',
    contacts: '連絡先',
    group: 'グループ',
    noResultsFound: '結果が見つかりません',
    tryDifferentKeyword: '別のキーワードを試してください',
    searchContactsAndGroups: '連絡先とグループを検索',
    enterNameToSearch: '名前またはグループ名を入力して検索',
    
    // Guest User
    guestAccountNotice: 'ゲストアカウント通知',
    upgradeToInviteFriends: 'アカウントをアップグレードして友達を招待し会話に参加',
    upgradeAccount: 'アカウントアップグレード',
    guestChatRestricted: 'ゲストアカウント制限',
    guestUpgradeToChatWithFriends: 'ゲストユーザーはAIアシスタントとのみチャットできます。友達とチャットするにはアップグレードしてください。',
    upgradeNow: '今すぐアップグレード',
    loading: '読み込み中...',
    error: 'エラー',
    success: '成功',
    saved: '保存しました',
    saveFailed: '保存に失敗しました',
    justNow: 'たった今',
    minutesAgo: '分前',
    hoursAgo: '時間前',
    yesterday: '昨日',
    daysAgo: '日前',
    noMessages: 'メッセージなし',
    mePrefix: '私: ',
    unknownUser: '不明なユーザー',
    groupLabel: '(グループ)',
    emptyChatsHint: 'まだチャットがありません。友達を追加したりグループを作成して始めましょう！',
    chatInfo: 'チャット情報',
    searchChatHistory: 'チャット履歴を検索',
    clearChatHistory: 'チャット履歴をクリア',
    muteNotifications: '通知をミュート',
    pinChat: 'チャットをピン留め',
    reminders: 'リマインダー',
    setChatBackground: 'チャット背景を設定',
    report: '報告',
    selectFunction: '機能を選択',
    gallery: 'ギャラリー',
    camera: 'カメラ',
    voiceCall: '音声通話',
    location: '位置',
    file: 'ファイル',
    favorites: 'お気に入り',
    businessCard: '名刺',
    videoCall: 'ビデオ通話',
    voiceCallNeedSDK: '音声通話機能にはWebRTC/サードパーティSDKの連携が必要です',
    videoCallNeedSDK: 'ビデオ通話機能にはWebRTC/サードパーティSDKの連携が必要です',
    favoritesNotImplemented: 'お気に入り機能はまだ実装されていません',
    locationPermissionError: '現在の位置を取得できません。位置情報の許可設定を確認してください',
    locationNotSupported: 'このデバイスは位置情報サービスに対応していません',
    viewLocation: '位置を見る',
    clickToOpenMaps: 'クリックしてGoogle マップを開く',
    businessCardPrefix: '名刺',
    emailLabel: 'メール',
    phoneLabel: '電話番号',
    phoneNotSet: '未設定',
    selectContact: '連絡先を選択',
    searchContacts: '連絡先を検索',
    myCard: 'マイカード',
    inviteToCall: '通話に招待',
    noFriends: '友達がいません',
    invite: '招待',
    
    // New fields
    confirm: '確認',
    delete: '削除',
    save: '保存',
    saving: 'Saving...',
    copy: 'コピー',
    search: '検索',
    share: 'シェア',
    searchUsers: 'ユーザー検索',
    searchPlaceholder: 'ユーザー名、名前、またはメールで検索...',
    searchResults: '検索結果',
    searching: '検索中...',
    noUsersFound: '該当するユーザーが見つかりません',
    addByUsername: 'ユーザー名で友達を追加',
    channelWhatsapp: 'WhatsApp',
    channelWechat: 'WeChat',
    channelLine: 'LINE',
    channelMessenger: 'Messenger',
    channelTelegram: 'Telegram',
    channelInstagram: 'Instagram',
    channelViber: 'Viber',
    emptyChatRecord: 'まだチャット履歴がありません。友達を追加するかグループに参加して始めましょう！',
    noGroupsHint: 'まだグループがありません。グループを作成して始めましょう！',
    noFriendsHint: 'まだ友達がいません。友達を追加しましょう！',
    loadingMessages: 'メッセージを読み込み中...',
    loadMore: 'さらにメッセージを読み込む',
    startConversation: '{}との会話を開始',
    welcomeToGroup: '{}へようこそ',
    
    // Error messages
    loginFailed: 'ログインに失敗しました。もう一度お試しください',
    loginError: 'ログインエラー',
    lineLoginError: 'LINEログインでエラーが発生しました',
    authFailed: '認証に失敗しました。もう一度お試しください',
    loginParamsMissing: 'ログインパラメータがありません',
    redirectFailed: 'リダイレクトに失敗しました。もう一度お試しください',
    addFriendFailed: '友達の追加に失敗しました',
    createGroupFailed: 'グループの作成に失敗しました',
    loadChatsFailed: 'チャットリストを読み込めません',
    loadFriendsFailed: '友達リストを読み込めません',
    loadGroupsFailed: 'グループリストを読み込めません',
    getLocationFailed: '位置情報の取得に失敗しました',
    translationError: '翻訳エラー',
    webrtcNetworkRestricted: '現在のネットワーク環境では通話を確立できません。モバイルデータに切り替えて再試行してください',
    mediaPermissionDenied: 'マイクまたはカメラへのアクセスが拒否されました。アクセスを許可して再試行してください',
    
    // Success messages
    friendRequestSent: '友達リクエストを送信しました',
    groupCreated: 'グループが作成されました',
    callInviteSent: '{}人の友達を{}通話に招待しました',
    
    // Dialog content
    switchLanguage: '言語を切り替え',
    switchLanguageConfirm: '{}に切り替えますか？',
    uiWillShow: '• UIはこの言語で表示されます',
    uiWillShowEnglish: '• UIは英語で表示されます',
    onlyChatTranslation: '• チャットメッセージの翻訳のみサポート',
    applying: '適用中...',
    
    // Language Picker
    languageSearchPlaceholder: '搜索/Search/検索/ค้นหา/Cari/Tìm kiếm',
    chatTranslationOnly: '(チャット翻訳)',
    chatTranslationNote: '• <strong>チャット翻訳</strong>: বাংলা, اردو, Türkçe, Tiếng Việt はチャット翻訳をサポートし、UIは英語で表示されます',
    fullUiSupport: '完全なUI翻訳をサポートする言語',
    fullUiSupportLanguages: '简体中文、English、ไทย、日本語、Bahasa Indonesia、Español、Français、العربية、हिन्दी、Deutsch、Русский、Português',
    
    // Login page
    appDescription: '多言語インスタントコミュニケーションシステム',
    loginWithLine: 'LINEでサインイン',
    chatWithWorldFriends: '境界なしのコミュニケーション',
    supportsMultilingualTranslation: '多言語翻訳機能をサポート',
    supportedLanguages: '日本語 • 中文 • English • ไทย • Bahasa Indonesia • Español • Français • العربية • हिन्दी • Deutsch • Русский • Português',
    guestLogin: '今すぐ試す',
    sixDigitSignup: '6桁ID',
    usernameSignup: 'ユーザー名',
    lineLogin: 'LINEログイン',
    connectWithoutBarriers: '境界なしのコミュニケーション',
    
    // Validation messages
    enterUsername: '検索するユーザー名を入力してください',
    enterGroupName: 'グループ名を入力してください',
    selectOneFriend: '少なくとも一人の友達を選択してください',
    groupNeedAtLeastThreePeople: 'グループを作成するには最低3人（あなたを含む）必要です。少なくとも2人以上の友達を選択してください',
    
    // Development
    inDevelopment: '開発中...',
    
    // New Profile Menu Items
    myServices: 'マイサービス',
    myFavorites: 'お気に入り',
    myDiscovery: 'マイディスカバリー',
    ordersAndPoints: '注文とポイント',
    emoticons: 'エモティコン',
    personalProfile: '個人プロフィール',
    accountSecurity: 'アカウントセキュリティ',
    friendPermissions: '友達を追加',
    userAgreement: '利用規約',
    privacyPolicy: 'プライバシーポリシー',
    
    // Account types
    personalAccount: '個人アカウント',
    accountId: 'アカウントID',
    personal: '個人',
    creator: 'クリエイター',
    enterprise: '企業',
    noOtherAccounts: '他のアカウントなし',
    
    services: 'サービス',
    stickers: 'スタンプ',
    
    // Commerce
    orders: '注文',
    cart: 'カート',
    points: 'ポイント',
    wallet: 'ウォレット',
    myOrders: '注文履歴',
    myCart: 'カート',
    myPoints: 'ポイント',
    myWallet: 'ウォレット',
    noOrders: '注文はまだありません',
    noCartItems: 'カートは空です',
    totalPoints: '合計ポイント',
    balance: '残高',
    availableBalance: '利用可能残高',
    emptyState: 'データなし',
    
    // Friend requests
    friendRequests: '友達リクエスト',
    wantsToBeYourFriend: 'あなたの友達になりたいです',
    accept: '承認',
    decline: '拒否',
    friendRequestAccepted: '友達リクエストを承認しました',
    friendRequestDeclined: '友達リクエストを拒否しました',
    failedToAcceptFriend: '友達リクエストの承認に失敗しました',
    failedToDeclineFriend: '友達リクエストの拒否に失敗しました',
    alreadyFriends: 'すでに友達です',
    friendRequestAlreadySent: '友達リクエストはすでに送信済みです',
    cannotAddYourself: '自分を友達に追加できません',
    
    // Membership Cards
    myMembershipCards: 'マイメンバーシップカード',
    membershipTierRegular: '通常会員',
    membershipTierSilver: 'シルバー会員',
    membershipTierGold: 'ゴールド会員',
    membershipTierPlatinum: 'プラチナ会員',
    currentPoints: '現在のポイント',
    pointsSuffix: 'ポイント',
    
    // Account Types
    lineAccount: 'LINEアカウント',
    phoneAccount: '電話アカウント',
    guestAccount: 'ゲストアカウント',
    
    // PWA Installation
    installSuccess: 'インストール成功！',
    appInstalledSuccessfully: 'Trustalkがホーム画面に正常に追加されました',
    iosInstallGuide: 'iOSインストールガイド',
    iosInstallInstructions: 'ブラウザ下部の共有ボタンをタップし、「ホーム画面に追加」を選択してください',
    manualInstall: '手動インストール',
    manualInstallInstructions: 'ブラウザメニューで「ホーム画面に追加」または「アプリをインストール」を選択してください',
    addToHomeScreen: 'ホーム画面に追加',
    installLikeApp: 'ワンタップでインストール、アプリのように使用',
    
    // Friend Request Toasts
    friendRequestAcceptedToast: '友達リクエストを承認しました',
    friendAddedSuccessfully: '新しい友達を正常に追加しました',
    operationFailed: '操作が失敗しました',
    acceptFriendRequestFailed: '友達リクエストの承認に失敗しました。もう一度お試しください',
    friendRequestDeclinedToast: '友達リクエストを拒否しました',
    friendRequestDeclinedMessage: '友達リクエストが拒否されました',
    declineFriendRequestFailed: '友達リクエストの拒否に失敗しました。もう一度お試しください',
    pendingFriendRequests: '保留中の友達リクエスト',
    noFriendRequests: '友達リクエストはありません',
    
    // New page content
    comingSoon: 'Coming Soon',
    noFavorites: 'No Favorites',
    noEmoticons: 'No Emoticons',
    username: 'Username',
    firstName: 'First Name',
    lastName: 'Last Name',
    nickname: 'Nickname',
    phoneNumber: 'Phone Number',
    languagePreference: 'Language Preference',
    notSet: 'Not Set',
    memberSince: 'Member Since',
    editProfile: 'Edit Profile',
    saveChanges: 'Save Changes',
    editing: 'Editing',
    usernameTaken: 'Username is already taken',
    profileUpdateSuccess: 'Profile updated successfully',
    profileUpdateFailed: 'Failed to update profile',
    selectLanguage: 'Select Language',
    upgradeForSecurity: 'Upgrade your account for better security',
    accountType: 'Account Type',
    linkedAccounts: 'Linked Accounts',
    lineAndPhone: 'LINE and Phone',
    lineOnly: 'LINE Only',
    phoneOnly: 'Phone Only',
    none: 'None',
    changePassword: 'Change Password',
    twoFactorAuth: 'Two-Factor Authentication',
    notEnabled: 'Not Enabled',
    securityTips: 'Security Tips',
    securityTip1: 'Change your password regularly and use strong passwords',
    securityTip2: 'Do not share your account information with others',
    securityTip3: 'Enable two-factor authentication for enhanced security',
    usernameRequired: 'ユーザー名は必須です',
    firstNameRequired: '名前は必須です',

    // Invite System
    invite_friends: '友達を招待',
    invite_to_group: 'グループに招待',
    invite_to_chat: 'チャットに招待',
    sms: 'SMS',
    email: 'メール',
    invite_to_yulink: 'Trustalkチャットに招待します',
    copied: 'コピーしました',
    invite_link_copied: '招待リンクをコピーしました',
    generating_link: 'リンクを生成中...',
    show_qr_code: 'QRコードを表示',
    scan_to_join: 'スキャンして参加',
    share_link: 'リンクを共有',
    share_to_platform: 'プラットフォームに共有',
    invite_tips_title: '招待のヒント',
    invite_tip_1: '招待リンクは7日間有効です。期限切れ後は再生成してください',
    invite_tip_2: '受信者は登録なしで直接参加できます',
    invite_tip_3: '多言語自動翻訳と音声/ビデオ通話をサポート',
    invite_message: '{appName}の{roomName}に参加してください！',
    failed_to_generate_invite_link: '招待リンクの生成に失敗しました',
    invite_accepted_successfully: '招待を承認しました',
    failed_to_accept_invite: '招待の承認に失敗しました',
    invite_link_expired: '招待リンクの有効期限が切れています',
    invalid_invite_link: '無効な招待リンク',
    invite_error: '招待エラー',
    back_to_home: 'ホームに戻る',
    multilingual_instant_communication: '多言語インスタントコミュニケーション',
    youre_invited_to_join: '参加への招待',
    click_accept_to_join_conversation: '承認をクリックして会話に参加',
    auto_translation: '自動翻訳',
    cross_language_communication: '言語の壁のないコミュニケーション',
    voice_video_calls: '音声 & ビデオ通話',
    high_quality_communication: '高品質なリアルタイム通信',
    group_chat: 'グループチャット',
    connect_with_friends: '友達とつながる',
    accepting: '承認中...',
    processing_invite: '招待を処理中...',
    accept_invitation: '招待を承認',
    by_accepting_you_agree: '承認することで、以下に同意したことになります',
    terms_and_privacy: '利用規約とプライバシーポリシー',
    
    // Profile Edit
    pleaseSelectImage: '画像を選択してください',
    avatarUpdated: 'アバターを更新しました',
    uploadFailed: 'アップロードに失敗しました',
    profileUpdated: 'プロフィールを更新しました',
    uploading: 'アップロード中...',
    tapToChangeAvatar: 'タップしてアバターを変更',
    enterFirstName: '名前を入力してください',
    enterLastName: '姓を入力してください',
    profileEditNote: '変更した情報はすべての友達に表示されます',
    accountIdCopied: 'アカウントIDをコピーしました',
    copyFailed: 'コピーに失敗しました',
    
    // Service Center
    serviceCenter: 'サービスセンター',
    accountAndIdentity: 'アカウントと身元',
    myWorkAccounts: 'マイワークアカウント',
    manageEnterpriseIdentities: '企業アイデンティティの表示/管理',
    myCreatorAccounts: 'マイクリエイターアカウント',
    manageContentCreatorIdentities: 'クリエイターアイデンティティの表示/管理',
    applyEnterpriseAccount: '企業アカウント申請',
    createEnterpriseWizard: '企業作成ウィザードに入る',
    oaContentUpload: 'コンテンツ/商品アップロード',
    oaProductUpload: '商品アップロード',
    oaContentManagement: 'コンテンツ/商品管理',
    oaProductManagement: '商品管理',
    oaPublishContent: 'コンテンツを公開',
    oaUploadProduct: '商品をアップロード',
    oaArticle: '記事',
    oaVideo: '動画',
    oaProduct: '商品',
    oaTitle: 'タイトル',
    oaTitlePlaceholder: 'タイトルを入力',
    oaDescription: '説明',
    oaDescriptionPlaceholder: '説明を入力',
    oaSelectVideo: '動画を選択',
    oaVideoCover: '動画カバー（任意）',
    oaUploadImages: '画像をアップロード',
    oaMaxImages: '最大9枚',
    oaProductCover: '商品カバー',
    oaPrice: '価格',
    oaPricePlaceholder: '価格を入力',
    oaPublish: '公開',
    oaPublishing: '公開中...',
    oaNoContent: 'コンテンツがありません。「コンテンツを公開」をクリックして開始',
    oaStartPublish: '公開を開始',
    oaNoProducts: '商品がありません。「商品をアップロード」をクリックして開始',
    oaUploadProductFirst: '商品がありません。まず商品をアップロードしてください',
    oaViews: '閲覧',
    oaLikes: 'いいね',
    oaBindProduct: '商品プロモーションをバインド',
    oaBoundProduct: 'バインド済み商品',
    oaSelectProductToBind: 'このコンテンツでプロモーションする商品を選択',
    oaUnbind: 'バインド解除',
    oaClose: '閉じる',
    oaContentList: 'コンテンツリスト',
    oaProductList: '商品リスト',
    oaPublishSuccess: '公開成功',
    oaPublishFailed: '公開失敗',
    oaDeleteSuccess: '削除成功',
    oaDeleteFailed: '削除失敗',
    oaBindSuccess: 'バインド成功',
    oaBindFailed: 'バインド失敗',
    oaStatContent: '作品数',
    oaStatFollowers: 'フォロワー数',
    oaStatViews: '総再生回数',
    oaStatEarnings: '今月の収益',
    oaDrafts: '下書き',
    oaOnline: '公開中',
    oaTrash: 'ゴミ箱',
    oaMoveToBin: 'ゴミ箱に移動',
    oaRestore: '復元',
    oaPermanentDelete: '完全に削除',
    oaRestoreSuccess: '復元しました',
    oaAll: 'すべて',
    close: '閉じる',
    followNow: 'フォロー',
    following: 'フォロー中',
    saySmething: '何か言ってください...',
    noImage: '画像なし',
    contentNotFound: 'コンテンツが見つからないか削除されました',
    viewProduct: '表示',
    tagsLabel: 'タグ',
    invalidDate: '無効な日付',
    shareSuccess: '共有しました',
    shareFailed: '共有に失敗しました',
    linkCopied: 'リンクをコピーしました',
    copiedToClipboard: 'クリップボードにコピーしました',
    lineOaInviteTitle: 'これは私の多言語LINEアカウントです',
    lineOaInviteDesc: 'フォローして多言語コミュニケーションを始めましょう！',
    lineOaFollowMe: 'LINEでフォローする',
    lineOaLoginToConnect: 'ログインして多言語チャットを開始'
  },
  id: {
    chats: 'Obrolan',
    friends: 'Teman',
    groups: 'Grup',
    profile: 'Profil',
    discover: 'Jelajah',
    shop: 'Belanja',
    worldInbox: 'Kotak Masuk Dunia',
    add: 'Tambah',
    cancel: 'Batal',
    create: 'Buat',
    send: 'Kirim',
    sent: 'Terkirim',
    back: 'Kembali',
    settings: 'Pengaturan',
    logout: 'Keluar',
    inviteFriends: 'Undang Teman',
    scanQR: 'Pindai QR',
    confirm: 'Konfirmasi',
    delete: 'Hapus',
    save: 'Simpan',
    saving: 'Menyimpan...',
    copy: 'Salin',
    search: 'Cari',
    share: 'Bagikan',
    all: 'Semua',
    you: 'Anda',
    other: 'Lainnya',
    original: 'Asli',
    bind: 'Ikat',
    friendsList: 'Daftar Teman',
    addFriend: 'Tambah Teman',
    friendId: 'ID Teman',
    addFriendPlaceholder: 'Masukkan ID teman atau telepon...',
    newFriendRequest: 'Permintaan pertemanan baru',
    acceptFriendRequest: 'Terima',
    rejectFriendRequest: 'Tolak',
    groupsList: 'Daftar Grup',
    createGroup: 'Buat Grup',
    groupName: 'Nama Grup',
    groupNamePlaceholder: 'Masukkan nama grup...',
    selectMembers: 'Pilih Anggota',
    selectedMembers: 'Anggota Terpilih',
    selectAll: 'Pilih Semua',
    deselectAll: 'Batalkan Semua',
    searchFriends: 'Cari Teman',
    noSearchResults: 'Tidak ada teman yang cocok',
    searchUsers: 'Cari Pengguna',
    searchPlaceholder: 'Cari...',
    searchResults: 'Hasil Pencarian',
    searching: 'Mencari...',
    noUsersFound: 'Tidak ada pengguna ditemukan',
    addByUsername: 'Tambah dengan nama pengguna',
    typeMessage: 'Ketik pesan...',
    online: 'Online',
    offline: 'Offline',
    translating: 'Menerjemahkan...',
    aiAssistantName: 'Asisten Saya',
    autoTranslated: 'Diterjemahkan otomatis',
    typeInYourLanguage: 'Ketik dalam bahasa Anda · Terjemahkan otomatis & kirim',
    worldChatPlaceholder: 'Ketik dalam bahasa Anda di sini, mereka akan melihat versi mereka…',
    myQrCode: 'Kode QR Saya',
    languageSettings: 'Pengaturan Bahasa',
    notifications: 'Notifikasi',
    otherSettings: 'Pengaturan Lainnya',
    myLanguage: 'Bahasa Saya',
    multilingualCard: 'Kode QR Saya',
    myShareLink: 'Tautan Berbagi Saya',
    viewCard: 'Lihat Kartu',
    qrCodePlaceholder: 'Kode QR (Pindai untuk menambah saya)',
    scanQRToViewCard: 'Pindai kode QR untuk melihat kartu multibahasa',
    scanQRToAddFriend: 'Pindai kode QR teman untuk menambahkannya',
    cameraPermissionDenied: 'Izin kamera ditolak. Harap izinkan akses kamera di pengaturan',
    externalAccounts: 'Manajemen Akun Eksternal',
    connected: 'Terhubung',
    notConfigured: 'Belum Dikonfigurasi',
    lineNotConfigured: 'LINE Belum Dikonfigurasi',
    systemSettings: 'Pengaturan Sistem',
    soundEffects: 'Efek Suara',
    searchChats: 'Cari Obrolan',
    searchContactsOrGroups: 'Cari kontak atau grup...',
    contacts: 'Kontak',
    group: 'Grup',
    noResultsFound: 'Tidak ada hasil',
    tryDifferentKeyword: 'Coba kata kunci berbeda',
    searchContactsAndGroups: 'Cari Kontak dan Grup',
    enterNameToSearch: 'Masukkan nama atau nama grup untuk mencari',
    noConversations: 'Tidak ada percakapan',
    worldInboxEmptyHint: 'Pesan dari saluran eksternal akan muncul di sini',
    conversationNotFound: 'Percakapan tidak ditemukan',
    channelWhatsapp: 'WhatsApp',
    channelWechat: 'WeChat',
    channelLine: 'LINE',
    channelMessenger: 'Messenger',
    channelTelegram: 'Telegram',
    channelInstagram: 'Instagram',
    channelViber: 'Viber',
    chinese: 'Bahasa Mandarin',
    thai: 'Bahasa Thailand',
    english: 'Bahasa Inggris',
    japanese: 'Bahasa Jepang',
    indonesian: 'Bahasa Indonesia',
    spanish: 'Bahasa Spanyol',
    french: 'Bahasa Prancis',
    arabic: 'Bahasa Arab',
    hindi: 'Bahasa Hindi',
    german: 'Bahasa Jerman',
    russian: 'Bahasa Rusia',
    portuguese: 'Bahasa Portugis',
    guestAccountNotice: 'Pemberitahuan Akun Tamu',
    upgradeToInviteFriends: 'Tingkatkan akun untuk mengundang teman',
    upgradeAccount: 'Tingkatkan Akun',
    guestChatRestricted: 'Pembatasan Akun Tamu',
    guestUpgradeToChatWithFriends: 'Pengguna tamu hanya bisa mengobrol dengan Asisten AI. Harap tingkatkan untuk mengobrol dengan teman.',
    upgradeNow: 'Tingkatkan Sekarang',
    loading: 'Memuat...',
    error: 'Kesalahan',
    success: 'Berhasil',
    saved: 'Tersimpan',
    saveFailed: 'Gagal menyimpan',
    justNow: 'Baru saja',
    minutesAgo: 'menit lalu',
    hoursAgo: 'jam lalu',
    yesterday: 'Kemarin',
    daysAgo: 'hari lalu',
    noMessages: 'Tidak ada pesan',
    mePrefix: 'Saya: ',
    unknownUser: 'Pengguna tidak dikenal',
    groupLabel: '(Grup)',
    emptyChatsHint: 'Belum ada obrolan, tambahkan teman atau buat grup untuk memulai!',
    emptyChatRecord: 'Belum ada catatan obrolan, tambahkan teman atau bergabung dengan grup untuk memulai!',
    noGroupsHint: 'Belum ada grup, buat grup untuk memulai!',
    noFriendsHint: 'Belum ada teman, tambahkan beberapa teman untuk memulai!',
    loadingMessages: 'Memuat pesan...',
    loadMore: 'Muat lebih banyak pesan',
    startConversation: 'Mulai percakapan dengan {}',
    welcomeToGroup: 'Selamat datang di {}',
    chatInfo: 'Info Obrolan',
    searchChatHistory: 'Cari Riwayat Obrolan',
    clearChatHistory: 'Hapus Riwayat Obrolan',
    muteNotifications: 'Bisukan Notifikasi',
    pinChat: 'Sematkan Obrolan',
    reminders: 'Pengingat',
    setChatBackground: 'Atur Latar Belakang Obrolan',
    report: 'Laporkan',
    selectFunction: 'Pilih Fungsi',
    gallery: 'Galeri',
    camera: 'Kamera',
    voiceCall: 'Panggilan Suara',
    location: 'Lokasi',
    file: 'File',
    favorites: 'Favorit',
    businessCard: 'Kartu Nama',
    videoCall: 'Panggilan Video',
    voiceCallNeedSDK: 'Fitur panggilan suara memerlukan integrasi WebRTC/SDK pihak ketiga',
    videoCallNeedSDK: 'Fitur panggilan video memerlukan integrasi WebRTC/SDK pihak ketiga',
    favoritesNotImplemented: 'Fitur favorit belum diimplementasikan',
    locationPermissionError: 'Tidak dapat mengambil lokasi saat ini, periksa izin lokasi',
    locationNotSupported: 'Layanan lokasi tidak didukung pada perangkat ini',
    viewLocation: 'Lihat Lokasi',
    clickToOpenMaps: 'Klik untuk membuka Google Maps',
    businessCardPrefix: 'Kartu Nama',
    emailLabel: 'Email',
    phoneLabel: 'Telepon',
    phoneNotSet: 'Tidak diatur',
    selectContact: 'Pilih Kontak',
    searchContacts: 'Cari kontak',
    myCard: 'Kartu Saya',
    inviteToCall: 'Undang ke Panggilan',
    noFriends: 'Tidak ada teman',
    invite: 'Undang',
    loginFailed: 'Login gagal, silakan coba lagi',
    loginError: 'Kesalahan Login',
    lineLoginError: 'Kesalahan login LINE',
    authFailed: 'Autentikasi gagal, silakan coba lagi',
    loginParamsMissing: 'Parameter login hilang',
    redirectFailed: 'Pengalihan gagal, silakan coba lagi',
    addFriendFailed: 'Gagal menambah teman',
    createGroupFailed: 'Gagal membuat grup',
    loadChatsFailed: 'Tidak dapat memuat daftar obrolan',
    loadFriendsFailed: 'Tidak dapat memuat daftar teman',
    loadGroupsFailed: 'Tidak dapat memuat daftar grup',
    getLocationFailed: 'Gagal mendapatkan lokasi',
    translationError: 'Kesalahan terjemahan',
    webrtcNetworkRestricted: 'Pembatasan jaringan saat ini menyebabkan panggilan tidak dapat dibuat, harap beralih ke data seluler dan coba lagi',
    mediaPermissionDenied: 'Tidak dapat mengakses kamera atau mikrofon, periksa pengaturan izin browser',
    failedToAcceptFriend: 'Gagal menerima permintaan pertemanan',
    failedToDeclineFriend: 'Gagal menolak permintaan pertemanan',
    alreadyFriends: 'Kalian sudah berteman',
    friendRequestAlreadySent: 'Permintaan pertemanan sudah dikirim',
    cannotAddYourself: 'Tidak bisa menambahkan diri sendiri sebagai teman',
    friendRequestSent: 'Permintaan pertemanan terkirim',
    friendRequestAccepted: 'Permintaan pertemanan diterima',
    friendRequestDeclined: 'Permintaan pertemanan ditolak',
    groupCreated: 'Grup berhasil dibuat',
    callInviteSent: '{} teman telah diundang ke panggilan {}',
    switchLanguage: 'Ganti Bahasa',
    switchLanguageConfirm: 'Apakah Anda yakin ingin beralih ke {}?',
    uiWillShow: '• UI akan ditampilkan dalam bahasa ini',
    uiWillShowEnglish: '• UI akan ditampilkan dalam bahasa Inggris',
    onlyChatTranslation: '• Hanya mendukung fitur terjemahan obrolan',
    applying: 'Menerapkan...',
    languageSearchPlaceholder: 'Cari/Search/検索/ค้นหา/Cari/Tìm kiếm',
    chatTranslationOnly: '(Terjemahan Obrolan)',
    chatTranslationNote: '• <strong>Terjemahan Obrolan</strong>: বাংলা, اردو, Türkçe, Tiếng Việt dll mendukung terjemahan obrolan, UI menggunakan bahasa Inggris',
    fullUiSupport: 'Bahasa dengan Dukungan UI Lengkap',
    fullUiSupportLanguages: '简体中文, English, ไทย, 日本語, Bahasa Indonesia, Español, Français, العربية, हिन्दी, Deutsch, Русский, Português',
    appDescription: 'Sistem Komunikasi Instan Multibahasa',
    loginWithLine: 'Login dengan LINE',
    chatWithWorldFriends: 'Dipahami di seluruh dunia!',
    supportsMultilingualTranslation: 'Mendukung fitur terjemahan multibahasa',
    supportedLanguages: '中文 • English • ไทย • 日本語 • Bahasa Indonesia • Español • Français • العربية • हिन्दी • Deutsch • Русский • Português',
    guestLogin: 'Coba Sekarang',
    sixDigitSignup: 'Daftar 6 Digit',
    usernameSignup: 'Daftar dengan Nama Pengguna',
    lineLogin: 'Login LINE',
    connectWithoutBarriers: 'Dipahami di seluruh dunia!',
    enterUsername: 'Harap masukkan nama pengguna untuk mencari',
    enterGroupName: 'Harap masukkan nama grup',
    selectOneFriend: 'Harap pilih setidaknya satu teman',
    groupNeedAtLeastThreePeople: 'Membuat grup memerlukan minimal 3 orang (termasuk Anda), harap pilih setidaknya 2 teman lagi',
    inDevelopment: 'Dalam Pengembangan...',
    myServices: 'Layanan Saya',
    myFavorites: 'Favorit Saya',
    myDiscovery: 'Penemuan Saya',
    ordersAndPoints: 'Pesanan dan Poin',
    emoticons: 'Emotikon',
    personalProfile: 'Profil Pribadi',
    accountSecurity: 'Keamanan Akun',
    friendPermissions: 'Tambah Teman',
    userAgreement: 'Perjanjian Pengguna',
    privacyPolicy: 'Kebijakan Privasi',
    personalAccount: 'Akun Pribadi',
    accountId: 'ID Akun',
    personal: 'Pribadi',
    creator: 'Kreator',
    enterprise: 'Perusahaan',
    noOtherAccounts: 'Tidak ada akun lain',
    services: 'Layanan',
    stickers: 'Stiker',
    orders: 'Pesanan',
    cart: 'Keranjang',
    points: 'Poin',
    wallet: 'Dompet',
    myOrders: 'Pesanan Saya',
    myCart: 'Keranjang Saya',
    myPoints: 'Poin Saya',
    myWallet: 'Dompet Saya',
    noOrders: 'Tidak ada pesanan',
    noCartItems: 'Keranjang kosong',
    totalPoints: 'Total Poin',
    balance: 'Saldo',
    availableBalance: 'Saldo Tersedia',
    emptyState: 'Tidak ada data',
    friendRequests: 'Permintaan Pertemanan',
    wantsToBeYourFriend: 'Ingin menjadi teman Anda',
    accept: 'Terima',
    decline: 'Tolak',
    myMembershipCards: 'Kartu Keanggotaan Saya',
    membershipTierRegular: 'Anggota Reguler',
    membershipTierSilver: 'Anggota Perak',
    membershipTierGold: 'Anggota Emas',
    membershipTierPlatinum: 'Anggota Platinum',
    currentPoints: 'Poin Saat Ini',
    pointsSuffix: 'poin',
    lineAccount: 'Akun LINE',
    phoneAccount: 'Akun Telepon',
    guestAccount: 'Akun Tamu',
    installSuccess: 'Instalasi Berhasil!',
    appInstalledSuccessfully: 'Trustalk telah berhasil ditambahkan ke layar beranda Anda',
    iosInstallGuide: 'Panduan Instalasi iOS',
    iosInstallInstructions: 'Harap klik tombol berbagi di bagian bawah browser, lalu pilih \'Tambahkan ke Layar Beranda\'',
    manualInstall: 'Instalasi Manual',
    manualInstallInstructions: 'Harap pilih \'Tambahkan ke Layar Beranda\' atau \'Instal Aplikasi\' di menu browser',
    addToHomeScreen: 'Tambahkan ke Layar Beranda',
    installLikeApp: 'Instal sekali, gunakan seperti aplikasi',
    friendRequestAcceptedToast: 'Permintaan Pertemanan Diterima',
    friendAddedSuccessfully: 'Anda telah berhasil menambahkan teman baru',
    operationFailed: 'Operasi Gagal',
    acceptFriendRequestFailed: 'Gagal menerima permintaan pertemanan, silakan coba lagi',
    friendRequestDeclinedToast: 'Permintaan Pertemanan Ditolak',
    friendRequestDeclinedMessage: 'Permintaan pertemanan ditolak',
    declineFriendRequestFailed: 'Gagal menolak permintaan pertemanan, silakan coba lagi',
    pendingFriendRequests: 'Permintaan Pertemanan Tertunda',
    noFriendRequests: 'Tidak ada permintaan pertemanan',
    comingSoon: 'Segera Hadir',
    noFavorites: 'Tidak ada favorit',
    noEmoticons: 'Tidak ada emotikon',
    username: 'Nama Pengguna',
    firstName: 'Nama Depan',
    lastName: 'Nama Belakang',
    nickname: 'Nama Panggilan',
    phoneNumber: 'Nomor Telepon',
    languagePreference: 'Preferensi Bahasa',
    notSet: 'Tidak Diatur',
    memberSince: 'Anggota Sejak',
    editProfile: 'Edit Profil',
    saveChanges: 'Simpan Perubahan',
    editing: 'Mengedit',
    usernameTaken: 'Nama pengguna sudah digunakan',
    profileUpdateSuccess: 'Profil berhasil diperbarui',
    profileUpdateFailed: 'Gagal memperbarui profil',
    selectLanguage: 'Pilih Bahasa',
    usernameRequired: 'Nama pengguna diperlukan',
    firstNameRequired: 'Nama depan diperlukan',
    upgradeForSecurity: 'Tingkatkan akun Anda untuk keamanan yang lebih baik',
    accountType: 'Jenis Akun',
    linkedAccounts: 'Akun Tertaut',
    lineAndPhone: 'LINE dan Telepon',
    lineOnly: 'Hanya LINE',
    phoneOnly: 'Hanya Telepon',
    none: 'Tidak Ada',
    changePassword: 'Ubah Kata Sandi',
    twoFactorAuth: 'Autentikasi Dua Faktor',
    notEnabled: 'Tidak Diaktifkan',
    securityTips: 'Tips Keamanan',
    securityTip1: 'Ubah kata sandi Anda secara teratur dan gunakan kata sandi yang kuat',
    securityTip2: 'Jangan bagikan informasi akun Anda dengan orang lain',
    securityTip3: 'Aktifkan autentikasi dua faktor untuk keamanan yang lebih baik',
    invite_friends: 'Undang Teman',
    invite_to_group: 'Undang ke Grup',
    invite_to_chat: 'Undang ke Obrolan',
    sms: 'SMS',
    email: 'Email',
    invite_to_yulink: 'Undang Anda untuk bergabung dengan obrolan Trustalk',
    copied: 'Disalin',
    invite_link_copied: 'Tautan undangan disalin',
    generating_link: 'Membuat tautan...',
    show_qr_code: 'Tampilkan Kode QR',
    scan_to_join: 'Pindai untuk bergabung',
    share_link: 'Bagikan Tautan',
    share_to_platform: 'Bagikan ke Platform',
    invite_tips_title: 'Tips Undangan',
    invite_tip_1: 'Tautan undangan berlaku selama 7 hari, harap buat ulang setelah kedaluwarsa',
    invite_tip_2: 'Penerima dapat bergabung langsung tanpa registrasi',
    invite_tip_3: 'Mendukung terjemahan otomatis multibahasa dan panggilan suara/video',
    invite_message: 'Bergabunglah dengan {roomName} saya di {appName}!',
    failed_to_generate_invite_link: 'Gagal membuat tautan undangan',
    invite_accepted_successfully: 'Undangan berhasil diterima',
    failed_to_accept_invite: 'Gagal menerima undangan',
    invite_link_expired: 'Tautan undangan telah kedaluwarsa',
    invalid_invite_link: 'Tautan undangan tidak valid',
    invite_error: 'Kesalahan Undangan',
    back_to_home: 'Kembali ke Beranda',
    multilingual_instant_communication: 'Komunikasi Instan Multibahasa',
    youre_invited_to_join: 'Anda diundang untuk bergabung',
    click_accept_to_join_conversation: 'Klik terima untuk bergabung dalam percakapan',
    auto_translation: 'Terjemahan Otomatis',
    cross_language_communication: 'Komunikasi lintas bahasa tanpa hambatan',
    voice_video_calls: 'Panggilan Suara & Video',
    high_quality_communication: 'Komunikasi real-time berkualitas tinggi',
    group_chat: 'Obrolan Grup',
    connect_with_friends: 'Tetap terhubung dengan teman',
    accepting: 'Menerima...',
    processing_invite: 'Memproses undangan...',
    accept_invitation: 'Terima Undangan',
    by_accepting_you_agree: 'Dengan menerima, Anda menyetujui',
    terms_and_privacy: 'Ketentuan Layanan dan Kebijakan Privasi',
    
    // Profile Edit
    pleaseSelectImage: 'Silakan pilih gambar',
    avatarUpdated: 'Avatar diperbarui',
    uploadFailed: 'Gagal mengunggah',
    profileUpdated: 'Profil diperbarui',
    uploading: 'Mengunggah...',
    tapToChangeAvatar: 'Ketuk untuk mengubah avatar',
    enterFirstName: 'Silakan masukkan nama depan',
    enterLastName: 'Silakan masukkan nama belakang',
    profileEditNote: 'Informasi yang diubah akan terlihat oleh semua teman',
    accountIdCopied: 'ID akun disalin',
    copyFailed: 'Gagal menyalin',
    
    // Service Center
    serviceCenter: 'Pusat Layanan',
    accountAndIdentity: 'Akun & Identitas',
    myWorkAccounts: 'Akun Kerja Saya',
    manageEnterpriseIdentities: 'Lihat/kelola identitas perusahaan',
    myCreatorAccounts: 'Akun Kreator Saya',
    manageContentCreatorIdentities: 'Lihat/kelola identitas kreator',
    applyEnterpriseAccount: 'Ajukan Akun Perusahaan',
    createEnterpriseWizard: 'Masuk wizard pembuatan perusahaan',
    oaContentUpload: 'Unggah Konten/Produk',
    oaProductUpload: 'Unggah Produk',
    oaContentManagement: 'Kelola Konten/Produk',
    oaProductManagement: 'Kelola Produk',
    oaPublishContent: 'Publikasikan Konten',
    oaUploadProduct: 'Unggah Produk',
    oaArticle: 'Artikel',
    oaVideo: 'Video',
    oaProduct: 'Produk',
    oaTitle: 'Judul',
    oaTitlePlaceholder: 'Masukkan judul',
    oaDescription: 'Deskripsi',
    oaDescriptionPlaceholder: 'Masukkan deskripsi',
    oaSelectVideo: 'Pilih Video',
    oaVideoCover: 'Sampul Video (Opsional)',
    oaUploadImages: 'Unggah Gambar',
    oaMaxImages: 'Maksimal 9 gambar',
    oaProductCover: 'Sampul Produk',
    oaPrice: 'Harga',
    oaPricePlaceholder: 'Masukkan harga',
    oaPublish: 'Publikasikan',
    oaPublishing: 'Mempublikasikan...',
    oaNoContent: 'Belum ada konten, klik "Publikasikan Konten" untuk memulai',
    oaStartPublish: 'Mulai Publikasi',
    oaNoProducts: 'Belum ada produk, klik "Unggah Produk" untuk memulai',
    oaUploadProductFirst: 'Belum ada produk, silakan unggah produk terlebih dahulu',
    oaViews: 'Dilihat',
    oaLikes: 'Suka',
    oaBindProduct: 'Ikat Promosi Produk',
    oaBoundProduct: 'Produk Terikat',
    oaSelectProductToBind: 'Pilih produk untuk dipromosikan dalam konten ini',
    oaUnbind: 'Lepas Ikatan',
    oaClose: 'Tutup',
    oaContentList: 'Daftar Konten',
    oaProductList: 'Daftar Produk',
    oaPublishSuccess: 'Berhasil dipublikasikan',
    oaPublishFailed: 'Gagal mempublikasikan',
    oaDeleteSuccess: 'Berhasil dihapus',
    oaDeleteFailed: 'Gagal menghapus',
    oaBindSuccess: 'Berhasil diikat',
    oaBindFailed: 'Gagal mengikat',
    oaStatContent: 'Total Karya',
    oaStatFollowers: 'Total Pengikut',
    oaStatViews: 'Total Tampilan',
    oaStatEarnings: 'Pendapatan Bulan Ini',
    oaDrafts: 'Draf',
    oaOnline: 'Diterbitkan',
    oaTrash: 'Sampah',
    oaMoveToBin: 'Pindahkan ke Sampah',
    oaRestore: 'Pulihkan',
    oaPermanentDelete: 'Hapus Permanen',
    oaRestoreSuccess: 'Dipulihkan',
    oaAll: 'Semua',
    close: 'Tutup',
    followNow: 'Ikuti',
    following: 'Mengikuti',
    saySmething: 'Katakan sesuatu...',
    noImage: 'Tidak ada gambar',
    contentNotFound: 'Konten tidak ditemukan atau dihapus',
    viewProduct: 'Lihat',
    tagsLabel: 'Tag',
    invalidDate: 'Tanggal tidak valid',
    shareSuccess: 'Berhasil dibagikan',
    shareFailed: 'Gagal berbagi',
    linkCopied: 'Tautan disalin',
    copiedToClipboard: 'Disalin ke clipboard',
    lineOaInviteTitle: 'Ini adalah akun LINE multibahasa saya',
    lineOaInviteDesc: 'Ikuti saya untuk memulai komunikasi multibahasa!',
    lineOaFollowMe: 'Ikuti saya di LINE',
    lineOaLoginToConnect: 'Login untuk mulai chat multibahasa'
  },
  es: {
    chats: 'Chats',
    friends: 'Amigos',
    groups: 'Grupos',
    profile: 'Perfil',
    discover: 'Descubrir',
    shop: 'Compras',
    worldInbox: 'Bandeja del Mundo',
    add: 'Añadir',
    cancel: 'Cancelar',
    create: 'Crear',
    send: 'Enviar',
    back: 'Atrás',
    settings: 'Configuración',
    logout: 'Cerrar sesión',
    inviteFriends: 'Invitar amigos',
    scanQR: 'Escanear QR',
    friendsList: 'Lista de amigos',
    addFriend: 'Añadir amigo',
    friendId: 'ID del amigo',
    addFriendPlaceholder: 'Ingresa ID del amigo o teléfono...',
    newFriendRequest: 'Nueva solicitud de amistad',
    acceptFriendRequest: 'Aceptar',
    rejectFriendRequest: 'Rechazar',
    groupsList: 'Lista de grupos',
    createGroup: 'Crear grupo',
    groupName: 'Nombre del grupo',
    groupNamePlaceholder: 'Ingresa nombre del grupo...',
    selectMembers: 'Seleccionar miembros',
    selectedMembers: 'Miembros seleccionados',
    selectAll: 'Seleccionar todo',
    deselectAll: 'Deseleccionar todo',
    searchFriends: 'Buscar amigos',
    noSearchResults: 'No se encontraron amigos coincidentes',
    typeMessage: 'Escribe un mensaje...',
    online: 'En línea',
    offline: 'Desconectado',
    translating: 'Traduciendo...',
    aiAssistantName: 'Mi Asistente',
    myQrCode: 'Mi código QR',
    languageSettings: 'Configuración de idioma',
    notifications: 'Notificaciones',
    otherSettings: 'Otras configuraciones',
    myLanguage: 'Mi idioma',
    multilingualCard: 'Mi código QR',
    myShareLink: 'Mi enlace para compartir',
    viewCard: 'Ver tarjeta',
    qrCodePlaceholder: 'Código QR (Escanea para agregarme)',
    scanQRToViewCard: 'Escanea el código QR para ver la tarjeta multilingüe',
    scanQRToAddFriend: 'Escanea el código QR de un amigo para agregarlo',
    cameraPermissionDenied: 'Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración',
    externalAccounts: 'Gestión de Cuentas Externas',
    connected: 'Conectado',
    notConfigured: 'No Configurado',
    lineNotConfigured: 'LINE No Configurado',
    systemSettings: 'Configuración del Sistema',
    soundEffects: 'Efectos de Sonido',
    searchChats: 'Buscar Chats',
    searchContactsOrGroups: 'Buscar contactos o grupos...',
    contacts: 'Contactos',
    group: 'Grupo',
    noResultsFound: 'No se encontraron resultados',
    tryDifferentKeyword: 'Intenta con una palabra clave diferente',
    searchContactsAndGroups: 'Buscar Contactos y Grupos',
    enterNameToSearch: 'Ingresa un nombre o nombre de grupo para buscar',
    
    // Guest User
    guestAccountNotice: 'Guest account notice',
    upgradeToInviteFriends: 'Upgrade to invite friends',
    upgradeAccount: 'Upgrade account',
    guestChatRestricted: 'Limitación de cuenta de invitado',
    guestUpgradeToChatWithFriends: 'Los usuarios invitados solo pueden chatear con el Asistente de IA. Por favor actualice para chatear con amigos.',
    upgradeNow: 'Actualizar ahora',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    saved: 'Guardado',
    saveFailed: 'Error al guardar',
    justNow: 'Ahora mismo',
    minutesAgo: 'hace minutos',
    hoursAgo: 'hace horas',
    yesterday: 'Ayer',
    daysAgo: 'hace días',
    noMessages: 'Sin mensajes',
    mePrefix: 'Yo: ',
    unknownUser: 'Usuario desconocido',
    groupLabel: '(Grupo)',
    emptyChatsHint: 'No hay chats aún, ¡añade amigos o crea grupos para empezar!',
    chatInfo: 'Información del chat',
    searchChatHistory: 'Buscar historial de chat',
    clearChatHistory: 'Limpiar historial de chat',
    muteNotifications: 'Silenciar notificaciones',
    pinChat: 'Anclar chat',
    reminders: 'Recordatorios',
    setChatBackground: 'Establecer fondo del chat',
    report: 'Reportar',
    selectFunction: 'Seleccionar función',
    gallery: 'Galería',
    camera: 'Cámara',
    voiceCall: 'Llamada de voz',
    location: 'Ubicación',
    file: 'Archivo',
    favorites: 'Favoritos',
    businessCard: 'Tarjeta de visita',
    videoCall: 'Videollamada',
    voiceCallNeedSDK: 'La función de llamada de voz requiere integración WebRTC/SDK de terceros',
    videoCallNeedSDK: 'La función de videollamada requiere integración WebRTC/SDK de terceros',
    favoritesNotImplemented: 'La función de favoritos aún no está implementada',
    locationPermissionError: 'No se puede obtener la ubicación actual, verifica los permisos de ubicación',
    locationNotSupported: 'Los servicios de ubicación no son compatibles con este dispositivo',
    viewLocation: 'Ver Ubicación',
    clickToOpenMaps: 'Clic para abrir Google Maps',
    businessCardPrefix: 'Tarjeta de visita',
    emailLabel: 'Correo',
    phoneLabel: 'Teléfono',
    phoneNotSet: 'No configurado',
    selectContact: 'Seleccionar Contacto',
    searchContacts: 'Buscar contactos',
    myCard: 'Mi Tarjeta',
    inviteToCall: 'Invitar a llamada',
    noFriends: 'Sin amigos',
    invite: 'Invitar',
    
    // New fields
    confirm: 'Confirmar',
    delete: 'Eliminar',
    save: 'Guardar',
    saving: 'Saving...',
    copy: 'Copiar',
    search: 'Buscar',
    share: 'Compartir',
    searchUsers: 'Buscar usuarios',
    searchPlaceholder: 'Buscar nombre de usuario, nombre o correo...',
    searchResults: 'Resultados de búsqueda',
    searching: 'Buscando...',
    noUsersFound: 'No se encontraron usuarios',
    addByUsername: 'Añadir amigo por nombre de usuario',
    channelWhatsapp: 'WhatsApp',
    channelWechat: 'WeChat',
    channelLine: 'LINE',
    channelMessenger: 'Messenger',
    channelTelegram: 'Telegram',
    channelInstagram: 'Instagram',
    channelViber: 'Viber',
    emptyChatRecord: '¡Aún no hay historial de chat, añade amigos o únete a grupos para empezar!',
    noGroupsHint: '¡Aún no hay grupos, crea un grupo para empezar!',
    noFriendsHint: '¡Aún no hay amigos, añade algunos amigos!',
    loadingMessages: 'Cargando mensajes...',
    loadMore: 'Cargar más mensajes',
    startConversation: 'Iniciar conversación con {}',
    welcomeToGroup: 'Bienvenido a {}',
    
    // Error messages
    loginFailed: 'Error de inicio de sesión, por favor inténtalo de nuevo',
    loginError: 'Error de inicio de sesión',
    lineLoginError: 'Ocurrió un error en el inicio de sesión de LINE',
    authFailed: 'Falló la autenticación, por favor inténtalo de nuevo',
    loginParamsMissing: 'Faltan parámetros de inicio de sesión',
    redirectFailed: 'Falló la redirección, por favor inténtalo de nuevo',
    addFriendFailed: 'Error al añadir amigo',
    createGroupFailed: 'Error al crear grupo',
    loadChatsFailed: 'No se pudo cargar la lista de chats',
    loadFriendsFailed: 'No se pudo cargar la lista de amigos',
    loadGroupsFailed: 'No se pudo cargar la lista de grupos',
    getLocationFailed: 'Error al obtener ubicación',
    translationError: 'Error de traducción',
    webrtcNetworkRestricted: 'Las restricciones de red impiden establecer la llamada. Cambie a datos móviles (4G/5G) y reintente',
    mediaPermissionDenied: 'Permiso de micrófono/cámara denegado. Por favor permita el acceso e intente de nuevo',
    
    // Success messages
    friendRequestSent: 'Solicitud de amistad enviada',
    groupCreated: 'Grupo creado exitosamente',
    callInviteSent: 'Invitando {} amigos a la llamada {}',
    
    // Dialog content
    switchLanguage: 'Cambiar idioma',
    switchLanguageConfirm: '¿Estás seguro de que quieres cambiar a {}?',
    uiWillShow: '• La UI se mostrará en este idioma',
    uiWillShowEnglish: '• La UI se mostrará en inglés',
    onlyChatTranslation: '• Solo soporta traducción de mensajes de chat',
    applying: 'Aplicando...',
    
    // Language Picker
    languageSearchPlaceholder: '搜索/Search/検索/ค้นหา/Cari/Tìm kiếm',
    chatTranslationOnly: '(Traducción de chat)',
    chatTranslationNote: '• <strong>Traducción de chat</strong>: বাংলা, اردو, Türkçe, Tiếng Việt admiten traducción de chat con interfaz en inglés',
    fullUiSupport: 'Idiomas con soporte completo de traducción de UI',
    fullUiSupportLanguages: '简体中文、English、ไทย、日本語、Bahasa Indonesia、Español、Français、العربية、हिन्दी、Deutsch、Русский、Português',
    
    // Login page
    appDescription: 'Sistema de comunicación instantánea multiidioma',
    loginWithLine: 'Iniciar sesión con LINE',
    chatWithWorldFriends: 'Inicia sesión con tu cuenta de LINE para chatear con amigos de todo el mundo',
    
    // Validation messages
    enterUsername: 'Por favor ingresa un nombre de usuario para buscar',
    enterGroupName: 'Por favor ingresa un nombre de grupo',
    selectOneFriend: 'Por favor selecciona al menos un amigo',
    groupNeedAtLeastThreePeople: 'Los grupos requieren al menos 3 personas (incluyéndote). Por favor selecciona al menos 2 amigos más',
    
    // Development
    inDevelopment: 'En desarrollo...',
    
    // New Profile Menu Items
    myServices: 'Mis Servicios',
    myFavorites: 'Mis Favoritos',
    myDiscovery: 'Mi Descubrimiento',
    ordersAndPoints: 'Pedidos y Puntos',
    emoticons: 'Emoticonos',
    personalProfile: 'Perfil Personal',
    accountSecurity: 'Seguridad de Cuenta',
    friendPermissions: 'Añadir Amigos',
    userAgreement: 'Acuerdo de Usuario',
    privacyPolicy: 'Política de Privacidad',
    
    // Account types
    personalAccount: 'Cuenta Personal',
    accountId: 'ID de Cuenta',
    personal: 'Personal',
    creator: 'Creador',
    enterprise: 'Empresa',
    noOtherAccounts: 'Sin otras cuentas',
    
    // New menu items
    services: 'Servicios',
    stickers: 'Pegatinas',
    
    // Commerce
    orders: 'Pedidos',
    cart: 'Carrito',
    points: 'Puntos',
    wallet: 'Billetera',
    myOrders: 'Mis Pedidos',
    myCart: 'Mi Carrito',
    myPoints: 'Mis Puntos',
    myWallet: 'Mi Billetera',
    noOrders: 'Sin pedidos',
    noCartItems: 'Carrito vacío',
    totalPoints: 'Puntos Totales',
    balance: 'Saldo',
    availableBalance: 'Saldo Disponible',
    emptyState: 'Sin datos',
    
    // Friend requests
    friendRequests: 'Solicitudes de Amistad',
    wantsToBeYourFriend: 'quiere ser tu amigo',
    accept: 'Aceptar',
    decline: 'Rechazar',
    friendRequestAccepted: 'Solicitud de amistad aceptada',
    friendRequestDeclined: 'Solicitud de amistad rechazada',
    failedToAcceptFriend: 'Error al aceptar solicitud de amistad',
    failedToDeclineFriend: 'Error al rechazar solicitud de amistad',
    alreadyFriends: 'Ya son amigos',
    friendRequestAlreadySent: 'Solicitud de amistad ya enviada',
    cannotAddYourself: 'No puedes agregarte a ti mismo como amigo',
    
    // Membership Cards
    myMembershipCards: 'Mis Tarjetas de Membresía',
    membershipTierRegular: 'Miembro Regular',
    membershipTierSilver: 'Miembro Plata',
    membershipTierGold: 'Miembro Oro',
    membershipTierPlatinum: 'Miembro Platino',
    currentPoints: 'Puntos Actuales',
    pointsSuffix: 'pts',
    
    // Account Types
    lineAccount: 'Cuenta LINE',
    phoneAccount: 'Cuenta Telefónica',
    guestAccount: 'Cuenta de Invitado',
    
    // PWA Installation
    installSuccess: '¡Instalación Exitosa!',
    appInstalledSuccessfully: 'Trustalk se ha agregado exitosamente a tu pantalla de inicio',
    iosInstallGuide: 'Guía de Instalación iOS',
    iosInstallInstructions: 'Por favor toca el botón de compartir en la parte inferior del navegador y luego selecciona \'Agregar a pantalla de inicio\'',
    manualInstall: 'Instalación Manual',
    manualInstallInstructions: 'Por favor selecciona \'Agregar a pantalla de inicio\' o \'Instalar App\' en el menú del navegador',
    addToHomeScreen: 'Agregar a Pantalla de Inicio',
    installLikeApp: 'Instalar con un toque, usar como una app',
    
    // Friend Request Toasts
    friendRequestAcceptedToast: 'Solicitud de Amistad Aceptada',
    friendAddedSuccessfully: 'Has agregado exitosamente un nuevo amigo',
    operationFailed: 'Operación Fallida',
    acceptFriendRequestFailed: 'Error al aceptar solicitud de amistad, por favor inténtalo de nuevo',
    friendRequestDeclinedToast: 'Solicitud de Amistad Rechazada',
    friendRequestDeclinedMessage: 'La solicitud de amistad ha sido rechazada',
    declineFriendRequestFailed: 'Error al rechazar solicitud de amistad, por favor inténtalo de nuevo',
    pendingFriendRequests: 'Solicitudes de Amistad Pendientes',
    noFriendRequests: 'Sin Solicitudes de Amistad',
    
    // New page content
    comingSoon: 'Coming Soon',
    noFavorites: 'No Favorites',
    noEmoticons: 'No Emoticons',
    username: 'Username',
    firstName: 'First Name',
    lastName: 'Last Name',
    nickname: 'Nickname',
    phoneNumber: 'Phone Number',
    languagePreference: 'Language Preference',
    notSet: 'Not Set',
    memberSince: 'Member Since',
    editProfile: 'Edit Profile',
    saveChanges: 'Save Changes',
    editing: 'Editing',
    usernameTaken: 'Username is already taken',
    profileUpdateSuccess: 'Profile updated successfully',
    profileUpdateFailed: 'Failed to update profile',
    selectLanguage: 'Select Language',
    upgradeForSecurity: 'Upgrade your account for better security',
    accountType: 'Account Type',
    linkedAccounts: 'Linked Accounts',
    lineAndPhone: 'LINE and Phone',
    lineOnly: 'LINE Only',
    phoneOnly: 'Phone Only',
    none: 'None',
    changePassword: 'Change Password',
    twoFactorAuth: 'Two-Factor Authentication',
    notEnabled: 'Not Enabled',
    securityTips: 'Security Tips',
    securityTip1: 'Change your password regularly and use strong passwords',
    securityTip2: 'Do not share your account information with others',
    securityTip3: 'Enable two-factor authentication for enhanced security',
    usernameRequired: 'El nombre de usuario es obligatorio',
    firstNameRequired: 'El nombre es obligatorio',
    
    supportsMultilingualTranslation: 'Admite traducción multiidioma',
    supportedLanguages: 'Español • English • 中文 • ไทย • 日本語 • Bahasa Indonesia • Français • العربية • हिन्दी • Deutsch • Русский • Português',
    guestLogin: 'Probar Ahora',
    sixDigitSignup: 'ID de 6 dígitos',
    usernameSignup: 'Nombre de usuario',
    lineLogin: 'Iniciar sesión con LINE',
    connectWithoutBarriers: 'Comunicación sin barreras',

    // Invite System
    invite_friends: 'Invitar Amigos',
    invite_to_group: 'Invitar al Grupo',
    invite_to_chat: 'Invitar al Chat',
    sms: 'SMS',
    email: 'Correo',
    invite_to_yulink: 'Te invito a unirte al chat de Trustalk',
    copied: 'Copiado',
    invite_link_copied: 'Enlace de invitación copiado',
    generating_link: 'Generando enlace...',
    show_qr_code: 'Mostrar Código QR',
    scan_to_join: 'Escanear para unirse',
    share_link: 'Compartir Enlace',
    share_to_platform: 'Compartir en Plataforma',
    invite_tips_title: 'Consejos de Invitación',
    invite_tip_1: 'Los enlaces de invitación son válidos por 7 días, regenerar después de expirar',
    invite_tip_2: 'Los destinatarios pueden unirse directamente sin registro',
    invite_tip_3: 'Admite traducción automática multiidioma y llamadas de voz/video',
    invite_message: '¡Únete a mi {roomName} en {appName}!',
    failed_to_generate_invite_link: 'Error al generar enlace de invitación',
    invite_accepted_successfully: 'Invitación aceptada exitosamente',
    failed_to_accept_invite: 'Error al aceptar invitación',
    invite_link_expired: 'El enlace de invitación ha expirado',
    invalid_invite_link: 'Enlace de invitación inválido',
    invite_error: 'Error de Invitación',
    back_to_home: 'Volver al Inicio',
    multilingual_instant_communication: 'Comunicación Instantánea Multiidioma',
    youre_invited_to_join: 'Estás invitado a unirte',
    click_accept_to_join_conversation: 'Haz clic en aceptar para unirte a la conversación',
    auto_translation: 'Traducción Automática',
    cross_language_communication: 'Comunicación sin barreras lingüísticas',
    voice_video_calls: 'Llamadas de Voz y Video',
    high_quality_communication: 'Comunicación en tiempo real de alta calidad',
    group_chat: 'Chat Grupal',
    connect_with_friends: 'Mantente conectado con amigos',
    accepting: 'Aceptando...',
    processing_invite: 'Procesando invitación...',
    accept_invitation: 'Aceptar Invitación',
    by_accepting_you_agree: 'Al aceptar, aceptas',
    terms_and_privacy: 'Términos de Servicio y Política de Privacidad',
    
    // Profile Edit
    pleaseSelectImage: 'Por favor selecciona una imagen',
    avatarUpdated: 'Avatar actualizado',
    uploadFailed: 'Falló la subida',
    profileUpdated: 'Perfil actualizado',
    uploading: 'Subiendo...',
    tapToChangeAvatar: 'Toca para cambiar avatar',
    enterFirstName: 'Por favor ingresa el nombre',
    enterLastName: 'Por favor ingresa el apellido',
    profileEditNote: 'La información modificada será visible para todos los amigos',
    accountIdCopied: 'ID de cuenta copiado',
    copyFailed: 'Error al copiar',
    
    // Service Center
    serviceCenter: 'Centro de Servicios',
    accountAndIdentity: 'Cuenta e Identidad',
    myWorkAccounts: 'Mis Cuentas de Trabajo',
    manageEnterpriseIdentities: 'Ver/gestionar identidades empresariales',
    myCreatorAccounts: 'Mis Cuentas de Creador',
    manageContentCreatorIdentities: 'Ver/gestionar identidades de creador',
    applyEnterpriseAccount: 'Solicitar Cuenta Empresarial',
    createEnterpriseWizard: 'Entrar al asistente de creación empresarial',
    oaContentUpload: 'Subir Contenido/Producto',
    oaProductUpload: 'Subir Producto',
    oaContentManagement: 'Gestión de Contenido/Producto',
    oaProductManagement: 'Gestión de Productos',
    oaPublishContent: 'Publicar Contenido',
    oaUploadProduct: 'Subir Producto',
    oaArticle: 'Artículo',
    oaVideo: 'Video',
    oaProduct: 'Producto',
    oaTitle: 'Título',
    oaTitlePlaceholder: 'Ingrese el título',
    oaDescription: 'Descripción',
    oaDescriptionPlaceholder: 'Ingrese la descripción',
    oaSelectVideo: 'Seleccionar Video',
    oaVideoCover: 'Portada de Video (Opcional)',
    oaUploadImages: 'Subir Imágenes',
    oaMaxImages: 'Máximo 9 imágenes',
    oaProductCover: 'Portada del Producto',
    oaPrice: 'Precio',
    oaPricePlaceholder: 'Ingrese el precio',
    oaPublish: 'Publicar',
    oaPublishing: 'Publicando...',
    oaNoContent: 'Sin contenido, haga clic en "Publicar Contenido" para comenzar',
    oaStartPublish: 'Comenzar a Publicar',
    oaNoProducts: 'Sin productos, haga clic en "Subir Producto" para comenzar',
    oaUploadProductFirst: 'Sin productos, suba un producto primero',
    oaViews: 'Vistas',
    oaLikes: 'Me gusta',
    oaBindProduct: 'Vincular Promoción de Producto',
    oaBoundProduct: 'Producto Vinculado',
    oaSelectProductToBind: 'Seleccione un producto para promocionar en este contenido',
    oaUnbind: 'Desvincular',
    oaClose: 'Cerrar',
    oaContentList: 'Lista de Contenido',
    oaProductList: 'Lista de Productos',
    oaPublishSuccess: 'Publicado con éxito',
    oaPublishFailed: 'Error al publicar',
    oaDeleteSuccess: 'Eliminado con éxito',
    oaDeleteFailed: 'Error al eliminar',
    oaBindSuccess: 'Vinculado con éxito',
    oaBindFailed: 'Error al vincular',
    oaStatContent: 'Total de Obras',
    oaStatFollowers: 'Total de Seguidores',
    oaStatViews: 'Total de Vistas',
    oaStatEarnings: 'Ingresos del Mes',
    oaDrafts: 'Borradores',
    oaOnline: 'Publicado',
    oaTrash: 'Papelera',
    oaMoveToBin: 'Mover a Papelera',
    oaRestore: 'Restaurar',
    oaPermanentDelete: 'Eliminar Permanentemente',
    oaRestoreSuccess: 'Restaurado',
    oaAll: 'Todos',
    close: 'Cerrar',
    followNow: 'Seguir',
    following: 'Siguiendo',
    saySmething: 'Di algo...',
    noImage: 'Sin imagen',
    contentNotFound: 'Contenido no encontrado o eliminado',
    viewProduct: 'Ver',
    tagsLabel: 'Etiquetas',
    invalidDate: 'Fecha inválida',
    shareSuccess: 'Compartido exitosamente',
    shareFailed: 'Error al compartir',
    linkCopied: 'Enlace copiado',
    copiedToClipboard: 'Copiado al portapapeles',
    lineOaInviteTitle: 'Esta es mi cuenta LINE multilingüe',
    lineOaInviteDesc: '¡Sígueme para comenzar la comunicación multilingüe!',
    lineOaFollowMe: 'Sígueme en LINE',
    lineOaLoginToConnect: 'Inicia sesión para comenzar chat multilingüe'
  },
  fr: {
    chats: 'Discussions',
    friends: 'Amis',
    groups: 'Groupes',
    profile: 'Profil',
    discover: 'Découvrir',
    shop: 'Achats',
    worldInbox: 'Boîte aux lettres du monde',
    add: 'Ajouter',
    cancel: 'Annuler',
    create: 'Créer',
    send: 'Envoyer',
    back: 'Retour',
    settings: 'Paramètres',
    logout: 'Se déconnecter',
    inviteFriends: 'Inviter des amis',
    scanQR: 'Scanner QR',
    friendsList: 'Liste d\'amis',
    addFriend: 'Ajouter un ami',
    friendId: 'ID d\'ami',
    addFriendPlaceholder: 'Entrez l\'ID d\'ami ou téléphone...',
    newFriendRequest: 'Nouvelle demande d\'ami',
    acceptFriendRequest: 'Accepter',
    rejectFriendRequest: 'Rejeter',
    groupsList: 'Liste des groupes',
    createGroup: 'Créer un groupe',
    groupName: 'Nom du groupe',
    groupNamePlaceholder: 'Entrez le nom du groupe...',
    selectMembers: 'Sélectionner les membres',
    selectedMembers: 'Membres sélectionnés',
    selectAll: 'Tout sélectionner',
    deselectAll: 'Tout désélectionner',
    searchFriends: 'Rechercher des amis',
    noSearchResults: 'Aucun ami correspondant trouvé',
    typeMessage: 'Tapez un message...',
    online: 'En ligne',
    offline: 'Hors ligne',
    translating: 'Traduction...',
    aiAssistantName: 'Mon Assistant',
    myQrCode: 'Mon code QR',
    languageSettings: 'Paramètres de langue',
    notifications: 'Notifications',
    otherSettings: 'Autres paramètres',
    myLanguage: 'Ma langue',
    multilingualCard: 'Mon QR Code',
    myShareLink: 'Mon lien de partage',
    viewCard: 'Voir la carte',
    qrCodePlaceholder: 'Code QR (Scannez pour m\'ajouter)',
    scanQRToViewCard: 'Scannez le code QR pour voir la carte multilingue',
    scanQRToAddFriend: 'Scannez le code QR d\'un ami pour l\'ajouter',
    cameraPermissionDenied: 'Autorisation de caméra refusée. Veuillez autoriser l\'accès à la caméra dans les paramètres',
    externalAccounts: 'Gestion des Comptes Externes',
    connected: 'Connecté',
    notConfigured: 'Non Configuré',
    lineNotConfigured: 'LINE Non Configuré',
    systemSettings: 'Paramètres Système',
    soundEffects: 'Effets Sonores',
    searchChats: 'Rechercher des Chats',
    searchContactsOrGroups: 'Rechercher des contacts ou des groupes...',
    contacts: 'Contacts',
    group: 'Groupe',
    noResultsFound: 'Aucun résultat trouvé',
    tryDifferentKeyword: 'Essayez un mot-clé différent',
    searchContactsAndGroups: 'Rechercher Contacts et Groupes',
    enterNameToSearch: 'Entrez un nom ou un nom de groupe pour rechercher',
    
    // Guest User
    guestAccountNotice: 'Guest account notice',
    upgradeToInviteFriends: 'Upgrade to invite friends',
    upgradeAccount: 'Upgrade account',
    guestChatRestricted: 'Limitation du compte invité',
    guestUpgradeToChatWithFriends: 'Les utilisateurs invités ne peuvent discuter qu\'avec l\'assistant IA. Veuillez mettre à niveau pour discuter avec des amis.',
    upgradeNow: 'Mettre à niveau maintenant',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    saved: 'Enregistré',
    saveFailed: 'Échec de l\'enregistrement',
    justNow: 'À l\'instant',
    minutesAgo: 'il y a minutes',
    hoursAgo: 'il y a heures',
    yesterday: 'Hier',
    daysAgo: 'il y a jours',
    noMessages: 'Aucun message',
    mePrefix: 'Moi: ',
    unknownUser: 'Utilisateur inconnu',
    groupLabel: '(Groupe)',
    emptyChatsHint: 'Pas encore de discussions, ajoutez des amis ou créez des groupes pour commencer!',
    chatInfo: 'Infos de discussion',
    searchChatHistory: 'Rechercher l\'historique de discussion',
    clearChatHistory: 'Effacer l\'historique de discussion',
    muteNotifications: 'Désactiver les notifications',
    pinChat: 'Épingler la discussion',
    reminders: 'Rappels',
    setChatBackground: 'Définir l\'arrière-plan de discussion',
    report: 'Signaler',
    selectFunction: 'Sélectionner la fonction',
    gallery: 'Galerie',
    camera: 'Caméra',
    voiceCall: 'Appel vocal',
    location: 'Localisation',
    file: 'Fichier',
    favorites: 'Favoris',
    businessCard: 'Carte de visite',
    videoCall: 'Appel vidéo',
    voiceCallNeedSDK: 'La fonction d\'appel vocal nécessite une intégration WebRTC/SDK tiers',
    videoCallNeedSDK: 'La fonction d\'appel vidéo nécessite une intégration WebRTC/SDK tiers',
    favoritesNotImplemented: 'La fonction favoris n\'est pas encore implémentée',
    locationPermissionError: 'Impossible d\'obtenir la localisation actuelle, vérifiez les permissions de localisation',
    locationNotSupported: 'Les services de localisation ne sont pas pris en charge sur cet appareil',
    viewLocation: 'Voir la localisation',
    clickToOpenMaps: 'Cliquez pour ouvrir Google Maps',
    businessCardPrefix: 'Carte de visite',
    emailLabel: 'E-mail',
    phoneLabel: 'Téléphone',
    phoneNotSet: 'Non défini',
    selectContact: 'Sélectionner Contact',
    searchContacts: 'Rechercher des contacts',
    myCard: 'Ma Carte',
    inviteToCall: 'Inviter à l\'appel',
    noFriends: 'Aucun ami',
    invite: 'Inviter',
    
    // New fields
    confirm: 'Confirmer',
    delete: 'Supprimer',
    save: 'Sauvegarder',
    saving: 'Saving...',
    copy: 'Copier',
    search: 'Rechercher',
    share: 'Partager',
    searchUsers: 'Rechercher des utilisateurs',
    searchPlaceholder: 'Rechercher nom d\'utilisateur, nom ou email...',
    searchResults: 'Résultats de recherche',
    searching: 'Recherche en cours...',
    noUsersFound: 'Aucun utilisateur trouvé',
    addByUsername: 'Ajouter un ami par nom d\'utilisateur',
    channelWhatsapp: 'WhatsApp',
    channelWechat: 'WeChat',
    channelLine: 'LINE',
    channelMessenger: 'Messenger',
    channelTelegram: 'Telegram',
    channelInstagram: 'Instagram',
    channelViber: 'Viber',
    emptyChatRecord: 'Pas encore d\'historique de chat, ajoutez des amis ou rejoignez des groupes pour commencer !',
    noGroupsHint: 'Pas encore de groupes, créez un groupe pour commencer !',
    noFriendsHint: 'Pas encore d\'amis, ajoutez quelques amis !',
    loadingMessages: 'Chargement des messages...',
    loadMore: 'Charger plus de messages',
    startConversation: 'Commencer une conversation avec {}',
    welcomeToGroup: 'Bienvenue dans {}',
    
    // Error messages
    loginFailed: 'Échec de la connexion, veuillez réessayer',
    loginError: 'Erreur de connexion',
    lineLoginError: 'Une erreur s\'est produite lors de la connexion LINE',
    authFailed: 'Échec de l\'authentification, veuillez réessayer',
    loginParamsMissing: 'Paramètres de connexion manquants',
    redirectFailed: 'Échec de la redirection, veuillez réessayer',
    addFriendFailed: 'Échec de l\'ajout d\'ami',
    createGroupFailed: 'Échec de la création du groupe',
    loadChatsFailed: 'Impossible de charger la liste des chats',
    loadFriendsFailed: 'Impossible de charger la liste des amis',
    loadGroupsFailed: 'Impossible de charger la liste des groupes',
    getLocationFailed: 'Échec de l\'obtention de la localisation',
    translationError: 'Erreur de traduction',
    webrtcNetworkRestricted: 'Les restrictions réseau empêchent d\'établir l\'appel. Basculez vers les données mobiles (4G/5G) et réessayez',
    mediaPermissionDenied: 'Permission microphone/caméra refusée. Veuillez autoriser l\'accès et réessayer',
    
    // Success messages
    friendRequestSent: 'Demande d\'ami envoyée',
    groupCreated: 'Groupe créé avec succès',
    callInviteSent: 'Invitation de {} amis à l\'appel {}',
    
    // Dialog content
    switchLanguage: 'Changer de langue',
    switchLanguageConfirm: 'Êtes-vous sûr de vouloir changer pour {} ?',
    uiWillShow: '• L\'interface utilisateur sera affichée dans cette langue',
    uiWillShowEnglish: '• L\'interface utilisateur sera affichée en anglais',
    onlyChatTranslation: '• Prend uniquement en charge la traduction des messages de chat',
    applying: 'Application en cours...',
    
    // Language Picker
    languageSearchPlaceholder: '搜索/Search/検索/ค้นหา/Cari/Tìm kiếm',
    chatTranslationOnly: '(Traduction de chat)',
    chatTranslationNote: '• <strong>Traduction de chat</strong> : বাংলা, اردو, Türkçe, Tiếng Việt prennent en charge la traduction de chat avec interface en anglais',
    fullUiSupport: 'Langues avec support complet de traduction d\'interface',
    fullUiSupportLanguages: '简体中文、English、ไทย、日本語、Bahasa Indonesia、Español、Français、العربية、हिन्दी、Deutsch、Русский、Português',
    
    // Login page
    appDescription: 'Système de communication instantanée multilingue',
    loginWithLine: 'Se connecter avec LINE',
    chatWithWorldFriends: 'Connectez-vous avec votre compte LINE pour chatter avec des amis du monde entier',
    
    // Validation messages
    enterUsername: 'Veuillez entrer un nom d\'utilisateur pour la recherche',
    enterGroupName: 'Veuillez entrer un nom de groupe',
    selectOneFriend: 'Veuillez sélectionner au moins un ami',
    groupNeedAtLeastThreePeople: 'Les groupes nécessitent au moins 3 personnes (vous inclus). Veuillez sélectionner au moins 2 amis de plus',
    
    // Development
    inDevelopment: 'En développement...',
    
    // New Profile Menu Items
    myServices: 'Mes Services',
    myFavorites: 'Mes Favoris',
    myDiscovery: 'Ma Découverte',
    ordersAndPoints: 'Commandes et Points',
    emoticons: 'Émoticônes',
    personalProfile: 'Profil Personnel',
    accountSecurity: 'Sécurité du Compte',
    friendPermissions: 'Ajouter des Amis',
    userAgreement: 'Accord Utilisateur',
    privacyPolicy: 'Politique de Confidentialité',
    
    // Account types
    personalAccount: 'Compte Personnel',
    accountId: 'ID de Compte',
    personal: 'Personnel',
    creator: 'Créateur',
    enterprise: 'Entreprise',
    noOtherAccounts: 'Aucun autre compte',
    
    // New menu items
    services: 'Services',
    stickers: 'Autocollants',
    
    // Commerce
    orders: 'Commandes',
    cart: 'Panier',
    points: 'Points',
    wallet: 'Portefeuille',
    myOrders: 'Mes Commandes',
    myCart: 'Mon Panier',
    myPoints: 'Mes Points',
    myWallet: 'Mon Portefeuille',
    noOrders: 'Aucune commande',
    noCartItems: 'Panier vide',
    totalPoints: 'Total Points',
    balance: 'Solde',
    availableBalance: 'Solde Disponible',
    emptyState: 'Aucune donnée',
    
    // Friend requests
    friendRequests: 'Demandes d\'Amis',
    wantsToBeYourFriend: 'veut être votre ami',
    accept: 'Accepter',
    decline: 'Refuser',
    friendRequestAccepted: 'Demande d\'ami acceptée',
    friendRequestDeclined: 'Demande d\'ami refusée',
    failedToAcceptFriend: 'Échec de l\'acceptation de la demande d\'ami',
    failedToDeclineFriend: 'Échec du refus de la demande d\'ami',
    alreadyFriends: 'Déjà amis',
    friendRequestAlreadySent: 'Demande d\'ami déjà envoyée',
    cannotAddYourself: 'Vous ne pouvez pas vous ajouter comme ami',
    
    // Membership Cards
    myMembershipCards: 'Mes Cartes de Membre',
    membershipTierRegular: 'Membre Régulier',
    membershipTierSilver: 'Membre Argent',
    membershipTierGold: 'Membre Or',
    membershipTierPlatinum: 'Membre Platine',
    currentPoints: 'Points Actuels',
    pointsSuffix: 'pts',
    
    // Account Types
    lineAccount: 'Compte LINE',
    phoneAccount: 'Compte Téléphone',
    guestAccount: 'Compte Invité',
    
    // PWA Installation
    installSuccess: 'Installation Réussie !',
    appInstalledSuccessfully: 'Trustalk a été ajouté avec succès à votre écran d\'accueil',
    iosInstallGuide: 'Guide d\'Installation iOS',
    iosInstallInstructions: 'Veuillez appuyer sur le bouton de partage en bas du navigateur, puis sélectionner \'Ajouter à l\'écran d\'accueil\'',
    manualInstall: 'Installation Manuelle',
    manualInstallInstructions: 'Veuillez sélectionner \'Ajouter à l\'écran d\'accueil\' ou \'Installer l\'App\' dans le menu du navigateur',
    addToHomeScreen: 'Ajouter à l\'Écran d\'Accueil',
    installLikeApp: 'Installer en un clic, utiliser comme une app',
    
    // Friend Request Toasts
    friendRequestAcceptedToast: 'Demande d\'Ami Acceptée',
    friendAddedSuccessfully: 'Vous avez ajouté un nouvel ami avec succès',
    operationFailed: 'Échec de l\'Opération',
    acceptFriendRequestFailed: 'Échec de l\'acceptation de la demande d\'ami, veuillez réessayer',
    friendRequestDeclinedToast: 'Demande d\'Ami Refusée',
    friendRequestDeclinedMessage: 'La demande d\'ami a été refusée',
    declineFriendRequestFailed: 'Échec du refus de la demande d\'ami, veuillez réessayer',
    pendingFriendRequests: 'Demandes d\'Ami en Attente',
    noFriendRequests: 'Aucune Demande d\'Ami',
    
    // New page content
    comingSoon: 'Coming Soon',
    noFavorites: 'No Favorites',
    noEmoticons: 'No Emoticons',
    username: 'Username',
    firstName: 'First Name',
    lastName: 'Last Name',
    nickname: 'Nickname',
    phoneNumber: 'Phone Number',
    languagePreference: 'Language Preference',
    notSet: 'Not Set',
    memberSince: 'Member Since',
    editProfile: 'Edit Profile',
    saveChanges: 'Save Changes',
    editing: 'Editing',
    usernameTaken: 'Username is already taken',
    profileUpdateSuccess: 'Profile updated successfully',
    profileUpdateFailed: 'Failed to update profile',
    selectLanguage: 'Select Language',
    upgradeForSecurity: 'Upgrade your account for better security',
    accountType: 'Account Type',
    linkedAccounts: 'Linked Accounts',
    lineAndPhone: 'LINE and Phone',
    lineOnly: 'LINE Only',
    phoneOnly: 'Phone Only',
    none: 'None',
    changePassword: 'Change Password',
    twoFactorAuth: 'Two-Factor Authentication',
    notEnabled: 'Not Enabled',
    securityTips: 'Security Tips',
    securityTip1: 'Change your password regularly and use strong passwords',
    securityTip2: 'Do not share your account information with others',
    securityTip3: 'Enable two-factor authentication for enhanced security',
    usernameRequired: 'Le nom d\'utilisateur est requis',
    firstNameRequired: 'Le prénom est requis',
    
    supportsMultilingualTranslation: 'Prend en charge la traduction multilingue',
    supportedLanguages: 'Français • English • 中文 • ไทย • 日本語 • Bahasa Indonesia • Español • العربية • हिन्दी • Deutsch • Русский • Português',
    guestLogin: 'Essayer Maintenant',
    sixDigitSignup: 'ID à 6 chiffres',
    usernameSignup: 'Nom d\'utilisateur',
    lineLogin: 'Connexion LINE',
    connectWithoutBarriers: 'Communication sans barrières',

    // Invite System
    invite_friends: 'Inviter des Amis',
    invite_to_group: 'Inviter dans le Groupe',
    invite_to_chat: 'Inviter au Chat',
    sms: 'SMS',
    email: 'E-mail',
    invite_to_yulink: 'Je vous invite à rejoindre le chat Trustalk',
    copied: 'Copié',
    invite_link_copied: 'Lien d\'invitation copié',
    generating_link: 'Génération du lien...',
    show_qr_code: 'Afficher le Code QR',
    scan_to_join: 'Scanner pour rejoindre',
    share_link: 'Partager le Lien',
    share_to_platform: 'Partager sur la Plateforme',
    invite_tips_title: 'Conseils d\'Invitation',
    invite_tip_1: 'Les liens d\'invitation sont valables 7 jours, régénérer après expiration',
    invite_tip_2: 'Les destinataires peuvent rejoindre directement sans inscription',
    invite_tip_3: 'Prend en charge la traduction automatique multilingue et les appels audio/vidéo',
    invite_message: 'Rejoignez mon {roomName} sur {appName} !',
    failed_to_generate_invite_link: 'Échec de la génération du lien d\'invitation',
    invite_accepted_successfully: 'Invitation acceptée avec succès',
    failed_to_accept_invite: 'Échec de l\'acceptation de l\'invitation',
    invite_link_expired: 'Le lien d\'invitation a expiré',
    invalid_invite_link: 'Lien d\'invitation invalide',
    invite_error: 'Erreur d\'Invitation',
    back_to_home: 'Retour à l\'Accueil',
    multilingual_instant_communication: 'Communication Instantanée Multilingue',
    youre_invited_to_join: 'Vous êtes invité à rejoindre',
    click_accept_to_join_conversation: 'Cliquez sur accepter pour rejoindre la conversation',
    auto_translation: 'Traduction Automatique',
    cross_language_communication: 'Communication sans barrières linguistiques',
    voice_video_calls: 'Appels Audio & Vidéo',
    high_quality_communication: 'Communication en temps réel de haute qualité',
    group_chat: 'Chat de Groupe',
    connect_with_friends: 'Restez connecté avec vos amis',
    accepting: 'Acceptation...',
    processing_invite: 'Traitement de l\'invitation...',
    accept_invitation: 'Accepter l\'Invitation',
    by_accepting_you_agree: 'En acceptant, vous acceptez',
    terms_and_privacy: 'Conditions d\'Utilisation et Politique de Confidentialité',
    
    // Profile Edit
    pleaseSelectImage: 'Veuillez sélectionner une image',
    avatarUpdated: 'Avatar mis à jour',
    uploadFailed: 'Échec du téléchargement',
    profileUpdated: 'Profil mis à jour',
    uploading: 'Téléchargement...',
    tapToChangeAvatar: 'Appuyez pour changer l\'avatar',
    enterFirstName: 'Veuillez entrer le prénom',
    enterLastName: 'Veuillez entrer le nom de famille',
    profileEditNote: 'Les informations modifiées seront visibles par tous les amis',
    accountIdCopied: 'ID du compte copié',
    copyFailed: 'Échec de la copie',
    
    // Service Center
    serviceCenter: 'Centre de Services',
    accountAndIdentity: 'Compte et Identité',
    myWorkAccounts: 'Mes Comptes de Travail',
    manageEnterpriseIdentities: 'Voir/gérer les identités d\'entreprise',
    myCreatorAccounts: 'Mes Comptes de Créateur',
    manageContentCreatorIdentities: 'Voir/gérer les identités de créateur',
    applyEnterpriseAccount: 'Demander un Compte d\'Entreprise',
    createEnterpriseWizard: 'Entrer dans l\'assistant de création d\'entreprise',
    oaContentUpload: 'Télécharger Contenu/Produit',
    oaProductUpload: 'Télécharger Produit',
    oaContentManagement: 'Gestion Contenu/Produit',
    oaProductManagement: 'Gestion des Produits',
    oaPublishContent: 'Publier du Contenu',
    oaUploadProduct: 'Télécharger Produit',
    oaArticle: 'Article',
    oaVideo: 'Vidéo',
    oaProduct: 'Produit',
    oaTitle: 'Titre',
    oaTitlePlaceholder: 'Entrez le titre',
    oaDescription: 'Description',
    oaDescriptionPlaceholder: 'Entrez la description',
    oaSelectVideo: 'Sélectionner Vidéo',
    oaVideoCover: 'Couverture Vidéo (Optionnel)',
    oaUploadImages: 'Télécharger Images',
    oaMaxImages: 'Maximum 9 images',
    oaProductCover: 'Couverture Produit',
    oaPrice: 'Prix',
    oaPricePlaceholder: 'Entrez le prix',
    oaPublish: 'Publier',
    oaPublishing: 'Publication en cours...',
    oaNoContent: 'Pas de contenu, cliquez sur "Publier du Contenu" pour commencer',
    oaStartPublish: 'Commencer à Publier',
    oaNoProducts: 'Pas de produits, cliquez sur "Télécharger Produit" pour commencer',
    oaUploadProductFirst: 'Pas de produits, veuillez d\'abord télécharger un produit',
    oaViews: 'Vues',
    oaLikes: 'J\'aime',
    oaBindProduct: 'Lier la Promotion Produit',
    oaBoundProduct: 'Produit Lié',
    oaSelectProductToBind: 'Sélectionnez un produit à promouvoir dans ce contenu',
    oaUnbind: 'Délier',
    oaClose: 'Fermer',
    oaContentList: 'Liste de Contenu',
    oaProductList: 'Liste de Produits',
    oaPublishSuccess: 'Publié avec succès',
    oaPublishFailed: 'Échec de la publication',
    oaDeleteSuccess: 'Supprimé avec succès',
    oaDeleteFailed: 'Échec de la suppression',
    oaBindSuccess: 'Lié avec succès',
    oaBindFailed: 'Échec de la liaison',
    oaStatContent: 'Total des Œuvres',
    oaStatFollowers: 'Total des Abonnés',
    oaStatViews: 'Total des Vues',
    oaStatEarnings: 'Revenus du Mois',
    oaDrafts: 'Brouillons',
    oaOnline: 'Publié',
    oaTrash: 'Corbeille',
    oaMoveToBin: 'Déplacer vers Corbeille',
    oaRestore: 'Restaurer',
    oaPermanentDelete: 'Supprimer Définitivement',
    oaRestoreSuccess: 'Restauré',
    oaAll: 'Tous',
    close: 'Fermer',
    followNow: 'Suivre',
    following: 'Suivi',
    saySmething: 'Dites quelque chose...',
    noImage: 'Pas d\'image',
    contentNotFound: 'Contenu introuvable ou supprimé',
    viewProduct: 'Voir',
    tagsLabel: 'Tags',
    invalidDate: 'Date invalide',
    shareSuccess: 'Partagé avec succès',
    shareFailed: 'Échec du partage',
    linkCopied: 'Lien copié',
    copiedToClipboard: 'Copié dans le presse-papiers',
    lineOaInviteTitle: 'Ceci est mon compte LINE multilingue',
    lineOaInviteDesc: 'Suivez-moi pour démarrer la communication multilingue !',
    lineOaFollowMe: 'Me suivre sur LINE',
    lineOaLoginToConnect: 'Connectez-vous pour démarrer le chat multilingue'
  },
  ar: {
    chats: 'المحادثات',
    friends: 'الأصدقاء',
    groups: 'المجموعات',
    profile: 'الملف الشخصي',
    discover: 'اكتشف',
    shop: 'التسوق',
    worldInbox: 'صندوق الوارد العالمي',
    add: 'إضافة',
    cancel: 'إلغاء',
    create: 'إنشاء',
    send: 'إرسال',
    back: 'رجوع',
    settings: 'الإعدادات',
    logout: 'تسجيل الخروج',
    inviteFriends: 'دعوة الأصدقاء',
    scanQR: 'مسح رمز QR',
    friendsList: 'قائمة الأصدقاء',
    addFriend: 'إضافة صديق',
    friendId: 'معرف الصديق',
    addFriendPlaceholder: 'أدخل معرف الصديق أو الهاتف...',
    newFriendRequest: 'طلب صداقة جديد',
    acceptFriendRequest: 'قبول',
    rejectFriendRequest: 'رفض',
    groupsList: 'قائمة المجموعات',
    createGroup: 'إنشاء مجموعة',
    groupName: 'اسم المجموعة',
    groupNamePlaceholder: 'أدخل اسم المجموعة...',
    selectMembers: 'اختيار الأعضاء',
    selectedMembers: 'الأعضاء المختارون',
    selectAll: 'اختيار الكل',
    deselectAll: 'إلغاء اختيار الكل',
    searchFriends: 'البحث عن الأصدقاء',
    noSearchResults: 'لم يتم العثور على أصدقاء مطابقين',
    typeMessage: 'اكتب رسالة...',
    online: 'متصل',
    offline: 'غير متصل',
    translating: 'جاري الترجمة...',
    aiAssistantName: 'مساعدي',
    myQrCode: 'رمز QR الخاص بي',
    languageSettings: 'إعدادات اللغة',
    notifications: 'الإشعارات',
    otherSettings: 'إعدادات أخرى',
    myLanguage: 'لغتي',
    multilingualCard: 'رمز الاستجابة السريعة الخاص بي',
    myShareLink: 'رابط المشاركة الخاص بي',
    viewCard: 'عرض البطاقة',
    qrCodePlaceholder: 'رمز QR (امسح لإضافتي)',
    scanQRToViewCard: 'امسح رمز QR لعرض البطاقة متعددة اللغات',
    scanQRToAddFriend: 'امسح رمز QR الخاص بصديق لإضافته',
    cameraPermissionDenied: 'تم رفض إذن الكاميرا. يرجى السماح بالوصول إلى الكاميرا في الإعدادات',
    externalAccounts: 'إدارة الحسابات الخارجية',
    connected: 'متصل',
    notConfigured: 'غير مهيأ',
    lineNotConfigured: 'LINE غير مهيأ',
    systemSettings: 'إدارة النظام',
    soundEffects: 'إدارة المؤثرات الصوتية',
    searchChats: 'بحث في المحادثات',
    searchContactsOrGroups: 'ابحث عن جهات الاتصال أو المجموعات...',
    contacts: 'جهات الاتصال',
    group: 'مجموعة',
    noResultsFound: 'لم يتم العثور على نتائج',
    tryDifferentKeyword: 'جرب كلمة مفتاحية مختلفة',
    searchContactsAndGroups: 'بحث جهات الاتصال والمجموعات',
    enterNameToSearch: 'أدخل اسمًا أو اسم مجموعة للبحث',
    
    // Guest User
    guestAccountNotice: 'Guest account notice',
    upgradeToInviteFriends: 'Upgrade to invite friends',
    upgradeAccount: 'Upgrade account',
    guestChatRestricted: 'Guest Account Limitation',
    guestUpgradeToChatWithFriends: 'Guest users can only chat with AI Assistant. Please upgrade to chat with friends.',
    upgradeNow: 'Upgrade Now',
    loading: 'جاري التحميل...',
    error: 'خطأ',
    success: 'نجح',
    saved: 'تم الحفظ',
    saveFailed: 'فشل في الحفظ',
    justNow: 'الآن',
    minutesAgo: 'منذ دقائق',
    hoursAgo: 'منذ ساعات',
    yesterday: 'أمس',
    daysAgo: 'منذ أيام',
    noMessages: 'لا توجد رسائل',
    mePrefix: 'أنا: ',
    unknownUser: 'مستخدم غير معروف',
    groupLabel: '(مجموعة)',
    emptyChatsHint: 'لا توجد محادثات بعد، أضف أصدقاء أو أنشئ مجموعات للبدء!',
    chatInfo: 'معلومات المحادثة',
    searchChatHistory: 'البحث في تاريخ المحادثة',
    clearChatHistory: 'مسح تاريخ المحادثة',
    muteNotifications: 'كتم الإشعارات',
    pinChat: 'تثبيت المحادثة',
    reminders: 'التذكيرات',
    setChatBackground: 'تعيين خلفية المحادثة',
    report: 'إبلاغ',
    selectFunction: 'اختيار الوظيفة',
    gallery: 'المعرض',
    camera: 'الكاميرا',
    voiceCall: 'مكالمة صوتية',
    location: 'الموقع',
    file: 'ملف',
    favorites: 'المفضلة',
    businessCard: 'بطاقة عمل',
    videoCall: 'مكالمة فيديو',
    voiceCallNeedSDK: 'تتطلب ميزة المكالمة الصوتية تكامل WebRTC/SDK طرف ثالث',
    videoCallNeedSDK: 'تتطلب ميزة مكالمة الفيديو تكامل WebRTC/SDK طرف ثالث',
    favoritesNotImplemented: 'ميزة المفضلة غير مطبقة بعد',
    locationPermissionError: 'لا يمكن الحصول على الموقع الحالي، تحقق من أذونات الموقع',
    locationNotSupported: 'خدمات الموقع غير مدعومة على هذا الجهاز',
    viewLocation: 'عرض الموقع',
    clickToOpenMaps: 'انقر لفتح خرائط Google',
    businessCardPrefix: 'بطاقة عمل',
    emailLabel: 'البريد الإلكتروني',
    phoneLabel: 'الهاتف',
    phoneNotSet: 'غير محدد',
    selectContact: 'اختر جهة اتصال',
    searchContacts: 'البحث عن جهات الاتصال',
    myCard: 'بطاقتي',
    inviteToCall: 'دعوة للمكالمة',
    noFriends: 'لا يوجد أصدقاء',
    invite: 'دعوة',
    
    // New fields
    confirm: 'تأكيد',
    delete: 'حذف',
    save: 'حفظ',
    saving: 'Saving...',
    copy: 'نسخ',
    search: 'بحث',
    share: 'مشاركة',
    searchUsers: 'البحث عن المستخدمين',
    searchPlaceholder: 'البحث باسم المستخدم أو الاسم أو البريد الإلكتروني...',
    searchResults: 'نتائج البحث',
    searching: 'جاري البحث...',
    noUsersFound: 'لم يتم العثور على مستخدمين',
    addByUsername: 'إضافة صديق باسم المستخدم',
    channelWhatsapp: 'WhatsApp',
    channelWechat: 'WeChat',
    channelLine: 'LINE',
    channelMessenger: 'Messenger',
    channelTelegram: 'Telegram',
    channelInstagram: 'Instagram',
    channelViber: 'Viber',
    emptyChatRecord: 'لا يوجد سجل دردشة حتى الآن، أضف أصدقاء أو انضم إلى مجموعات للبدء!',
    noGroupsHint: 'لا توجد مجموعات حتى الآن، أنشئ مجموعة للبدء!',
    noFriendsHint: 'لا يوجد أصدقاء حتى الآن، أضف بعض الأصدقاء!',
    loadingMessages: 'تحميل الرسائل...',
    loadMore: 'تحميل المزيد من الرسائل',
    startConversation: 'بدء محادثة مع {}',
    welcomeToGroup: 'مرحباً بك في {}',
    
    // Error messages
    loginFailed: 'فشل تسجيل الدخول، يرجى المحاولة مرة أخرى',
    loginError: 'خطأ في تسجيل الدخول',
    lineLoginError: 'حدث خطأ في تسجيل الدخول عبر LINE',
    authFailed: 'فشل التوثيق، يرجى المحاولة مرة أخرى',
    loginParamsMissing: 'معاملات تسجيل الدخول مفقودة',
    redirectFailed: 'فشل إعادة التوجيه، يرجى المحاولة مرة أخرى',
    addFriendFailed: 'فشل إضافة الصديق',
    createGroupFailed: 'فشل إنشاء المجموعة',
    loadChatsFailed: 'لا يمكن تحميل قائمة المحادثات',
    loadFriendsFailed: 'لا يمكن تحميل قائمة الأصدقاء',
    loadGroupsFailed: 'لا يمكن تحميل قائمة المجموعات',
    getLocationFailed: 'فشل الحصول على الموقع',
    translationError: 'خطأ في الترجمة',
    webrtcNetworkRestricted: 'قيود الشبكة تمنع إجراء المكالمة. قم بالتبديل إلى بيانات الجوال (4G/5G) وأعد المحاولة',
    mediaPermissionDenied: 'تم رفض إذن الميكروفون/الكاميرا. يرجى السماح بالوصول والمحاولة مرة أخرى',
    
    // Success messages
    friendRequestSent: 'تم إرسال طلب الصداقة',
    groupCreated: 'تم إنشاء المجموعة بنجاح',
    callInviteSent: 'دعوة {} أصدقاء إلى المكالمة {}',
    
    // Dialog content
    switchLanguage: 'تغيير اللغة',
    switchLanguageConfirm: 'هل أنت متأكد من التغيير إلى {}؟',
    uiWillShow: '• ستظهر واجهة المستخدم بهذه اللغة',
    uiWillShowEnglish: '• ستظهر واجهة المستخدم باللغة الإنجليزية',
    onlyChatTranslation: '• يدعم فقط ترجمة رسائل الدردشة',
    applying: 'جاري التطبيق...',
    
    // Language Picker
    languageSearchPlaceholder: '搜索/Search/検索/ค้นหา/Cari/Tìm kiếm',
    chatTranslationOnly: '(ترجمة الدردشة)',
    chatTranslationNote: '• <strong>ترجمة الدردشة</strong>: বাংলা، اردو، Türkçe، Tiếng Việt تدعم ترجمة الدردشة مع واجهة بالإنجليزية',
    fullUiSupport: 'اللغات مع دعم كامل لترجمة الواجهة',
    fullUiSupportLanguages: '简体中文、English、ไทย、日本語、Bahasa Indonesia、Español، Français، العربية، हिन्दी، Deutsch، Русский، Português',
    
    // Login page
    appDescription: 'نظام الاتصال الفوري متعدد اللغات',
    loginWithLine: 'تسجيل الدخول باستخدام LINE',
    chatWithWorldFriends: 'سجل دخولك بحساب LINE للدردشة مع الأصدقاء حول العالم',
    
    // Validation messages
    enterUsername: 'يرجى إدخال اسم المستخدم للبحث',
    enterGroupName: 'يرجى إدخال اسم المجموعة',
    selectOneFriend: 'يرجى اختيار صديق واحد على الأقل',
    groupNeedAtLeastThreePeople: 'تتطلب المجموعات 3 أشخاص على الأقل (بما في ذلك أنت). يرجى اختيار صديقين آخرين على الأقل',
    
    // Development
    inDevelopment: 'قيد التطوير...',
    
    // New Profile Menu Items
    myServices: 'خدماتي',
    myFavorites: 'مفضلاتي',
    myDiscovery: 'اكتشافاتي',
    ordersAndPoints: 'الطلبات والنقاط',
    emoticons: 'الرموز التعبيرية',
    personalProfile: 'الملف الشخصي',
    accountSecurity: 'أمان الحساب',
    friendPermissions: 'إضافة أصدقاء',
    userAgreement: 'اتفاقية المستخدم',
    privacyPolicy: 'سياسة الخصوصية',
    
    // Account types
    personalAccount: 'حساب شخصي',
    accountId: 'معرف الحساب',
    personal: 'شخصي',
    creator: 'منشئ محتوى',
    enterprise: 'مؤسسة',
    noOtherAccounts: 'لا توجد حسابات أخرى',
    
    // New menu items
    services: 'الخدمات',
    stickers: 'الملصقات',
    
    // Commerce
    orders: 'الطلبات',
    cart: 'السلة',
    points: 'النقاط',
    wallet: 'المحفظة',
    myOrders: 'طلباتي',
    myCart: 'سلتي',
    myPoints: 'نقاطي',
    myWallet: 'محفظتي',
    noOrders: 'لا توجد طلبات',
    noCartItems: 'السلة فارغة',
    totalPoints: 'إجمالي النقاط',
    balance: 'الرصيد',
    availableBalance: 'الرصيد المتاح',
    emptyState: 'لا توجد بيانات',
    
    // Friend requests
    friendRequests: 'طلبات الصداقة',
    wantsToBeYourFriend: 'يريد أن يكون صديقك',
    accept: 'قبول',
    decline: 'رفض',
    friendRequestAccepted: 'تم قبول طلب الصداقة',
    friendRequestDeclined: 'تم رفض طلب الصداقة',
    failedToAcceptFriend: 'فشل في قبول طلب الصداقة',
    failedToDeclineFriend: 'فشل في رفض طلب الصداقة',
    alreadyFriends: 'أصدقاء بالفعل',
    friendRequestAlreadySent: 'تم إرسال طلب الصداقة بالفعل',
    cannotAddYourself: 'لا يمكنك إضافة نفسك كصديق',
    
    // Membership Cards
    myMembershipCards: 'بطاقات العضوية الخاصة بي',
    membershipTierRegular: 'عضو عادي',
    membershipTierSilver: 'عضو فضي',
    membershipTierGold: 'عضو ذهبي',
    membershipTierPlatinum: 'عضو بلاتيني',
    currentPoints: 'النقاط الحالية',
    pointsSuffix: 'نقطة',
    
    // Account Types
    lineAccount: 'حساب LINE',
    phoneAccount: 'حساب الهاتف',
    guestAccount: 'حساب ضيف',
    
    // PWA Installation
    installSuccess: 'تم التثبيت بنجاح!',
    appInstalledSuccessfully: 'تمت إضافة Trustalk بنجاح إلى شاشتك الرئيسية',
    iosInstallGuide: 'دليل تثبيت iOS',
    iosInstallInstructions: 'يرجى النقر على زر المشاركة في أسفل المتصفح ثم اختيار \'إضافة إلى الشاشة الرئيسية\'',
    manualInstall: 'تثبيت يدوي',
    manualInstallInstructions: 'يرجى اختيار \'إضافة إلى الشاشة الرئيسية\' أو \'تثبيت التطبيق\' في قائمة المتصفح',
    addToHomeScreen: 'إضافة إلى الشاشة الرئيسية',
    installLikeApp: 'تثبيت بنقرة واحدة، استخدم كتطبيق',
    
    // Friend Request Toasts
    friendRequestAcceptedToast: 'تم قبول طلب الصداقة',
    friendAddedSuccessfully: 'لقد أضفت صديقًا جديدًا بنجاح',
    operationFailed: 'فشلت العملية',
    acceptFriendRequestFailed: 'فشل قبول طلب الصداقة، يرجى المحاولة مرة أخرى',
    friendRequestDeclinedToast: 'تم رفض طلب الصداقة',
    friendRequestDeclinedMessage: 'تم رفض طلب الصداقة',
    declineFriendRequestFailed: 'فشل رفض طلب الصداقة، يرجى المحاولة مرة أخرى',
    pendingFriendRequests: 'طلبات الصداقة المعلقة',
    noFriendRequests: 'لا توجد طلبات صداقة',
    
    // New page content
    comingSoon: 'Coming Soon',
    noFavorites: 'No Favorites',
    noEmoticons: 'No Emoticons',
    username: 'Username',
    firstName: 'First Name',
    lastName: 'Last Name',
    nickname: 'Nickname',
    phoneNumber: 'Phone Number',
    languagePreference: 'Language Preference',
    notSet: 'Not Set',
    memberSince: 'Member Since',
    editProfile: 'Edit Profile',
    saveChanges: 'Save Changes',
    editing: 'Editing',
    usernameTaken: 'Username is already taken',
    profileUpdateSuccess: 'Profile updated successfully',
    profileUpdateFailed: 'Failed to update profile',
    selectLanguage: 'Select Language',
    upgradeForSecurity: 'Upgrade your account for better security',
    accountType: 'Account Type',
    linkedAccounts: 'Linked Accounts',
    lineAndPhone: 'LINE and Phone',
    lineOnly: 'LINE Only',
    phoneOnly: 'Phone Only',
    none: 'None',
    changePassword: 'Change Password',
    twoFactorAuth: 'Two-Factor Authentication',
    notEnabled: 'Not Enabled',
    securityTips: 'Security Tips',
    securityTip1: 'Change your password regularly and use strong passwords',
    securityTip2: 'Do not share your account information with others',
    securityTip3: 'Enable two-factor authentication for enhanced security',
    usernameRequired: 'اسم المستخدم مطلوب',
    firstNameRequired: 'الاسم الأول مطلوب',
    
    supportsMultilingualTranslation: 'يدعم الترجمة متعددة اللغات',
    supportedLanguages: 'العربية • English • 中文 • ไทย • 日本語 • Bahasa Indonesia • Español • Français • हिन्दी • Deutsch • Русский • Português',
    guestLogin: 'جرب الآن',
    sixDigitSignup: 'معرف من 6 أرقام',
    usernameSignup: 'اسم المستخدم',
    lineLogin: 'تسجيل الدخول LINE',
    connectWithoutBarriers: 'تواصل بدون حواجز',

    // Invite System
    invite_friends: 'دعوة الأصدقاء',
    invite_to_group: 'دعوة إلى المجموعة',
    invite_to_chat: 'دعوة إلى الدردشة',
    sms: 'رسالة نصية',
    email: 'بريد إلكتروني',
    invite_to_yulink: 'أدعوك للانضمام إلى دردشة Trustalk',
    copied: 'تم النسخ',
    invite_link_copied: 'تم نسخ رابط الدعوة',
    generating_link: 'جاري إنشاء الرابط...',
    show_qr_code: 'عرض رمز QR',
    scan_to_join: 'امسح للانضمام',
    share_link: 'مشاركة الرابط',
    share_to_platform: 'مشاركة على المنصة',
    invite_tips_title: 'نصائح الدعوة',
    invite_tip_1: 'روابط الدعوة صالحة لمدة 7 أيام، يرجى إعادة الإنشاء بعد انتهاء الصلاحية',
    invite_tip_2: 'يمكن للمستلمين الانضمام مباشرة دون تسجيل',
    invite_tip_3: 'يدعم الترجمة التلقائية متعددة اللغات ومكالمات الصوت/الفيديو',
    invite_message: 'انضم إلى {roomName} الخاص بي على {appName}!',
    failed_to_generate_invite_link: 'فشل في إنشاء رابط الدعوة',
    invite_accepted_successfully: 'تم قبول الدعوة بنجاح',
    failed_to_accept_invite: 'فشل في قبول الدعوة',
    invite_link_expired: 'انتهت صلاحية رابط الدعوة',
    invalid_invite_link: 'رابط دعوة غير صالح',
    invite_error: 'خطأ في الدعوة',
    back_to_home: 'العودة إلى الصفحة الرئيسية',
    multilingual_instant_communication: 'الاتصال الفوري متعدد اللغات',
    youre_invited_to_join: 'أنت مدعو للانضمام',
    click_accept_to_join_conversation: 'انقر على قبول للانضمام إلى المحادثة',
    auto_translation: 'ترجمة تلقائية',
    cross_language_communication: 'تواصل بدون حواجز لغوية',
    voice_video_calls: 'مكالمات صوتية وفيديو',
    high_quality_communication: 'اتصال عالي الجودة في الوقت الفعلي',
    group_chat: 'دردشة جماعية',
    connect_with_friends: 'ابق على اتصال مع الأصدقاء',
    accepting: 'جاري القبول...',
    processing_invite: 'جاري معالجة الدعوة...',
    accept_invitation: 'قبول الدعوة',
    by_accepting_you_agree: 'بالقبول، فإنك توافق على',
    terms_and_privacy: 'شروط الخدمة وسياسة الخصوصية',
    
    // Profile Edit
    pleaseSelectImage: 'الرجاء تحديد صورة',
    avatarUpdated: 'تم تحديث الصورة الرمزية',
    uploadFailed: 'فشل التحميل',
    profileUpdated: 'تم تحديث الملف الشخصي',
    uploading: 'جاري التحميل...',
    tapToChangeAvatar: 'اضغط لتغيير الصورة الرمزية',
    enterFirstName: 'الرجاء إدخال الاسم الأول',
    enterLastName: 'الرجاء إدخال اسم العائلة',
    profileEditNote: 'ستكون المعلومات المعدلة مرئية لجميع الأصدقاء',
    accountIdCopied: 'تم نسخ معرف الحساب',
    copyFailed: 'فشل النسخ',
    
    // Service Center
    serviceCenter: 'مركز الخدمات',
    accountAndIdentity: 'الحساب والهوية',
    myWorkAccounts: 'حسابات العمل الخاصة بي',
    manageEnterpriseIdentities: 'عرض/إدارة هويات المؤسسة',
    myCreatorAccounts: 'حسابات المنشئ الخاصة بي',
    manageContentCreatorIdentities: 'عرض/إدارة هويات المنشئ',
    applyEnterpriseAccount: 'التقدم لحساب مؤسسة',
    createEnterpriseWizard: 'الدخول إلى معالج إنشاء المؤسسة',
    oaContentUpload: 'تحميل المحتوى/المنتج',
    oaProductUpload: 'تحميل المنتج',
    oaContentManagement: 'إدارة المحتوى/المنتج',
    oaProductManagement: 'إدارة المنتجات',
    oaPublishContent: 'نشر المحتوى',
    oaUploadProduct: 'تحميل المنتج',
    oaArticle: 'مقالة',
    oaVideo: 'فيديو',
    oaProduct: 'منتج',
    oaTitle: 'العنوان',
    oaTitlePlaceholder: 'أدخل العنوان',
    oaDescription: 'الوصف',
    oaDescriptionPlaceholder: 'أدخل الوصف',
    oaSelectVideo: 'اختر الفيديو',
    oaVideoCover: 'غلاف الفيديو (اختياري)',
    oaUploadImages: 'تحميل الصور',
    oaMaxImages: 'الحد الأقصى 9 صور',
    oaProductCover: 'غلاف المنتج',
    oaPrice: 'السعر',
    oaPricePlaceholder: 'أدخل السعر',
    oaPublish: 'نشر',
    oaPublishing: 'جاري النشر...',
    oaNoContent: 'لا يوجد محتوى، انقر على "نشر المحتوى" للبدء',
    oaStartPublish: 'بدء النشر',
    oaNoProducts: 'لا توجد منتجات، انقر على "تحميل المنتج" للبدء',
    oaUploadProductFirst: 'لا توجد منتجات، يرجى تحميل منتج أولاً',
    oaViews: 'المشاهدات',
    oaLikes: 'الإعجابات',
    oaBindProduct: 'ربط ترويج المنتج',
    oaBoundProduct: 'المنتج المرتبط',
    oaSelectProductToBind: 'اختر منتجًا للترويج في هذا المحتوى',
    oaUnbind: 'إلغاء الربط',
    oaClose: 'إغلاق',
    oaContentList: 'قائمة المحتوى',
    oaProductList: 'قائمة المنتجات',
    oaPublishSuccess: 'تم النشر بنجاح',
    oaPublishFailed: 'فشل في النشر',
    oaDeleteSuccess: 'تم الحذف بنجاح',
    oaDeleteFailed: 'فشل في الحذف',
    oaBindSuccess: 'تم الربط بنجاح',
    oaBindFailed: 'فشل في الربط',
    oaStatContent: 'إجمالي الأعمال',
    oaStatFollowers: 'إجمالي المتابعين',
    oaStatViews: 'إجمالي المشاهدات',
    oaStatEarnings: 'أرباح الشهر',
    oaDrafts: 'المسودات',
    oaOnline: 'منشور',
    oaTrash: 'سلة المهملات',
    oaMoveToBin: 'نقل إلى سلة المهملات',
    oaRestore: 'استعادة',
    oaPermanentDelete: 'حذف نهائي',
    oaRestoreSuccess: 'تم الاستعادة',
    oaAll: 'الكل',
    close: 'إغلاق',
    followNow: 'متابعة',
    following: 'متابَع',
    saySmething: 'قل شيئًا...',
    noImage: 'لا توجد صورة',
    contentNotFound: 'المحتوى غير موجود أو تم حذفه',
    viewProduct: 'عرض',
    tagsLabel: 'العلامات',
    invalidDate: 'تاريخ غير صالح',
    shareSuccess: 'تمت المشاركة بنجاح',
    shareFailed: 'فشل المشاركة',
    linkCopied: 'تم نسخ الرابط',
    copiedToClipboard: 'تم النسخ إلى الحافظة',
    lineOaInviteTitle: 'هذا حسابي متعدد اللغات على LINE',
    lineOaInviteDesc: 'تابعني لبدء التواصل متعدد اللغات!',
    lineOaFollowMe: 'تابعني على LINE',
    lineOaLoginToConnect: 'تسجيل الدخول لبدء المحادثة متعددة اللغات'
  },
  hi: {
    chats: 'चैट',
    friends: 'मित्र',
    groups: 'समूह',
    profile: 'प्रोफाइल',
    discover: 'खोजें',
    shop: 'खरीदारी',
    worldInbox: 'विश्व इनबॉक्स',
    add: 'जोड़ें',
    cancel: 'रद्द करें',
    create: 'बनाएं',
    send: 'भेजें',
    back: 'वापस',
    settings: 'सेटिंग्स',
    logout: 'लॉग आउट',
    inviteFriends: 'मित्रों को आमंत्रित करें',
    scanQR: 'QR स्कैन करें',
    friendsList: 'मित्र सूची',
    addFriend: 'मित्र जोड़ें',
    friendId: 'मित्र ID',
    addFriendPlaceholder: 'मित्र ID या फोन दर्ज करें...',
    newFriendRequest: 'नया मित्र अनुरोध',
    acceptFriendRequest: 'स्वीकार करें',
    rejectFriendRequest: 'अस्वीकार करें',
    groupsList: 'समूह सूची',
    createGroup: 'समूह बनाएं',
    groupName: 'समूह का नाम',
    groupNamePlaceholder: 'समूह का नाम दर्ज करें...',
    selectMembers: 'सदस्य चुनें',
    selectedMembers: 'चयनित सदस्य',
    selectAll: 'सभी चुनें',
    deselectAll: 'सभी का चयन रद्द करें',
    searchFriends: 'मित्रों को खोजें',
    noSearchResults: 'कोई मेल खाने वाले मित्र नहीं मिले',
    typeMessage: 'संदेश टाइप करें...',
    online: 'ऑनलाइन',
    offline: 'ऑफलाइन',
    translating: 'अनुवाद कर रहे हैं...',
    aiAssistantName: 'मेरा सहायक',
    myQrCode: 'मेरा QR कोड',
    languageSettings: 'भाषा सेटिंग्स',
    notifications: 'सूचनाएं',
    otherSettings: 'अन्य सेटिंग्स',
    myLanguage: 'मेरी भाषा',
    multilingualCard: 'मेरा QR कोड',
    myShareLink: 'मेरा शेयर लिंक',
    viewCard: 'कार्ड देखें',
    qrCodePlaceholder: 'QR कोड (मुझे जोड़ने के लिए स्कैन करें)',
    scanQRToViewCard: 'बहुभाषी कार्ड देखने के लिए QR कोड स्कैन करें',
    scanQRToAddFriend: 'मित्र जोड़ने के लिए उनका QR कोड स्कैन करें',
    cameraPermissionDenied: 'कैमरा अनुमति अस्वीकृत। कृपया सेटिंग में कैमरा एक्सेस की अनुमति दें',
    externalAccounts: 'बाहरी खाता प्रबंधन',
    connected: 'कनेक्टेड',
    notConfigured: 'कॉन्फ़िगर नहीं',
    lineNotConfigured: 'LINE कॉन्फ़िगर नहीं',
    systemSettings: 'सिस्टम प्रबंधन',
    soundEffects: 'ध्वनि प्रभाव प्रबंधन',
    searchChats: 'चैट खोजें',
    searchContactsOrGroups: 'संपर्क या समूह खोजें...',
    contacts: 'संपर्क',
    group: 'समूह',
    noResultsFound: 'कोई परिणाम नहीं मिला',
    tryDifferentKeyword: 'एक अलग कीवर्ड आज़माएं',
    searchContactsAndGroups: 'संपर्क और समूह खोजें',
    enterNameToSearch: 'खोजने के लिए नाम या समूह का नाम दर्ज करें',
    
    // Guest User
    guestAccountNotice: 'Guest account notice',
    upgradeToInviteFriends: 'Upgrade to invite friends',
    upgradeAccount: 'Upgrade account',
    guestChatRestricted: 'Guest Account Limitation',
    guestUpgradeToChatWithFriends: 'Guest users can only chat with AI Assistant. Please upgrade to chat with friends.',
    upgradeNow: 'Upgrade Now',
    loading: 'लोड हो रहा है...',
    error: 'त्रुटि',
    success: 'सफलता',
    saved: 'सहेजा गया',
    saveFailed: 'सहेजने में विफल',
    justNow: 'अभी',
    minutesAgo: 'मिनट पहले',
    hoursAgo: 'घंटे पहले',
    yesterday: 'कल',
    daysAgo: 'दिन पहले',
    noMessages: 'कोई संदेश नहीं',
    mePrefix: 'मैं: ',
    unknownUser: 'अज्ञात उपयोगकर्ता',
    groupLabel: '(समूह)',
    emptyChatsHint: 'अभी तक कोई चैट नहीं, शुरू करने के लिए मित्र जोड़ें या समूह बनाएं!',
    chatInfo: 'चैट जानकारी',
    searchChatHistory: 'चैट इतिहास खोजें',
    clearChatHistory: 'चैट इतिहास साफ़ करें',
    muteNotifications: 'सूचनाएं म्यूट करें',
    pinChat: 'चैट पिन करें',
    reminders: 'रिमाइंडर',
    setChatBackground: 'चैट बैकग्राउंड सेट करें',
    report: 'रिपोर्ट करें',
    selectFunction: 'फ़ंक्शन चुनें',
    gallery: 'गैलरी',
    camera: 'कैमरा',
    voiceCall: 'वॉयस कॉल',
    location: 'स्थान',
    file: 'फ़ाइल',
    favorites: 'पसंदीदा',
    businessCard: 'बिज़नेस कार्ड',
    videoCall: 'वीडियो कॉल',
    voiceCallNeedSDK: 'वॉयस कॉल फीचर के लिए WebRTC/तृतीय पक्ष SDK एकीकरण की आवश्यकता है',
    videoCallNeedSDK: 'वीडियो कॉल फीचर के लिए WebRTC/तृतीय पक्ष SDK एकीकरण की आवश्यकता है',
    favoritesNotImplemented: 'पसंदीदा फीचर अभी तक लागू नहीं किया गया है',
    locationPermissionError: 'वर्तमान स्थान प्राप्त नहीं कर सकते, कृपया स्थान अनुमतियों की जांच करें',
    locationNotSupported: 'इस डिवाइस पर स्थान सेवाएं समर्थित नहीं हैं',
    viewLocation: 'स्थान देखें',
    clickToOpenMaps: 'Google Maps खोलने के लिए क्लिक करें',
    businessCardPrefix: 'बिज़नेस कार्ड',
    emailLabel: 'ईमेल',
    phoneLabel: 'फोन',
    phoneNotSet: 'सेट नहीं किया गया',
    selectContact: 'संपर्क चुनें',
    searchContacts: 'संपर्क खोजें',
    myCard: 'मेरा कार्ड',
    inviteToCall: 'कॉल में आमंत्रित करें',
    noFriends: 'कोई मित्र नहीं',
    invite: 'आमंत्रित करें',
    
    // New fields
    confirm: 'पुष्टि करें',
    delete: 'हटाएं',
    save: 'सेव करें',
    saving: 'Saving...',
    copy: 'कॉपी करें',
    search: 'खोजें',
    share: 'साझा करें',
    searchUsers: 'उपयोगकर्ता खोजें',
    searchPlaceholder: 'उपयोगकर्ता नाम, नाम या ईमेल खोजें...',
    searchResults: 'खोज परिणाम',
    searching: 'खोज रहे हैं...',
    noUsersFound: 'कोई उपयोगकर्ता नहीं मिला',
    addByUsername: 'उपयोगकर्ता नाम से मित्र जोड़ें',
    channelWhatsapp: 'WhatsApp',
    channelWechat: 'WeChat',
    channelLine: 'LINE',
    channelMessenger: 'Messenger',
    channelTelegram: 'Telegram',
    channelInstagram: 'Instagram',
    channelViber: 'Viber',
    emptyChatRecord: 'अभी तक कोई चैट रिकॉर्ड नहीं, मित्र जोड़ें या समूह में शामिल हों!',
    noGroupsHint: 'अभी तक कोई समूह नहीं, एक समूह बनाएं!',
    noFriendsHint: 'अभी तक कोई मित्र नहीं, कुछ मित्र जोड़ें!',
    loadingMessages: 'संदेश लोड हो रहे हैं...',
    loadMore: 'और संदेश लोड करें',
    startConversation: '{} के साथ बातचीत शुरू करें',
    welcomeToGroup: '{} में आपका स्वागत है',
    
    // Error messages
    loginFailed: 'लॉगिन विफल, कृपया पुनः प्रयास करें',
    loginError: 'लॉगिन त्रुटि',
    lineLoginError: 'LINE लॉगिन में त्रुटि हुई',
    authFailed: 'प्रामाणिकता विफल, कृपया पुनः प्रयास करें',
    loginParamsMissing: 'लॉगिन पैरामीटर गुम हैं',
    redirectFailed: 'रीडायरेक्ट विफल, कृपया पुनः प्रयास करें',
    addFriendFailed: 'मित्र जोड़ना विफल',
    createGroupFailed: 'समूह बनाना विफल',
    loadChatsFailed: 'चैट सूची लोड नहीं हो सकी',
    loadFriendsFailed: 'मित्र सूची लोड नहीं हो सकी',
    loadGroupsFailed: 'समूह सूची लोड नहीं हो सकी',
    getLocationFailed: 'स्थान प्राप्त करने में विफल',
    translationError: 'अनुवाद त्रुटि',
    webrtcNetworkRestricted: 'नेटवर्क प्रतिबंध कॉल स्थापित करने से रोकते हैं। मोबाइल डेटा (4G/5G) पर स्विच करें और पुनः प्रयास करें',
    mediaPermissionDenied: 'माइक्रोफ़ोन/कैमरा अनुमति अस्वीकृत। कृपया पहुंच की अनुमति दें और पुनः प्रयास करें',
    
    // Success messages
    friendRequestSent: 'मित्र अनुरोध भेजा गया',
    groupCreated: 'समूह सफलतापूर्वक बनाया गया',
    callInviteSent: '{} मित्रों को {} कॉल में आमंत्रित किया',
    
    // Dialog content
    switchLanguage: 'भाषा बदलें',
    switchLanguageConfirm: 'क्या आप वाकई {} में बदलना चाहते हैं?',
    uiWillShow: '• UI इस भाषा में दिखाया जाएगा',
    uiWillShowEnglish: '• UI अंग्रेजी में दिखाया जाएगा',
    onlyChatTranslation: '• केवल चैट संदेश अनुवाद का समर्थन करता है',
    applying: 'लागू कर रहे हैं...',
    
    // Language Picker
    languageSearchPlaceholder: '搜索/Search/検索/ค้นหา/Cari/Tìm kiếm',
    chatTranslationOnly: '(चैट अनुवाद)',
    chatTranslationNote: '• <strong>चैट अनुवाद</strong>: বাংলা, اردو, Türkçe, Tiếng Việt चैट अनुवाद का समर्थन करते हैं, UI अंग्रेजी में है',
    fullUiSupport: 'पूर्ण UI अनुवाद समर्थन वाली भाषाएं',
    fullUiSupportLanguages: '简体中文、English、ไทย、日本語、Bahasa Indonesia、Español、Français、العربية、हिन्दी、Deutsch、Русский、Português',
    
    // Login page
    appDescription: 'बहुभाषी तत्काल संचार प्रणाली',
    loginWithLine: 'LINE के साथ साइन इन करें',
    chatWithWorldFriends: 'दुनिया भर के मित्रों के साथ चैट करने के लिए अपने LINE खाते से साइन इन करें',
    
    // Validation messages
    enterUsername: 'कृपया खोज के लिए उपयोगकर्ता नाम दर्ज करें',
    enterGroupName: 'कृपया समूह का नाम दर्ज करें',
    selectOneFriend: 'कृपया कम से कम एक मित्र का चयन करें',
    groupNeedAtLeastThreePeople: 'समूह के लिए कम से कम 3 लोगों (आप सहित) की आवश्यकता है। कृपया कम से कम 2 और मित्रों का चयन करें',
    
    // Development
    inDevelopment: 'विकास में...',
    
    // New Profile Menu Items
    myServices: 'मेरी सेवाएं',
    myFavorites: 'मेरे पसंदीदा',
    myDiscovery: 'मेरी खोज',
    ordersAndPoints: 'ऑर्डर और अंक',
    emoticons: 'इमोटिकॉन्स',
    personalProfile: 'व्यक्तिगत प्रोफ़ाइल',
    accountSecurity: 'खाता सुरक्षा',
    friendPermissions: 'मित्र जोड़ें',
    userAgreement: 'उपयोगकर्ता समझौता',
    privacyPolicy: 'गोपनीयता नीति',
    
    // Account types
    personalAccount: 'व्यक्तिगत खाता',
    accountId: 'खाता आईडी',
    personal: 'व्यक्तिगत',
    creator: 'रचनाकार',
    enterprise: 'उद्यम',
    noOtherAccounts: 'कोई अन्य खाता नहीं',
    
    // New menu items
    services: 'सेवाएं',
    stickers: 'स्टिकर',
    
    // Commerce
    orders: 'ऑर्डर',
    cart: 'कार्ट',
    points: 'अंक',
    wallet: 'वॉलेट',
    myOrders: 'मेरे ऑर्डर',
    myCart: 'मेरा कार्ट',
    myPoints: 'मेरे अंक',
    myWallet: 'मेरा वॉलेट',
    noOrders: 'कोई ऑर्डर नहीं',
    noCartItems: 'कार्ट खाली है',
    totalPoints: 'कुल अंक',
    balance: 'बैलेंस',
    availableBalance: 'उपलब्ध बैलेंस',
    emptyState: 'कोई डेटा नहीं',
    
    // Friend requests
    friendRequests: 'मित्र अनुरोध',
    wantsToBeYourFriend: 'आपका मित्र बनना चाहता है',
    accept: 'स्वीकार',
    decline: 'अस्वीकार',
    friendRequestAccepted: 'मित्र अनुरोध स्वीकार किया गया',
    friendRequestDeclined: 'मित्र अनुरोध अस्वीकार किया गया',
    failedToAcceptFriend: 'मित्र अनुरोध स्वीकार करने में विफल',
    failedToDeclineFriend: 'मित्र अनुरोध अस्वीकार करने में विफल',
    alreadyFriends: 'पहले से ही मित्र हैं',
    friendRequestAlreadySent: 'मित्र अनुरोध पहले से भेजा गया है',
    cannotAddYourself: 'आप अपने आप को मित्र नहीं बना सकते',
    
    // Membership Cards
    myMembershipCards: 'मेरे सदस्यता कार्ड',
    membershipTierRegular: 'नियमित सदस्य',
    membershipTierSilver: 'रजत सदस्य',
    membershipTierGold: 'स्वर्ण सदस्य',
    membershipTierPlatinum: 'प्लैटिनम सदस्य',
    currentPoints: 'वर्तमान अंक',
    pointsSuffix: 'अंक',
    
    // Account Types
    lineAccount: 'LINE खाता',
    phoneAccount: 'फोन खाता',
    guestAccount: 'अतिथि खाता',
    
    // PWA Installation
    installSuccess: 'स्थापना सफल!',
    appInstalledSuccessfully: 'Trustalk आपकी होम स्क्रीन पर सफलतापूर्वक जोड़ा गया है',
    iosInstallGuide: 'iOS स्थापना गाइड',
    iosInstallInstructions: 'कृपया ब्राउज़र के निचले भाग में शेयर बटन पर टैप करें, फिर \'होम स्क्रीन में जोड़ें\' चुनें',
    manualInstall: 'मैनुअल स्थापना',
    manualInstallInstructions: 'कृपया ब्राउज़र मेनू में \'होम स्क्रीन में जोड़ें\' या \'ऐप इंस्टॉल करें\' चुनें',
    addToHomeScreen: 'होम स्क्रीन में जोड़ें',
    installLikeApp: 'एक टैप में इंस्टॉल करें, ऐप की तरह उपयोग करें',
    
    // Friend Request Toasts
    friendRequestAcceptedToast: 'मित्र अनुरोध स्वीकृत',
    friendAddedSuccessfully: 'आपने सफलतापूर्वक एक नया मित्र जोड़ा है',
    operationFailed: 'ऑपरेशन विफल',
    acceptFriendRequestFailed: 'मित्र अनुरोध स्वीकार करने में विफल, कृपया पुनः प्रयास करें',
    friendRequestDeclinedToast: 'मित्र अनुरोध अस्वीकृत',
    friendRequestDeclinedMessage: 'मित्र अनुरोध अस्वीकार कर दिया गया है',
    declineFriendRequestFailed: 'मित्र अनुरोध अस्वीकार करने में विफल, कृपया पुनः प्रयास करें',
    pendingFriendRequests: 'लंबित मित्र अनुरोध',
    noFriendRequests: 'कोई मित्र अनुरोध नहीं',
    
    // New page content
    comingSoon: 'Coming Soon',
    noFavorites: 'No Favorites',
    noEmoticons: 'No Emoticons',
    username: 'Username',
    firstName: 'First Name',
    lastName: 'Last Name',
    nickname: 'Nickname',
    phoneNumber: 'Phone Number',
    languagePreference: 'Language Preference',
    notSet: 'Not Set',
    memberSince: 'Member Since',
    editProfile: 'Edit Profile',
    saveChanges: 'Save Changes',
    editing: 'Editing',
    usernameTaken: 'Username is already taken',
    profileUpdateSuccess: 'Profile updated successfully',
    profileUpdateFailed: 'Failed to update profile',
    selectLanguage: 'Select Language',
    upgradeForSecurity: 'Upgrade your account for better security',
    accountType: 'Account Type',
    linkedAccounts: 'Linked Accounts',
    lineAndPhone: 'LINE and Phone',
    lineOnly: 'LINE Only',
    phoneOnly: 'Phone Only',
    none: 'None',
    changePassword: 'Change Password',
    twoFactorAuth: 'Two-Factor Authentication',
    notEnabled: 'Not Enabled',
    securityTips: 'Security Tips',
    securityTip1: 'Change your password regularly and use strong passwords',
    securityTip2: 'Do not share your account information with others',
    securityTip3: 'Enable two-factor authentication for enhanced security',
    usernameRequired: 'उपयोगकर्ता नाम आवश्यक है',
    firstNameRequired: 'पहला नाम आवश्यक है',
    
    supportsMultilingualTranslation: 'बहुभाषी अनुवाद का समर्थन करता है',
    supportedLanguages: 'हिन्दी • English • 中文 • ไทย • 日本語 • Bahasa Indonesia • Español • Français • العربية • Deutsch • Русский • Português',
    guestLogin: 'अभी आज़माएं',
    sixDigitSignup: '6 अंकों की ID',
    usernameSignup: 'उपयोगकर्ता नाम',
    lineLogin: 'LINE लॉगिन',
    connectWithoutBarriers: 'बिना बाधाओं के संचार',

    // Invite System
    invite_friends: 'मित्रों को आमंत्रित करें',
    invite_to_group: 'समूह में आमंत्रित करें',
    invite_to_chat: 'चैट में आमंत्रित करें',
    sms: 'SMS',
    email: 'ईमेल',
    invite_to_yulink: 'मैं आपको Trustalk चैट में शामिल होने के लिए आमंत्रित कर रहा हूं',
    copied: 'कॉपी किया गया',
    invite_link_copied: 'आमंत्रण लिंक कॉपी किया गया',
    generating_link: 'लिंक बना रहे हैं...',
    show_qr_code: 'QR कोड दिखाएं',
    scan_to_join: 'शामिल होने के लिए स्कैन करें',
    share_link: 'लिंक साझा करें',
    share_to_platform: 'प्लेटफॉर्म पर साझा करें',
    invite_tips_title: 'आमंत्रण सुझाव',
    invite_tip_1: 'आमंत्रण लिंक 7 दिनों के लिए मान्य हैं, समाप्ति के बाद पुनः जेनरेट करें',
    invite_tip_2: 'प्राप्तकर्ता बिना पंजीकरण के सीधे शामिल हो सकते हैं',
    invite_tip_3: 'बहुभाषी स्वचालित अनुवाद और वॉयस/वीडियो कॉल का समर्थन करता है',
    invite_message: 'मेरे {roomName} में {appName} पर शामिल हों!',
    failed_to_generate_invite_link: 'आमंत्रण लिंक जेनरेट करने में विफल',
    invite_accepted_successfully: 'आमंत्रण सफलतापूर्वक स्वीकार किया गया',
    failed_to_accept_invite: 'आमंत्रण स्वीकार करने में विफल',
    invite_link_expired: 'आमंत्रण लिंक समाप्त हो गया है',
    invalid_invite_link: 'अमान्य आमंत्रण लिंक',
    invite_error: 'आमंत्रण त्रुटि',
    back_to_home: 'होम पर वापस जाएं',
    multilingual_instant_communication: 'बहुभाषी तत्काल संचार',
    youre_invited_to_join: 'आपको शामिल होने के लिए आमंत्रित किया गया है',
    click_accept_to_join_conversation: 'बातचीत में शामिल होने के लिए स्वीकार करें पर क्लिक करें',
    auto_translation: 'स्वचालित अनुवाद',
    cross_language_communication: 'भाषा बाधाओं के बिना संचार',
    voice_video_calls: 'वॉयस और वीडियो कॉल',
    high_quality_communication: 'उच्च गुणवत्ता रीयल-टाइम संचार',
    group_chat: 'समूह चैट',
    connect_with_friends: 'मित्रों के साथ जुड़े रहें',
    accepting: 'स्वीकार कर रहे हैं...',
    processing_invite: 'आमंत्रण संसाधित कर रहे हैं...',
    accept_invitation: 'आमंत्रण स्वीकार करें',
    by_accepting_you_agree: 'स्वीकार करके, आप सहमत होते हैं',
    terms_and_privacy: 'सेवा की शर्तें और गोपनीयता नीति',
    
    // Profile Edit
    pleaseSelectImage: 'कृपया एक छवि चुनें',
    avatarUpdated: 'अवतार अपडेट किया गया',
    uploadFailed: 'अपलोड विफल',
    profileUpdated: 'प्रोफाइल अपडेट किया गया',
    uploading: 'अपलोड हो रहा है...',
    tapToChangeAvatar: 'अवतार बदलने के लिए टैप करें',
    enterFirstName: 'कृपया पहला नाम दर्ज करें',
    enterLastName: 'कृपया अंतिम नाम दर्ज करें',
    profileEditNote: 'संशोधित जानकारी सभी मित्रों को दिखाई देगी',
    accountIdCopied: 'खाता आईडी कॉपी किया गया',
    copyFailed: 'कॉपी विफल',
    
    // Service Center
    serviceCenter: 'सेवा केंद्र',
    accountAndIdentity: 'खाता और पहचान',
    myWorkAccounts: 'मेरे कार्य खाते',
    manageEnterpriseIdentities: 'उद्यम पहचान देखें/प्रबंधित करें',
    myCreatorAccounts: 'मेरे निर्माता खाते',
    manageContentCreatorIdentities: 'निर्माता पहचान देखें/प्रबंधित करें',
    applyEnterpriseAccount: 'उद्यम खाते के लिए आवेदन करें',
    createEnterpriseWizard: 'उद्यम निर्माण विज़ार्ड में प्रवेश करें',
    oaContentUpload: 'सामग्री/उत्पाद अपलोड',
    oaProductUpload: 'उत्पाद अपलोड',
    oaContentManagement: 'सामग्री/उत्पाद प्रबंधन',
    oaProductManagement: 'उत्पाद प्रबंधन',
    oaPublishContent: 'सामग्री प्रकाशित करें',
    oaUploadProduct: 'उत्पाद अपलोड करें',
    oaArticle: 'लेख',
    oaVideo: 'वीडियो',
    oaProduct: 'उत्पाद',
    oaTitle: 'शीर्षक',
    oaTitlePlaceholder: 'शीर्षक दर्ज करें',
    oaDescription: 'विवरण',
    oaDescriptionPlaceholder: 'विवरण दर्ज करें',
    oaSelectVideo: 'वीडियो चुनें',
    oaVideoCover: 'वीडियो कवर (वैकल्पिक)',
    oaUploadImages: 'छवियाँ अपलोड करें',
    oaMaxImages: 'अधिकतम 9 छवियाँ',
    oaProductCover: 'उत्पाद कवर',
    oaPrice: 'कीमत',
    oaPricePlaceholder: 'कीमत दर्ज करें',
    oaPublish: 'प्रकाशित करें',
    oaPublishing: 'प्रकाशित हो रहा है...',
    oaNoContent: 'कोई सामग्री नहीं, "सामग्री प्रकाशित करें" पर क्लिक करें',
    oaStartPublish: 'प्रकाशन शुरू करें',
    oaNoProducts: 'कोई उत्पाद नहीं, "उत्पाद अपलोड करें" पर क्लिक करें',
    oaUploadProductFirst: 'कोई उत्पाद नहीं, कृपया पहले उत्पाद अपलोड करें',
    oaViews: 'देखे गए',
    oaLikes: 'पसंद',
    oaBindProduct: 'उत्पाद प्रचार बाइंड करें',
    oaBoundProduct: 'बाइंड किया गया उत्पाद',
    oaSelectProductToBind: 'इस सामग्री में प्रचार के लिए उत्पाद चुनें',
    oaUnbind: 'अनबाइंड',
    oaClose: 'बंद करें',
    oaContentList: 'सामग्री सूची',
    oaProductList: 'उत्पाद सूची',
    oaPublishSuccess: 'सफलतापूर्वक प्रकाशित',
    oaPublishFailed: 'प्रकाशित करने में विफल',
    oaDeleteSuccess: 'सफलतापूर्वक हटाया गया',
    oaDeleteFailed: 'हटाने में विफल',
    oaBindSuccess: 'सफलतापूर्वक बाइंड किया',
    oaBindFailed: 'बाइंड करने में विफल',
    oaStatContent: 'कुल कार्य',
    oaStatFollowers: 'कुल फ़ॉलोअर्स',
    oaStatViews: 'कुल व्यूज',
    oaStatEarnings: 'इस महीने की कमाई',
    oaDrafts: 'ड्राफ्ट',
    oaOnline: 'प्रकाशित',
    oaTrash: 'कचरा',
    oaMoveToBin: 'कचरे में डालें',
    oaRestore: 'पुनर्स्थापित',
    oaPermanentDelete: 'स्थायी रूप से हटाएं',
    oaRestoreSuccess: 'पुनर्स्थापित किया गया',
    oaAll: 'सभी',
    close: 'बंद करें',
    followNow: 'फ़ॉलो करें',
    following: 'फ़ॉलो कर रहे हैं',
    saySmething: 'कुछ कहें...',
    noImage: 'कोई छवि नहीं',
    contentNotFound: 'सामग्री नहीं मिली या हटा दी गई',
    viewProduct: 'देखें',
    tagsLabel: 'टैग',
    invalidDate: 'अमान्य तारीख',
    shareSuccess: 'साझा किया गया',
    shareFailed: 'साझा करने में विफल',
    linkCopied: 'लिंक कॉपी किया गया',
    copiedToClipboard: 'क्लिपबोर्ड पर कॉपी किया गया',
    lineOaInviteTitle: 'यह मेरा बहुभाषी LINE खाता है',
    lineOaInviteDesc: 'बहुभाषी संचार शुरू करने के लिए मुझे फॉलो करें!',
    lineOaFollowMe: 'LINE पर मुझे फॉलो करें',
    lineOaLoginToConnect: 'बहुभाषी चैट शुरू करने के लिए लॉगिन करें'
  },
  de: {
    chats: 'Chats',
    friends: 'Freunde',
    groups: 'Gruppen',
    profile: 'Profil',
    discover: 'Entdecken',
    shop: 'Einkaufen',
    worldInbox: 'Welt-Posteingang',
    add: 'Hinzufügen',
    cancel: 'Abbrechen',
    create: 'Erstellen',
    send: 'Senden',
    back: 'Zurück',
    settings: 'Einstellungen',
    logout: 'Abmelden',
    inviteFriends: 'Freunde einladen',
    scanQR: 'QR scannen',
    friendsList: 'Freundesliste',
    addFriend: 'Freund hinzufügen',
    friendId: 'Freund-ID',
    addFriendPlaceholder: 'Freund-ID oder Telefon eingeben...',
    newFriendRequest: 'Neue Freundschaftsanfrage',
    acceptFriendRequest: 'Akzeptieren',
    rejectFriendRequest: 'Ablehnen',
    groupsList: 'Gruppenliste',
    createGroup: 'Gruppe erstellen',
    groupName: 'Gruppenname',
    groupNamePlaceholder: 'Gruppenname eingeben...',
    selectMembers: 'Mitglieder auswählen',
    selectedMembers: 'Ausgewählte Mitglieder',
    selectAll: 'Alle auswählen',
    deselectAll: 'Alle abwählen',
    searchFriends: 'Freunde suchen',
    noSearchResults: 'Keine passenden Freunde gefunden',
    typeMessage: 'Nachricht eingeben...',
    online: 'Online',
    offline: 'Offline',
    translating: 'Übersetzen...',
    aiAssistantName: 'Mein Assistent',
    myQrCode: 'Mein QR-Code',
    languageSettings: 'Spracheinstellungen',
    notifications: 'Benachrichtigungen',
    otherSettings: 'Weitere Einstellungen',
    myLanguage: 'Meine Sprache',
    multilingualCard: 'Mein QR-Code',
    myShareLink: 'Mein Freigabelink',
    viewCard: 'Karte anzeigen',
    qrCodePlaceholder: 'QR-Code (Zum Hinzufügen scannen)',
    scanQRToViewCard: 'QR-Code scannen um mehrsprachige Karte anzuzeigen',
    scanQRToAddFriend: 'Scannen Sie den QR-Code eines Freundes um ihn hinzuzufügen',
    cameraPermissionDenied: 'Kameraberechtigung verweigert. Bitte erlauben Sie den Kamerazugriff in den Einstellungen',
    externalAccounts: 'Externe Kontenverwaltung',
    connected: 'Verbunden',
    notConfigured: 'Nicht Konfiguriert',
    lineNotConfigured: 'LINE Nicht Konfiguriert',
    systemSettings: 'Systemeinstellungen',
    soundEffects: 'Soundeffekte',
    searchChats: 'Chats Suchen',
    searchContactsOrGroups: 'Kontakte oder Gruppen suchen...',
    contacts: 'Kontakte',
    group: 'Gruppe',
    noResultsFound: 'Keine Ergebnisse gefunden',
    tryDifferentKeyword: 'Versuchen Sie ein anderes Stichwort',
    searchContactsAndGroups: 'Kontakte und Gruppen Suchen',
    enterNameToSearch: 'Geben Sie einen Namen oder Gruppennamen ein',
    
    // Guest User
    guestAccountNotice: 'Guest account notice',
    upgradeToInviteFriends: 'Upgrade to invite friends',
    upgradeAccount: 'Upgrade account',
    guestChatRestricted: 'Guest Account Limitation',
    guestUpgradeToChatWithFriends: 'Guest users can only chat with AI Assistant. Please upgrade to chat with friends.',
    upgradeNow: 'Upgrade Now',
    loading: 'Laden...',
    error: 'Fehler',
    success: 'Erfolg',
    saved: 'Gespeichert',
    saveFailed: 'Speichern fehlgeschlagen',
    justNow: 'Gerade',
    minutesAgo: 'vor Minuten',
    hoursAgo: 'vor Stunden',
    yesterday: 'Gestern',
    daysAgo: 'vor Tagen',
    noMessages: 'Keine Nachrichten',
    mePrefix: 'Ich: ',
    unknownUser: 'Unbekannter Benutzer',
    groupLabel: '(Gruppe)',
    emptyChatsHint: 'Noch keine Chats, füge Freunde hinzu oder erstelle Gruppen um zu beginnen!',
    chatInfo: 'Chat-Info',
    searchChatHistory: 'Chat-Verlauf durchsuchen',
    clearChatHistory: 'Chat-Verlauf löschen',
    muteNotifications: 'Benachrichtigungen stumm schalten',
    pinChat: 'Chat anheften',
    reminders: 'Erinnerungen',
    setChatBackground: 'Chat-Hintergrund festlegen',
    report: 'Melden',
    selectFunction: 'Funktion auswählen',
    gallery: 'Galerie',
    camera: 'Kamera',
    voiceCall: 'Sprachanruf',
    location: 'Standort',
    file: 'Datei',
    favorites: 'Favoriten',
    businessCard: 'Visitenkarte',
    videoCall: 'Videoanruf',
    voiceCallNeedSDK: 'Sprachanruf-Funktion erfordert WebRTC/Drittanbieter-SDK-Integration',
    videoCallNeedSDK: 'Videoanruf-Funktion erfordert WebRTC/Drittanbieter-SDK-Integration',
    favoritesNotImplemented: 'Favoriten-Funktion ist noch nicht implementiert',
    locationPermissionError: 'Aktueller Standort kann nicht abgerufen werden, bitte Standortberechtigungen überprüfen',
    locationNotSupported: 'Standortdienste werden auf diesem Gerät nicht unterstützt',
    viewLocation: 'Standort anzeigen',
    clickToOpenMaps: 'Klicken Sie, um Google Maps zu öffnen',
    businessCardPrefix: 'Visitenkarte',
    emailLabel: 'E-Mail',
    phoneLabel: 'Telefon',
    phoneNotSet: 'Nicht festgelegt',
    selectContact: 'Kontakt auswählen',
    searchContacts: 'Kontakte suchen',
    myCard: 'Meine Karte',
    inviteToCall: 'Zum Anruf einladen',
    noFriends: 'Keine Freunde',
    invite: 'Einladen',
    
    // New fields
    confirm: 'Bestätigen',
    delete: 'Löschen',
    save: 'Speichern',
    saving: 'Saving...',
    copy: 'Kopieren',
    search: 'Suchen',
    share: 'Teilen',
    searchUsers: 'Benutzer suchen',
    searchPlaceholder: 'Benutzername, Name oder E-Mail suchen...',
    searchResults: 'Suchergebnisse',
    searching: 'Suche...',
    noUsersFound: 'Keine Benutzer gefunden',
    addByUsername: 'Freund per Benutzername hinzufügen',
    channelWhatsapp: 'WhatsApp',
    channelWechat: 'WeChat',
    channelLine: 'LINE',
    channelMessenger: 'Messenger',
    channelTelegram: 'Telegram',
    channelInstagram: 'Instagram',
    channelViber: 'Viber',
    emptyChatRecord: 'Noch keine Chat-Historie, füge Freunde hinzu oder tritt Gruppen bei!',
    noGroupsHint: 'Noch keine Gruppen, erstelle eine Gruppe!',
    noFriendsHint: 'Noch keine Freunde, füge einige Freunde hinzu!',
    loadingMessages: 'Nachrichten werden geladen...',
    loadMore: 'Weitere Nachrichten laden',
    startConversation: 'Unterhaltung mit {} beginnen',
    welcomeToGroup: 'Willkommen in {}',
    
    // Error messages
    loginFailed: 'Anmeldung fehlgeschlagen, bitte versuche es erneut',
    loginError: 'Anmeldefehler',
    lineLoginError: 'Fehler bei der LINE-Anmeldung',
    authFailed: 'Authentifizierung fehlgeschlagen, bitte versuche es erneut',
    loginParamsMissing: 'Anmeldeparameter fehlen',
    redirectFailed: 'Weiterleitung fehlgeschlagen, bitte versuche es erneut',
    addFriendFailed: 'Freund hinzufügen fehlgeschlagen',
    createGroupFailed: 'Gruppe erstellen fehlgeschlagen',
    loadChatsFailed: 'Chat-Liste konnte nicht geladen werden',
    loadFriendsFailed: 'Freundesliste konnte nicht geladen werden',
    loadGroupsFailed: 'Gruppenliste konnte nicht geladen werden',
    getLocationFailed: 'Standort konnte nicht abgerufen werden',
    translationError: 'Übersetzungsfehler',
    webrtcNetworkRestricted: 'Netzwerkbeschränkungen verhindern die Anrufherstellung. Wechseln Sie zu mobilen Daten (4G/5G) und versuchen Sie es erneut',
    mediaPermissionDenied: 'Mikrofon/Kamera-Berechtigung verweigert. Bitte gewähren Sie Zugriff und versuchen Sie es erneut',
    
    // Success messages
    friendRequestSent: 'Freundschaftsanfrage gesendet',
    groupCreated: 'Gruppe erfolgreich erstellt',
    callInviteSent: '{} Freunde zu {} Anruf eingeladen',
    
    // Dialog content
    switchLanguage: 'Sprache wechseln',
    switchLanguageConfirm: 'Bist du sicher, dass du zu {} wechseln möchtest?',
    uiWillShow: '• UI wird in dieser Sprache angezeigt',
    uiWillShowEnglish: '• UI wird auf Englisch angezeigt',
    onlyChatTranslation: '• Unterstützt nur Chat-Nachrichtenübersetzung',
    applying: 'Anwenden...',
    
    // Language Picker
    languageSearchPlaceholder: '搜索/Search/検索/ค้นหา/Cari/Tìm kiếm',
    chatTranslationOnly: '(Chat-Übersetzung)',
    chatTranslationNote: '• <strong>Chat-Übersetzung</strong>: বাংলা, اردو, Türkçe, Tiếng Việt unterstützen Chat-Übersetzung mit englischer Benutzeroberfläche',
    fullUiSupport: 'Sprachen mit vollständiger UI-Übersetzungsunterstützung',
    fullUiSupportLanguages: '简体中文、English、ไทย、日本語、Bahasa Indonesia、Español、Français、العربية、हिन्दी、Deutsch、Русский、Português',
    
    // Login page
    appDescription: 'Mehrsprachiges sofortiges Kommunikationssystem',
    loginWithLine: 'Mit LINE anmelden',
    chatWithWorldFriends: 'Melde dich mit deinem LINE-Konto an, um mit Freunden auf der ganzen Welt zu chatten',
    
    // Validation messages
    enterUsername: 'Bitte gib einen Benutzernamen für die Suche ein',
    enterGroupName: 'Bitte gib einen Gruppennamen ein',
    selectOneFriend: 'Bitte wähle mindestens einen Freund aus',
    groupNeedAtLeastThreePeople: 'Gruppen benötigen mindestens 3 Personen (einschließlich dir). Bitte wähle mindestens 2 weitere Freunde aus',
    
    // Development
    inDevelopment: 'In Entwicklung...',
    
    // New Profile Menu Items
    myServices: 'Meine Dienste',
    myFavorites: 'Meine Favoriten',
    myDiscovery: 'Meine Entdeckungen',
    ordersAndPoints: 'Bestellungen & Punkte',
    emoticons: 'Emoticons',
    personalProfile: 'Persönliches Profil',
    accountSecurity: 'Kontosicherheit',
    friendPermissions: 'Freunde hinzufügen',
    userAgreement: 'Nutzungsvereinbarung',
    privacyPolicy: 'Datenschutzrichtlinie',
    
    // Account types
    personalAccount: 'Persönliches Konto',
    accountId: 'Konto-ID',
    personal: 'Persönlich',
    creator: 'Ersteller',
    enterprise: 'Unternehmen',
    noOtherAccounts: 'Keine anderen Konten',
    
    // New menu items
    services: 'Dienste',
    stickers: 'Aufkleber',
    
    // Commerce
    orders: 'Bestellungen',
    cart: 'Warenkorb',
    points: 'Punkte',
    wallet: 'Geldbörse',
    myOrders: 'Meine Bestellungen',
    myCart: 'Mein Warenkorb',
    myPoints: 'Meine Punkte',
    myWallet: 'Meine Geldbörse',
    noOrders: 'Keine Bestellungen',
    noCartItems: 'Warenkorb leer',
    totalPoints: 'Gesamtpunkte',
    balance: 'Guthaben',
    availableBalance: 'Verfügbares Guthaben',
    emptyState: 'Keine Daten',
    
    // Friend requests
    friendRequests: 'Freundschaftsanfragen',
    wantsToBeYourFriend: 'möchte dein Freund sein',
    accept: 'Akzeptieren',
    decline: 'Ablehnen',
    friendRequestAccepted: 'Freundschaftsanfrage akzeptiert',
    friendRequestDeclined: 'Freundschaftsanfrage abgelehnt',
    failedToAcceptFriend: 'Freundschaftsanfrage konnte nicht akzeptiert werden',
    failedToDeclineFriend: 'Freundschaftsanfrage konnte nicht abgelehnt werden',
    alreadyFriends: 'Bereits befreundet',
    friendRequestAlreadySent: 'Freundschaftsanfrage bereits gesendet',
    cannotAddYourself: 'Sie können sich nicht selbst als Freund hinzufügen',
    
    // Membership Cards
    myMembershipCards: 'Meine Mitgliedskarten',
    membershipTierRegular: 'Reguläres Mitglied',
    membershipTierSilver: 'Silber-Mitglied',
    membershipTierGold: 'Gold-Mitglied',
    membershipTierPlatinum: 'Platin-Mitglied',
    currentPoints: 'Aktuelle Punkte',
    pointsSuffix: 'Punkte',
    
    // Account Types
    lineAccount: 'LINE-Konto',
    phoneAccount: 'Telefon-Konto',
    guestAccount: 'Gast-Konto',
    
    // PWA Installation
    installSuccess: 'Installation erfolgreich!',
    appInstalledSuccessfully: 'Trustalk wurde erfolgreich zu Ihrem Startbildschirm hinzugefügt',
    iosInstallGuide: 'iOS-Installationsanleitung',
    iosInstallInstructions: 'Bitte tippen Sie auf die Teilen-Schaltfläche unten im Browser und wählen Sie dann \'Zum Startbildschirm hinzufügen\'',
    manualInstall: 'Manuelle Installation',
    manualInstallInstructions: 'Bitte wählen Sie \'Zum Startbildschirm hinzufügen\' oder \'App installieren\' im Browsermenü',
    addToHomeScreen: 'Zum Startbildschirm hinzufügen',
    installLikeApp: 'Mit einem Tippen installieren, wie eine App verwenden',
    
    // Friend Request Toasts
    friendRequestAcceptedToast: 'Freundschaftsanfrage akzeptiert',
    friendAddedSuccessfully: 'Sie haben erfolgreich einen neuen Freund hinzugefügt',
    operationFailed: 'Operation fehlgeschlagen',
    acceptFriendRequestFailed: 'Freundschaftsanfrage konnte nicht akzeptiert werden, bitte versuchen Sie es erneut',
    friendRequestDeclinedToast: 'Freundschaftsanfrage abgelehnt',
    friendRequestDeclinedMessage: 'Die Freundschaftsanfrage wurde abgelehnt',
    declineFriendRequestFailed: 'Freundschaftsanfrage konnte nicht abgelehnt werden, bitte versuchen Sie es erneut',
    pendingFriendRequests: 'Ausstehende Freundschaftsanfragen',
    noFriendRequests: 'Keine Freundschaftsanfragen',
    
    // New page content
    comingSoon: 'Coming Soon',
    noFavorites: 'No Favorites',
    noEmoticons: 'No Emoticons',
    username: 'Username',
    firstName: 'First Name',
    lastName: 'Last Name',
    nickname: 'Nickname',
    phoneNumber: 'Phone Number',
    languagePreference: 'Language Preference',
    notSet: 'Not Set',
    memberSince: 'Member Since',
    editProfile: 'Edit Profile',
    saveChanges: 'Save Changes',
    editing: 'Editing',
    usernameTaken: 'Username is already taken',
    profileUpdateSuccess: 'Profile updated successfully',
    profileUpdateFailed: 'Failed to update profile',
    selectLanguage: 'Select Language',
    upgradeForSecurity: 'Upgrade your account for better security',
    accountType: 'Account Type',
    linkedAccounts: 'Linked Accounts',
    lineAndPhone: 'LINE and Phone',
    lineOnly: 'LINE Only',
    phoneOnly: 'Phone Only',
    none: 'None',
    changePassword: 'Change Password',
    twoFactorAuth: 'Two-Factor Authentication',
    notEnabled: 'Not Enabled',
    securityTips: 'Security Tips',
    securityTip1: 'Change your password regularly and use strong passwords',
    securityTip2: 'Do not share your account information with others',
    securityTip3: 'Enable two-factor authentication for enhanced security',
    usernameRequired: 'Benutzername ist erforderlich',
    firstNameRequired: 'Vorname ist erforderlich',
    
    supportsMultilingualTranslation: 'Unterstützt mehrsprachige Übersetzung',
    supportedLanguages: 'Deutsch • English • 中文 • ไทย • 日本語 • Bahasa Indonesia • Español • Français • العربية • हिन्दी • Русский • Português',
    guestLogin: 'Jetzt ausprobieren',
    sixDigitSignup: '6-stellige ID',
    usernameSignup: 'Benutzername',
    lineLogin: 'LINE-Anmeldung',
    connectWithoutBarriers: 'Kommunikation ohne Barrieren',

    // Invite System
    invite_friends: 'Freunde einladen',
    invite_to_group: 'Zur Gruppe einladen',
    invite_to_chat: 'Zum Chat einladen',
    sms: 'SMS',
    email: 'E-Mail',
    invite_to_yulink: 'Ich lade dich ein, dem Trustalk-Chat beizutreten',
    copied: 'Kopiert',
    invite_link_copied: 'Einladungslink kopiert',
    generating_link: 'Link wird generiert...',
    show_qr_code: 'QR-Code anzeigen',
    scan_to_join: 'Zum Beitreten scannen',
    share_link: 'Link teilen',
    share_to_platform: 'Auf Plattform teilen',
    invite_tips_title: 'Einladungstipps',
    invite_tip_1: 'Einladungslinks sind 7 Tage gültig, nach Ablauf neu generieren',
    invite_tip_2: 'Empfänger können direkt ohne Registrierung beitreten',
    invite_tip_3: 'Unterstützt mehrsprachige automatische Übersetzung und Sprach-/Videoanrufe',
    invite_message: 'Tritt meinem {roomName} auf {appName} bei!',
    failed_to_generate_invite_link: 'Einladungslink konnte nicht generiert werden',
    invite_accepted_successfully: 'Einladung erfolgreich angenommen',
    failed_to_accept_invite: 'Einladung konnte nicht angenommen werden',
    invite_link_expired: 'Einladungslink ist abgelaufen',
    invalid_invite_link: 'Ungültiger Einladungslink',
    invite_error: 'Einladungsfehler',
    back_to_home: 'Zurück zur Startseite',
    multilingual_instant_communication: 'Mehrsprachige Sofortkommunikation',
    youre_invited_to_join: 'Sie sind eingeladen beizutreten',
    click_accept_to_join_conversation: 'Klicken Sie auf Akzeptieren, um der Konversation beizutreten',
    auto_translation: 'Automatische Übersetzung',
    cross_language_communication: 'Kommunikation ohne Sprachbarrieren',
    voice_video_calls: 'Sprach- & Videoanrufe',
    high_quality_communication: 'Hochwertige Echtzeitkommunikation',
    group_chat: 'Gruppen-Chat',
    connect_with_friends: 'Bleiben Sie mit Freunden verbunden',
    accepting: 'Wird akzeptiert...',
    processing_invite: 'Einladung wird verarbeitet...',
    accept_invitation: 'Einladung annehmen',
    by_accepting_you_agree: 'Durch Akzeptieren stimmen Sie zu',
    terms_and_privacy: 'Nutzungsbedingungen und Datenschutzrichtlinie',
    
    // Profile Edit
    pleaseSelectImage: 'Bitte wählen Sie ein Bild aus',
    avatarUpdated: 'Avatar aktualisiert',
    uploadFailed: 'Upload fehlgeschlagen',
    profileUpdated: 'Profil aktualisiert',
    uploading: 'Hochladen...',
    tapToChangeAvatar: 'Tippen Sie, um den Avatar zu ändern',
    enterFirstName: 'Bitte geben Sie den Vornamen ein',
    enterLastName: 'Bitte geben Sie den Nachnamen ein',
    profileEditNote: 'Geänderte Informationen werden allen Freunden angezeigt',
    accountIdCopied: 'Konto-ID kopiert',
    copyFailed: 'Kopieren fehlgeschlagen',
    
    // Service Center
    serviceCenter: 'Service-Center',
    accountAndIdentity: 'Konto & Identität',
    myWorkAccounts: 'Meine Arbeitskonten',
    manageEnterpriseIdentities: 'Unternehmensidentitäten anzeigen/verwalten',
    myCreatorAccounts: 'Meine Creator-Konten',
    manageContentCreatorIdentities: 'Creator-Identitäten anzeigen/verwalten',
    applyEnterpriseAccount: 'Unternehmenskonto beantragen',
    createEnterpriseWizard: 'Unternehmens-Erstellungsassistent öffnen',
    oaContentUpload: 'Inhalt/Produkt hochladen',
    oaProductUpload: 'Produkt hochladen',
    oaContentManagement: 'Inhalt/Produkt verwalten',
    oaProductManagement: 'Produktverwaltung',
    oaPublishContent: 'Inhalt veröffentlichen',
    oaUploadProduct: 'Produkt hochladen',
    oaArticle: 'Artikel',
    oaVideo: 'Video',
    oaProduct: 'Produkt',
    oaTitle: 'Titel',
    oaTitlePlaceholder: 'Titel eingeben',
    oaDescription: 'Beschreibung',
    oaDescriptionPlaceholder: 'Beschreibung eingeben',
    oaSelectVideo: 'Video auswählen',
    oaVideoCover: 'Video-Cover (Optional)',
    oaUploadImages: 'Bilder hochladen',
    oaMaxImages: 'Maximal 9 Bilder',
    oaProductCover: 'Produkt-Cover',
    oaPrice: 'Preis',
    oaPricePlaceholder: 'Preis eingeben',
    oaPublish: 'Veröffentlichen',
    oaPublishing: 'Wird veröffentlicht...',
    oaNoContent: 'Kein Inhalt, klicken Sie auf "Inhalt veröffentlichen" um zu starten',
    oaStartPublish: 'Veröffentlichung starten',
    oaNoProducts: 'Keine Produkte, klicken Sie auf "Produkt hochladen" um zu starten',
    oaUploadProductFirst: 'Keine Produkte, bitte laden Sie zuerst ein Produkt hoch',
    oaViews: 'Aufrufe',
    oaLikes: 'Gefällt mir',
    oaBindProduct: 'Produktwerbung verknüpfen',
    oaBoundProduct: 'Verknüpftes Produkt',
    oaSelectProductToBind: 'Wählen Sie ein Produkt für die Werbung in diesem Inhalt',
    oaUnbind: 'Verknüpfung aufheben',
    oaClose: 'Schließen',
    oaContentList: 'Inhaltsliste',
    oaProductList: 'Produktliste',
    oaPublishSuccess: 'Erfolgreich veröffentlicht',
    oaPublishFailed: 'Veröffentlichung fehlgeschlagen',
    oaDeleteSuccess: 'Erfolgreich gelöscht',
    oaDeleteFailed: 'Löschen fehlgeschlagen',
    oaBindSuccess: 'Erfolgreich verknüpft',
    oaBindFailed: 'Verknüpfung fehlgeschlagen',
    oaStatContent: 'Gesamtwerke',
    oaStatFollowers: 'Gesamtfollower',
    oaStatViews: 'Gesamtaufrufe',
    oaStatEarnings: 'Monatseinkommen',
    oaDrafts: 'Entwürfe',
    oaOnline: 'Veröffentlicht',
    oaTrash: 'Papierkorb',
    oaMoveToBin: 'In Papierkorb verschieben',
    oaRestore: 'Wiederherstellen',
    oaPermanentDelete: 'Endgültig löschen',
    oaRestoreSuccess: 'Wiederhergestellt',
    oaAll: 'Alle',
    close: 'Schließen',
    followNow: 'Folgen',
    following: 'Folge ich',
    saySmething: 'Sag etwas...',
    noImage: 'Kein Bild',
    contentNotFound: 'Inhalt nicht gefunden oder gelöscht',
    viewProduct: 'Ansehen',
    tagsLabel: 'Tags',
    invalidDate: 'Ungültiges Datum',
    shareSuccess: 'Erfolgreich geteilt',
    shareFailed: 'Teilen fehlgeschlagen',
    linkCopied: 'Link kopiert',
    copiedToClipboard: 'In Zwischenablage kopiert',
    lineOaInviteTitle: 'Dies ist mein mehrsprachiges LINE-Konto',
    lineOaInviteDesc: 'Folgen Sie mir, um mehrsprachige Kommunikation zu beginnen!',
    lineOaFollowMe: 'Folgen Sie mir auf LINE',
    lineOaLoginToConnect: 'Anmelden, um mehrsprachigen Chat zu starten'
  },
  ru: {
    chats: 'Чаты',
    friends: 'Друзья',
    groups: 'Группы',
    profile: 'Профиль',
    discover: 'Открыть',
    shop: 'Покупки',
    worldInbox: 'Мировая почта',
    add: 'Добавить',
    cancel: 'Отмена',
    create: 'Создать',
    send: 'Отправить',
    back: 'Назад',
    settings: 'Настройки',
    logout: 'Выйти',
    inviteFriends: 'Пригласить друзей',
    scanQR: 'Сканировать QR',
    friendsList: 'Список друзей',
    addFriend: 'Добавить друга',
    friendId: 'ID друга',
    addFriendPlaceholder: 'Введите ID друга или телефон...',
    newFriendRequest: 'Новый запрос дружбы',
    acceptFriendRequest: 'Принять',
    rejectFriendRequest: 'Отклонить',
    groupsList: 'Список групп',
    createGroup: 'Создать группу',
    groupName: 'Название группы',
    groupNamePlaceholder: 'Введите название группы...',
    selectMembers: 'Выбрать участников',
    selectedMembers: 'Выбранные участники',
    selectAll: 'Выбрать всех',
    deselectAll: 'Отменить выбор всех',
    searchFriends: 'Поиск друзей',
    noSearchResults: 'Подходящие друзья не найдены',
    typeMessage: 'Введите сообщение...',
    online: 'В сети',
    offline: 'Не в сети',
    translating: 'Переводим...',
    aiAssistantName: 'Мой Помощник',
    myQrCode: 'Мой QR-код',
    languageSettings: 'Настройки языка',
    notifications: 'Уведомления',
    otherSettings: 'Другие настройки',
    myLanguage: 'Мой язык',
    multilingualCard: 'Мой QR-код',
    myShareLink: 'Моя ссылка для обмена',
    viewCard: 'Просмотр карточки',
    qrCodePlaceholder: 'QR-код (Сканируйте чтобы добавить меня)',
    scanQRToViewCard: 'Сканируйте QR-код чтобы просмотреть многоязычную карточку',
    scanQRToAddFriend: 'Сканируйте QR-код друга чтобы добавить его',
    cameraPermissionDenied: 'Доступ к камере запрещён. Пожалуйста разрешите доступ к камере в настройках',
    externalAccounts: 'Управление Внешними Аккаунтами',
    connected: 'Подключено',
    notConfigured: 'Не Настроено',
    lineNotConfigured: 'LINE Не Настроено',
    systemSettings: 'Настройки Системы',
    soundEffects: 'Звуковые Эффекты',
    searchChats: 'Поиск Чатов',
    searchContactsOrGroups: 'Поиск контактов или групп...',
    contacts: 'Контакты',
    group: 'Группа',
    noResultsFound: 'Результаты не найдены',
    tryDifferentKeyword: 'Попробуйте другое ключевое слово',
    searchContactsAndGroups: 'Поиск Контактов и Групп',
    enterNameToSearch: 'Введите имя или название группы для поиска',
    
    // Guest User
    guestAccountNotice: 'Guest account notice',
    upgradeToInviteFriends: 'Upgrade to invite friends',
    upgradeAccount: 'Upgrade account',
    guestChatRestricted: 'Guest Account Limitation',
    guestUpgradeToChatWithFriends: 'Guest users can only chat with AI Assistant. Please upgrade to chat with friends.',
    upgradeNow: 'Upgrade Now',
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успех',
    saved: 'Сохранено',
    saveFailed: 'Ошибка сохранения',
    justNow: 'Только что',
    minutesAgo: 'минут назад',
    hoursAgo: 'часов назад',
    yesterday: 'Вчера',
    daysAgo: 'дней назад',
    noMessages: 'Нет сообщений',
    mePrefix: 'Я: ',
    unknownUser: 'Неизвестный пользователь',
    groupLabel: '(Группа)',
    emptyChatsHint: 'Пока нет чатов, добавьте друзей или создайте группы чтобы начать!',
    chatInfo: 'Информация о чате',
    searchChatHistory: 'Поиск по истории чата',
    clearChatHistory: 'Очистить историю чата',
    muteNotifications: 'Отключить уведомления',
    pinChat: 'Закрепить чат',
    reminders: 'Напоминания',
    setChatBackground: 'Установить фон чата',
    report: 'Пожаловаться',
    selectFunction: 'Выбрать функцию',
    gallery: 'Галерея',
    camera: 'Камера',
    voiceCall: 'Голосовой вызов',
    location: 'Местоположение',
    file: 'Файл',
    favorites: 'Избранное',
    businessCard: 'Визитка',
    videoCall: 'Видеовызов',
    voiceCallNeedSDK: 'Функция голосового вызова требует интеграции WebRTC/стороннего SDK',
    videoCallNeedSDK: 'Функция видеовызова требует интеграции WebRTC/стороннего SDK',
    favoritesNotImplemented: 'Функция избранного еще не реализована',
    locationPermissionError: 'Не удается получить текущее местоположение, проверьте разрешения местоположения',
    locationNotSupported: 'Службы определения местоположения не поддерживаются на этом устройстве',
    viewLocation: 'Посмотреть местоположение',
    clickToOpenMaps: 'Нажмите, чтобы открыть Google Maps',
    businessCardPrefix: 'Визитка',
    emailLabel: 'Электронная почта',
    phoneLabel: 'Телефон',
    phoneNotSet: 'Не установлено',
    selectContact: 'Выбрать контакт',
    searchContacts: 'Поиск контактов',
    myCard: 'Моя карточка',
    inviteToCall: 'Пригласить к звонку',
    noFriends: 'Нет друзей',
    invite: 'Пригласить',
    
    // New fields
    confirm: 'Подтвердить',
    delete: 'Удалить',
    save: 'Сохранить',
    saving: 'Saving...',
    copy: 'Копировать',
    search: 'Поиск',
    share: 'Поделиться',
    searchUsers: 'Поиск пользователей',
    searchPlaceholder: 'Поиск по имени пользователя, имени или email...',
    searchResults: 'Результаты поиска',
    searching: 'Поиск...',
    noUsersFound: 'Пользователи не найдены',
    addByUsername: 'Добавить друга по имени пользователя',
    channelWhatsapp: 'WhatsApp',
    channelWechat: 'WeChat',
    channelLine: 'LINE',
    channelMessenger: 'Messenger',
    channelTelegram: 'Telegram',
    channelInstagram: 'Instagram',
    channelViber: 'Viber',
    emptyChatRecord: 'Пока нет истории чатов, добавьте друзей или присоединитесь к группам!',
    noGroupsHint: 'Пока нет групп, создайте группу!',
    noFriendsHint: 'Пока нет друзей, добавьте несколько друзей!',
    loadingMessages: 'Загрузка сообщений...',
    loadMore: 'Загрузить больше сообщений',
    startConversation: 'Начать разговор с {}',
    welcomeToGroup: 'Добро пожаловать в {}',
    
    // Error messages
    loginFailed: 'Ошибка входа, попробуйте еще раз',
    loginError: 'Ошибка входа',
    lineLoginError: 'Произошла ошибка при входе через LINE',
    authFailed: 'Ошибка аутентификации, попробуйте еще раз',
    loginParamsMissing: 'Отсутствуют параметры входа',
    redirectFailed: 'Ошибка перенаправления, попробуйте еще раз',
    addFriendFailed: 'Ошибка добавления друга',
    createGroupFailed: 'Ошибка создания группы',
    loadChatsFailed: 'Не удается загрузить список чатов',
    loadFriendsFailed: 'Не удается загрузить список друзей',
    loadGroupsFailed: 'Не удается загрузить список групп',
    getLocationFailed: 'Не удается получить местоположение',
    translationError: 'Ошибка перевода',
    webrtcNetworkRestricted: 'Сетевые ограничения препятствуют установлению вызова. Переключитесь на мобильные данные (4G/5G) и повторите попытку',
    mediaPermissionDenied: 'Разрешение на микрофон/камеру отклонено. Пожалуйста, разрешите доступ и попробуйте снова',
    
    // Success messages
    friendRequestSent: 'Запрос на дружбу отправлен',
    groupCreated: 'Группа успешно создана',
    callInviteSent: 'Приглашено {} друзей к {} звонку',
    
    // Dialog content
    switchLanguage: 'Сменить язык',
    switchLanguageConfirm: 'Вы уверены, что хотите переключиться на {}?',
    uiWillShow: '• UI будет отображаться на этом языке',
    uiWillShowEnglish: '• UI будет отображаться на английском языке',
    onlyChatTranslation: '• Поддерживает только перевод сообщений чата',
    applying: 'Применение...',
    
    // Language Picker
    languageSearchPlaceholder: '搜索/Search/検索/ค้นหา/Cari/Tìm kiếm',
    chatTranslationOnly: '(Перевод чата)',
    chatTranslationNote: '• <strong>Перевод чата</strong>: বাংলা, اردو, Türkçe, Tiếng Việt поддерживают перевод чата с английским интерфейсом',
    fullUiSupport: 'Языки с полной поддержкой перевода интерфейса',
    fullUiSupportLanguages: '简体中文、English、ไทย、日本語、Bahasa Indonesia、Español、Français、العربية、हिन्दी、Deutsch、Русский、Português',
    
    // Login page
    appDescription: 'Многоязычная система мгновенного общения',
    loginWithLine: 'Войти через LINE',
    chatWithWorldFriends: 'Войдите через свой аккаунт LINE, чтобы общаться с друзьями по всему миру',
    
    // Validation messages
    enterUsername: 'Пожалуйста, введите имя пользователя для поиска',
    enterGroupName: 'Пожалуйста, введите название группы',
    selectOneFriend: 'Пожалуйста, выберите хотя бы одного друга',
    groupNeedAtLeastThreePeople: 'Для группы требуется минимум 3 человека (включая вас). Пожалуйста, выберите еще хотя бы 2 друзей',
    
    // Development
    inDevelopment: 'В разработке...',
    
    // New Profile Menu Items
    myServices: 'Мои Услуги',
    myFavorites: 'Мои Избранные',
    myDiscovery: 'Мои Открытия',
    ordersAndPoints: 'Заказы и Баллы',
    emoticons: 'Эмотиконы',
    personalProfile: 'Личный Профиль',
    accountSecurity: 'Безопасность Аккаунта',
    friendPermissions: 'Добавить Друзей',
    userAgreement: 'Пользовательское Соглашение',
    privacyPolicy: 'Политика Конфиденциальности',
    
    // Account types
    personalAccount: 'Личный Аккаунт',
    accountId: 'ID аккаунта',
    personal: 'Личный',
    creator: 'Создатель',
    enterprise: 'Предприятие',
    noOtherAccounts: 'Нет других аккаунтов',
    
    // New menu items
    services: 'Услуги',
    stickers: 'Стикеры',
    
    // Commerce
    orders: 'Заказы',
    cart: 'Корзина',
    points: 'Баллы',
    wallet: 'Кошелек',
    myOrders: 'Мои Заказы',
    myCart: 'Моя Корзина',
    myPoints: 'Мои Баллы',
    myWallet: 'Мой Кошелек',
    noOrders: 'Нет заказов',
    noCartItems: 'Корзина пуста',
    totalPoints: 'Всего Баллов',
    balance: 'Баланс',
    availableBalance: 'Доступный Баланс',
    emptyState: 'Нет данных',
    
    // Friend requests
    friendRequests: 'Запросы в Друзья',
    wantsToBeYourFriend: 'хочет стать вашим другом',
    accept: 'Принять',
    decline: 'Отклонить',
    friendRequestAccepted: 'Запрос в друзья принят',
    friendRequestDeclined: 'Запрос в друзья отклонён',
    failedToAcceptFriend: 'Не удалось принять запрос в друзья',
    failedToDeclineFriend: 'Не удалось отклонить запрос в друзья',
    alreadyFriends: 'Уже друзья',
    friendRequestAlreadySent: 'Запрос в друзья уже отправлен',
    cannotAddYourself: 'Нельзя добавить себя в друзья',
    
    // Membership Cards
    myMembershipCards: 'Мои Членские Карты',
    membershipTierRegular: 'Обычный участник',
    membershipTierSilver: 'Серебряный участник',
    membershipTierGold: 'Золотой участник',
    membershipTierPlatinum: 'Платиновый участник',
    currentPoints: 'Текущие баллы',
    pointsSuffix: 'баллов',
    
    // Account Types
    lineAccount: 'Аккаунт LINE',
    phoneAccount: 'Телефонный аккаунт',
    guestAccount: 'Гостевой аккаунт',
    
    // PWA Installation
    installSuccess: 'Установка выполнена успешно!',
    appInstalledSuccessfully: 'Trustalk успешно добавлен на ваш главный экран',
    iosInstallGuide: 'Руководство по установке iOS',
    iosInstallInstructions: 'Пожалуйста, нажмите кнопку "Поделиться" внизу браузера, затем выберите "Добавить на главный экран"',
    manualInstall: 'Ручная установка',
    manualInstallInstructions: 'Пожалуйста, выберите "Добавить на главный экран" или "Установить приложение" в меню браузера',
    addToHomeScreen: 'Добавить на главный экран',
    installLikeApp: 'Установить одним нажатием, использовать как приложение',
    
    // Friend Request Toasts
    friendRequestAcceptedToast: 'Запрос в друзья принят',
    friendAddedSuccessfully: 'Вы успешно добавили нового друга',
    operationFailed: 'Операция не выполнена',
    acceptFriendRequestFailed: 'Не удалось принять запрос в друзья, пожалуйста, попробуйте снова',
    friendRequestDeclinedToast: 'Запрос в друзья отклонён',
    friendRequestDeclinedMessage: 'Запрос в друзья был отклонён',
    declineFriendRequestFailed: 'Не удалось отклонить запрос в друзья, пожалуйста, попробуйте снова',
    pendingFriendRequests: 'Ожидающие запросы в друзья',
    noFriendRequests: 'Нет запросов в друзья',
    
    // New page content
    comingSoon: 'Coming Soon',
    noFavorites: 'No Favorites',
    noEmoticons: 'No Emoticons',
    username: 'Username',
    firstName: 'First Name',
    lastName: 'Last Name',
    nickname: 'Nickname',
    phoneNumber: 'Phone Number',
    languagePreference: 'Language Preference',
    notSet: 'Not Set',
    memberSince: 'Member Since',
    editProfile: 'Edit Profile',
    saveChanges: 'Save Changes',
    editing: 'Editing',
    usernameTaken: 'Username is already taken',
    profileUpdateSuccess: 'Profile updated successfully',
    profileUpdateFailed: 'Failed to update profile',
    selectLanguage: 'Select Language',
    upgradeForSecurity: 'Upgrade your account for better security',
    accountType: 'Account Type',
    linkedAccounts: 'Linked Accounts',
    lineAndPhone: 'LINE and Phone',
    lineOnly: 'LINE Only',
    phoneOnly: 'Phone Only',
    none: 'None',
    changePassword: 'Change Password',
    twoFactorAuth: 'Two-Factor Authentication',
    notEnabled: 'Not Enabled',
    securityTips: 'Security Tips',
    securityTip1: 'Change your password regularly and use strong passwords',
    securityTip2: 'Do not share your account information with others',
    securityTip3: 'Enable two-factor authentication for enhanced security',
    usernameRequired: 'Требуется имя пользователя',
    firstNameRequired: 'Требуется имя',
    
    supportsMultilingualTranslation: 'Поддерживает многоязычный перевод',
    supportedLanguages: 'Русский • English • 中文 • ไทย • 日本語 • Bahasa Indonesia • Español • Français • العربية • हिन्दी • Deutsch • Português',
    guestLogin: 'Попробовать сейчас',
    sixDigitSignup: '6-значный ID',
    usernameSignup: 'Имя пользователя',
    lineLogin: 'Вход через LINE',
    connectWithoutBarriers: 'Общение без границ',

    // Invite System
    invite_friends: 'Пригласить друзей',
    invite_to_group: 'Пригласить в группу',
    invite_to_chat: 'Пригласить в чат',
    sms: 'SMS',
    email: 'Email',
    invite_to_yulink: 'Я приглашаю вас присоединиться к чату Trustalk',
    copied: 'Скопировано',
    invite_link_copied: 'Ссылка-приглашение скопирована',
    generating_link: 'Генерация ссылки...',
    show_qr_code: 'Показать QR-код',
    scan_to_join: 'Сканируйте для присоединения',
    share_link: 'Поделиться ссылкой',
    share_to_platform: 'Поделиться на платформе',
    invite_tips_title: 'Советы по приглашению',
    invite_tip_1: 'Ссылки-приглашения действительны в течение 7 дней, после истечения создайте новую',
    invite_tip_2: 'Получатели могут присоединиться напрямую без регистрации',
    invite_tip_3: 'Поддерживает многоязычный автоперевод и голосовые/видео звонки',
    invite_message: 'Присоединяйтесь к моему {roomName} на {appName}!',
    failed_to_generate_invite_link: 'Не удалось создать ссылку-приглашение',
    invite_accepted_successfully: 'Приглашение успешно принято',
    failed_to_accept_invite: 'Не удалось принять приглашение',
    invite_link_expired: 'Срок действия ссылки-приглашения истёк',
    invalid_invite_link: 'Недействительная ссылка-приглашение',
    invite_error: 'Ошибка приглашения',
    back_to_home: 'Вернуться на главную',
    multilingual_instant_communication: 'Многоязычное мгновенное общение',
    youre_invited_to_join: 'Вас приглашают присоединиться',
    click_accept_to_join_conversation: 'Нажмите "Принять", чтобы присоединиться к разговору',
    auto_translation: 'Автоматический перевод',
    cross_language_communication: 'Общение без языковых барьеров',
    voice_video_calls: 'Голосовые и видео звонки',
    high_quality_communication: 'Высококачественное общение в реальном времени',
    group_chat: 'Групповой чат',
    connect_with_friends: 'Оставайтесь на связи с друзьями',
    accepting: 'Принятие...',
    processing_invite: 'Обработка приглашения...',
    accept_invitation: 'Принять приглашение',
    by_accepting_you_agree: 'Принимая, вы соглашаетесь с',
    terms_and_privacy: 'Условиями использования и Политикой конфиденциальности',
    
    // Profile Edit
    pleaseSelectImage: 'Пожалуйста, выберите изображение',
    avatarUpdated: 'Аватар обновлен',
    uploadFailed: 'Не удалось загрузить',
    profileUpdated: 'Профиль обновлен',
    uploading: 'Загрузка...',
    tapToChangeAvatar: 'Нажмите, чтобы изменить аватар',
    enterFirstName: 'Пожалуйста, введите имя',
    enterLastName: 'Пожалуйста, введите фамилию',
    profileEditNote: 'Измененная информация будет видна всем друзьям',
    accountIdCopied: 'ID аккаунта скопирован',
    copyFailed: 'Ошибка копирования',
    
    // Service Center
    serviceCenter: 'Сервисный центр',
    accountAndIdentity: 'Учетная запись и идентичность',
    myWorkAccounts: 'Мои рабочие аккаунты',
    manageEnterpriseIdentities: 'Просмотр/управление корпоративными идентификаторами',
    myCreatorAccounts: 'Мои аккаунты создателя',
    manageContentCreatorIdentities: 'Просмотр/управление идентификаторами создателя',
    applyEnterpriseAccount: 'Подать заявку на корпоративный аккаунт',
    createEnterpriseWizard: 'Войти в мастер создания предприятия',
    oaContentUpload: 'Загрузка контента/товара',
    oaProductUpload: 'Загрузка товара',
    oaContentManagement: 'Управление контентом/товарами',
    oaProductManagement: 'Управление товарами',
    oaPublishContent: 'Опубликовать контент',
    oaUploadProduct: 'Загрузить товар',
    oaArticle: 'Статья',
    oaVideo: 'Видео',
    oaProduct: 'Товар',
    oaTitle: 'Заголовок',
    oaTitlePlaceholder: 'Введите заголовок',
    oaDescription: 'Описание',
    oaDescriptionPlaceholder: 'Введите описание',
    oaSelectVideo: 'Выбрать видео',
    oaVideoCover: 'Обложка видео (необязательно)',
    oaUploadImages: 'Загрузить изображения',
    oaMaxImages: 'Максимум 9 изображений',
    oaProductCover: 'Обложка товара',
    oaPrice: 'Цена',
    oaPricePlaceholder: 'Введите цену',
    oaPublish: 'Опубликовать',
    oaPublishing: 'Публикация...',
    oaNoContent: 'Нет контента, нажмите "Опубликовать контент" для начала',
    oaStartPublish: 'Начать публикацию',
    oaNoProducts: 'Нет товаров, нажмите "Загрузить товар" для начала',
    oaUploadProductFirst: 'Нет товаров, сначала загрузите товар',
    oaViews: 'Просмотры',
    oaLikes: 'Лайки',
    oaBindProduct: 'Привязать продвижение товара',
    oaBoundProduct: 'Привязанный товар',
    oaSelectProductToBind: 'Выберите товар для продвижения в этом контенте',
    oaUnbind: 'Отвязать',
    oaClose: 'Закрыть',
    oaContentList: 'Список контента',
    oaProductList: 'Список товаров',
    oaPublishSuccess: 'Успешно опубликовано',
    oaPublishFailed: 'Не удалось опубликовать',
    oaDeleteSuccess: 'Успешно удалено',
    oaDeleteFailed: 'Не удалось удалить',
    oaBindSuccess: 'Успешно привязано',
    oaBindFailed: 'Не удалось привязать',
    oaStatContent: 'Всего работ',
    oaStatFollowers: 'Всего подписчиков',
    oaStatViews: 'Всего просмотров',
    oaStatEarnings: 'Доход за месяц',
    oaDrafts: 'Черновики',
    oaOnline: 'Опубликовано',
    oaTrash: 'Корзина',
    oaMoveToBin: 'В корзину',
    oaRestore: 'Восстановить',
    oaPermanentDelete: 'Удалить навсегда',
    oaRestoreSuccess: 'Восстановлено',
    oaAll: 'Все',
    close: 'Закрыть',
    followNow: 'Подписаться',
    following: 'Подписан',
    saySmething: 'Скажите что-нибудь...',
    noImage: 'Нет изображения',
    contentNotFound: 'Контент не найден или удалён',
    viewProduct: 'Смотреть',
    tagsLabel: 'Теги',
    invalidDate: 'Неверная дата',
    shareSuccess: 'Успешно отправлено',
    shareFailed: 'Ошибка отправки',
    linkCopied: 'Ссылка скопирована',
    copiedToClipboard: 'Скопировано в буфер обмена',
    lineOaInviteTitle: 'Это мой многоязычный аккаунт LINE',
    lineOaInviteDesc: 'Подпишитесь на меня, чтобы начать многоязычное общение!',
    lineOaFollowMe: 'Подписаться на меня в LINE',
    lineOaLoginToConnect: 'Войдите, чтобы начать многоязычный чат'
  },
  pt: {
    chats: 'Conversas',
    friends: 'Amigos',
    groups: 'Grupos',
    profile: 'Perfil',
    discover: 'Descobrir',
    shop: 'Compras',
    worldInbox: 'Caixa de Entrada Mundial',
    add: 'Adicionar',
    cancel: 'Cancelar',
    create: 'Criar',
    send: 'Enviar',
    back: 'Voltar',
    settings: 'Configurações',
    logout: 'Sair',
    inviteFriends: 'Convidar amigos',
    scanQR: 'Escanear QR',
    friendsList: 'Lista de amigos',
    addFriend: 'Adicionar amigo',
    friendId: 'ID do amigo',
    addFriendPlaceholder: 'Digite o ID do amigo ou telefone...',
    newFriendRequest: 'Novo pedido de amizade',
    acceptFriendRequest: 'Aceitar',
    rejectFriendRequest: 'Rejeitar',
    groupsList: 'Lista de grupos',
    createGroup: 'Criar grupo',
    groupName: 'Nome do grupo',
    groupNamePlaceholder: 'Digite o nome do grupo...',
    selectMembers: 'Selecionar membros',
    selectedMembers: 'Membros selecionados',
    selectAll: 'Selecionar tudo',
    deselectAll: 'Desselecionar tudo',
    searchFriends: 'Pesquisar amigos',
    noSearchResults: 'Nenhum amigo correspondente encontrado',
    typeMessage: 'Digite uma mensagem...',
    online: 'Online',
    offline: 'Offline',
    translating: 'Traduzindo...',
    aiAssistantName: 'Meu Assistente',
    myQrCode: 'Meu código QR',
    languageSettings: 'Configurações de idioma',
    notifications: 'Notificações',
    otherSettings: 'Outras configurações',
    myLanguage: 'Meu idioma',
    multilingualCard: 'Meu código QR',
    myShareLink: 'Meu link de compartilhamento',
    viewCard: 'Ver cartão',
    qrCodePlaceholder: 'Código QR (Escaneie para me adicionar)',
    scanQRToViewCard: 'Escaneie o código QR para ver o cartão multilíngue',
    scanQRToAddFriend: 'Escaneie o código QR de um amigo para adicioná-lo',
    cameraPermissionDenied: 'Permissão de câmera negada. Por favor permita o acesso à câmera nas configurações',
    externalAccounts: 'Gerenciamento de Contas Externas',
    connected: 'Conectado',
    notConfigured: 'Não Configurado',
    lineNotConfigured: 'LINE Não Configurado',
    systemSettings: 'Configurações do Sistema',
    soundEffects: 'Efeitos Sonoros',
    searchChats: 'Pesquisar Chats',
    searchContactsOrGroups: 'Pesquisar contatos ou grupos...',
    contacts: 'Contatos',
    group: 'Grupo',
    noResultsFound: 'Nenhum resultado encontrado',
    tryDifferentKeyword: 'Tente uma palavra-chave diferente',
    searchContactsAndGroups: 'Pesquisar Contatos e Grupos',
    enterNameToSearch: 'Digite um nome ou nome de grupo para pesquisar',
    
    // Guest User
    guestAccountNotice: 'Guest account notice',
    upgradeToInviteFriends: 'Upgrade to invite friends',
    upgradeAccount: 'Upgrade account',
    guestChatRestricted: 'Guest Account Limitation',
    guestUpgradeToChatWithFriends: 'Guest users can only chat with AI Assistant. Please upgrade to chat with friends.',
    upgradeNow: 'Upgrade Now',
    loading: 'Carregando...',
    error: 'Erro',
    success: 'Sucesso',
    saved: 'Salvo',
    saveFailed: 'Falha ao salvar',
    justNow: 'Agora',
    minutesAgo: 'minutos atrás',
    hoursAgo: 'horas atrás',
    yesterday: 'Ontem',
    daysAgo: 'dias atrás',
    noMessages: 'Sem mensagens',
    mePrefix: 'Eu: ',
    unknownUser: 'Usuário desconhecido',
    groupLabel: '(Grupo)',
    emptyChatsHint: 'Ainda não há conversas, adicione amigos ou crie grupos para começar!',
    chatInfo: 'Informações da conversa',
    searchChatHistory: 'Pesquisar histórico da conversa',
    clearChatHistory: 'Limpar histórico da conversa',
    muteNotifications: 'Silenciar notificações',
    pinChat: 'Fixar conversa',
    reminders: 'Lembretes',
    setChatBackground: 'Definir fundo da conversa',
    report: 'Denunciar',
    selectFunction: 'Selecionar função',
    gallery: 'Galeria',
    camera: 'Câmera',
    voiceCall: 'Chamada de voz',
    location: 'Localização',
    file: 'Arquivo',
    favorites: 'Favoritos',
    businessCard: 'Cartão de visita',
    videoCall: 'Chamada de vídeo',
    voiceCallNeedSDK: 'A função de chamada de voz requer integração WebRTC/SDK de terceiros',
    videoCallNeedSDK: 'A função de chamada de vídeo requer integração WebRTC/SDK de terceiros',
    favoritesNotImplemented: 'A função de favoritos ainda não foi implementada',
    locationPermissionError: 'Não é possível obter a localização atual, verifique as permissões de localização',
    locationNotSupported: 'Os serviços de localização não são suportados neste dispositivo',
    viewLocation: 'Ver Localização',
    clickToOpenMaps: 'Clique para abrir o Google Maps',
    businessCardPrefix: 'Cartão de visita',
    emailLabel: 'E-mail',
    phoneLabel: 'Telefone',
    phoneNotSet: 'Não definido',
    selectContact: 'Selecionar Contato',
    searchContacts: 'Buscar contatos',
    myCard: 'Meu Cartão',
    inviteToCall: 'Convidar para chamada',
    noFriends: 'Sem amigos',
    invite: 'Convidar',
    
    // New fields
    confirm: 'Confirmar',
    delete: 'Excluir',
    save: 'Salvar',
    saving: 'Saving...',
    copy: 'Copiar',
    search: 'Pesquisar',
    share: 'Compartilhar',
    searchUsers: 'Pesquisar usuários',
    searchPlaceholder: 'Pesquisar nome de usuário, nome ou email...',
    searchResults: 'Resultados da pesquisa',
    searching: 'Pesquisando...',
    noUsersFound: 'Nenhum usuário encontrado',
    addByUsername: 'Adicionar amigo por nome de usuário',
    channelWhatsapp: 'WhatsApp',
    channelWechat: 'WeChat',
    channelLine: 'LINE',
    channelMessenger: 'Messenger',
    channelTelegram: 'Telegram',
    channelInstagram: 'Instagram',
    channelViber: 'Viber',
    emptyChatRecord: 'Ainda sem histórico de chat, adicione amigos ou participe de grupos para começar!',
    noGroupsHint: 'Ainda sem grupos, crie um grupo para começar!',
    noFriendsHint: 'Ainda sem amigos, adicione alguns amigos!',
    loadingMessages: 'Carregando mensagens...',
    loadMore: 'Carregar mais mensagens',
    startConversation: 'Iniciar conversa com {}',
    welcomeToGroup: 'Bem-vindo a {}',
    
    // Error messages
    loginFailed: 'Falha no login, tente novamente',
    loginError: 'Erro de login',
    lineLoginError: 'Ocorreu um erro no login do LINE',
    authFailed: 'Falha na autenticação, tente novamente',
    loginParamsMissing: 'Parâmetros de login ausentes',
    redirectFailed: 'Falha no redirecionamento, tente novamente',
    addFriendFailed: 'Falha ao adicionar amigo',
    createGroupFailed: 'Falha ao criar grupo',
    loadChatsFailed: 'Não foi possível carregar a lista de chats',
    loadFriendsFailed: 'Não foi possível carregar a lista de amigos',
    loadGroupsFailed: 'Não foi possível carregar a lista de grupos',
    getLocationFailed: 'Falha ao obter localização',
    translationError: 'Erro de tradução',
    webrtcNetworkRestricted: 'Restrições de rede impedem estabelecer a chamada. Mude para dados móveis (4G/5G) e tente novamente',
    mediaPermissionDenied: 'Permissão de microfone/câmera negada. Por favor, permita o acesso e tente novamente',
    
    // Success messages
    friendRequestSent: 'Solicitação de amizade enviada',
    groupCreated: 'Grupo criado com sucesso',
    callInviteSent: 'Convidando {} amigos para a chamada {}',
    
    // Dialog content
    switchLanguage: 'Trocar idioma',
    switchLanguageConfirm: 'Tem certeza de que deseja trocar para {}?',
    uiWillShow: '• A UI será exibida neste idioma',
    uiWillShowEnglish: '• A UI será exibida em inglês',
    onlyChatTranslation: '• Suporta apenas tradução de mensagens de chat',
    applying: 'Aplicando...',
    
    // Language Picker
    languageSearchPlaceholder: '搜索/Search/検索/ค้นหา/Cari/Tìm kiếm',
    chatTranslationOnly: '(Tradução de chat)',
    chatTranslationNote: '• <strong>Tradução de chat</strong>: বাংলা, اردو, Türkçe, Tiếng Việt suportam tradução de chat com interface em inglês',
    fullUiSupport: 'Idiomas com suporte completo de tradução de interface',
    fullUiSupportLanguages: '简体中文、English、ไทย、日本語、Bahasa Indonesia、Español、Français、العربية、हिन्दी、Deutsch、Русский、Português',
    
    // Login page
    appDescription: 'Sistema de comunicação instantânea multilíngue',
    loginWithLine: 'Entrar com LINE',
    chatWithWorldFriends: 'Entre com sua conta LINE para conversar com amigos do mundo todo',
    
    // Validation messages
    enterUsername: 'Por favor, digite um nome de usuário para pesquisar',
    enterGroupName: 'Por favor, digite um nome de grupo',
    selectOneFriend: 'Por favor, selecione pelo menos um amigo',
    groupNeedAtLeastThreePeople: 'Grupos requerem pelo menos 3 pessoas (incluindo você). Por favor, selecione pelo menos mais 2 amigos',
    
    // Development
    inDevelopment: 'Em desenvolvimento...',
    
    // New Profile Menu Items
    myServices: 'Meus Serviços',
    myFavorites: 'Meus Favoritos',
    myDiscovery: 'Minhas Descobertas',
    ordersAndPoints: 'Pedidos e Pontos',
    emoticons: 'Emoticons',
    personalProfile: 'Perfil Pessoal',
    accountSecurity: 'Segurança da Conta',
    friendPermissions: 'Adicionar Amigos',
    userAgreement: 'Acordo do Usuário',
    privacyPolicy: 'Política de Privacidade',
    
    // Account types
    personalAccount: 'Conta Pessoal',
    accountId: 'ID da Conta',
    personal: 'Pessoal',
    creator: 'Criador',
    enterprise: 'Empresa',
    noOtherAccounts: 'Sem outras contas',
    
    // New menu items
    services: 'Serviços',
    stickers: 'Adesivos',
    
    // Commerce
    orders: 'Pedidos',
    cart: 'Carrinho',
    points: 'Pontos',
    wallet: 'Carteira',
    myOrders: 'Meus Pedidos',
    myCart: 'Meu Carrinho',
    myPoints: 'Meus Pontos',
    myWallet: 'Minha Carteira',
    noOrders: 'Sem pedidos',
    noCartItems: 'Carrinho vazio',
    totalPoints: 'Total de Pontos',
    balance: 'Saldo',
    availableBalance: 'Saldo Disponível',
    emptyState: 'Sem dados',
    
    // Friend requests
    friendRequests: 'Solicitações de Amizade',
    wantsToBeYourFriend: 'quer ser seu amigo',
    accept: 'Aceitar',
    decline: 'Recusar',
    friendRequestAccepted: 'Solicitação de amizade aceita',
    friendRequestDeclined: 'Solicitação de amizade recusada',
    failedToAcceptFriend: 'Falha ao aceitar solicitação de amizade',
    failedToDeclineFriend: 'Falha ao recusar solicitação de amizade',
    alreadyFriends: 'Já são amigos',
    friendRequestAlreadySent: 'Solicitação de amizade já enviada',
    cannotAddYourself: 'Você não pode se adicionar como amigo',
    
    // Membership Cards
    myMembershipCards: 'Meus Cartões de Membro',
    membershipTierRegular: 'Membro Regular',
    membershipTierSilver: 'Membro Prata',
    membershipTierGold: 'Membro Ouro',
    membershipTierPlatinum: 'Membro Platina',
    currentPoints: 'Pontos Atuais',
    pointsSuffix: 'pts',
    
    // Account Types
    lineAccount: 'Conta LINE',
    phoneAccount: 'Conta Telefone',
    guestAccount: 'Conta Convidado',
    
    // PWA Installation
    installSuccess: 'Instalação Bem-Sucedida!',
    appInstalledSuccessfully: 'Trustalk foi adicionado com sucesso à sua tela inicial',
    iosInstallGuide: 'Guia de Instalação iOS',
    iosInstallInstructions: 'Por favor, toque no botão de compartilhar na parte inferior do navegador e selecione \'Adicionar à Tela Inicial\'',
    manualInstall: 'Instalação Manual',
    manualInstallInstructions: 'Por favor, selecione \'Adicionar à Tela Inicial\' ou \'Instalar App\' no menu do navegador',
    addToHomeScreen: 'Adicionar à Tela Inicial',
    installLikeApp: 'Instalar com um toque, usar como um app',
    
    // Friend Request Toasts
    friendRequestAcceptedToast: 'Solicitação de Amizade Aceita',
    friendAddedSuccessfully: 'Você adicionou com sucesso um novo amigo',
    operationFailed: 'Operação Falhou',
    acceptFriendRequestFailed: 'Falha ao aceitar solicitação de amizade, por favor tente novamente',
    friendRequestDeclinedToast: 'Solicitação de Amizade Recusada',
    friendRequestDeclinedMessage: 'A solicitação de amizade foi recusada',
    declineFriendRequestFailed: 'Falha ao recusar solicitação de amizade, por favor tente novamente',
    pendingFriendRequests: 'Solicitações de Amizade Pendentes',
    noFriendRequests: 'Sem Solicitações de Amizade',
    
    // New page content
    comingSoon: 'Coming Soon',
    noFavorites: 'No Favorites',
    noEmoticons: 'No Emoticons',
    username: 'Username',
    firstName: 'First Name',
    lastName: 'Last Name',
    nickname: 'Nickname',
    phoneNumber: 'Phone Number',
    languagePreference: 'Language Preference',
    notSet: 'Not Set',
    memberSince: 'Member Since',
    editProfile: 'Edit Profile',
    saveChanges: 'Save Changes',
    editing: 'Editing',
    usernameTaken: 'Username is already taken',
    profileUpdateSuccess: 'Profile updated successfully',
    profileUpdateFailed: 'Failed to update profile',
    selectLanguage: 'Select Language',
    upgradeForSecurity: 'Upgrade your account for better security',
    accountType: 'Account Type',
    linkedAccounts: 'Linked Accounts',
    lineAndPhone: 'LINE and Phone',
    lineOnly: 'LINE Only',
    phoneOnly: 'Phone Only',
    none: 'None',
    changePassword: 'Change Password',
    twoFactorAuth: 'Two-Factor Authentication',
    notEnabled: 'Not Enabled',
    securityTips: 'Security Tips',
    securityTip1: 'Change your password regularly and use strong passwords',
    securityTip2: 'Do not share your account information with others',
    securityTip3: 'Enable two-factor authentication for enhanced security',
    usernameRequired: 'Nome de usuário obrigatório',
    firstNameRequired: 'Primeiro nome obrigatório',
    
    supportsMultilingualTranslation: 'Suporta tradução multilíngue',
    supportedLanguages: 'Português • English • 中文 • ไทย • 日本語 • Bahasa Indonesia • Español • Français • العربية • हिन्दी • Deutsch • Русский',
    guestLogin: 'Experimentar Agora',
    sixDigitSignup: 'ID de 6 dígitos',
    usernameSignup: 'Nome de usuário',
    lineLogin: 'Login LINE',
    connectWithoutBarriers: 'Comunicação sem barreiras',

    // Invite System
    invite_friends: 'Convidar Amigos',
    invite_to_group: 'Convidar para o Grupo',
    invite_to_chat: 'Convidar para o Chat',
    sms: 'SMS',
    email: 'Email',
    invite_to_yulink: 'Eu convido você para entrar no chat Trustalk',
    copied: 'Copiado',
    invite_link_copied: 'Link de convite copiado',
    generating_link: 'Gerando link...',
    show_qr_code: 'Mostrar Código QR',
    scan_to_join: 'Escanear para entrar',
    share_link: 'Compartilhar Link',
    share_to_platform: 'Compartilhar na Plataforma',
    invite_tips_title: 'Dicas de Convite',
    invite_tip_1: 'Links de convite são válidos por 7 dias, regenerar após expirar',
    invite_tip_2: 'Destinatários podem entrar diretamente sem registro',
    invite_tip_3: 'Suporta tradução automática multilíngue e chamadas de voz/vídeo',
    invite_message: 'Junte-se ao meu {roomName} no {appName}!',
    failed_to_generate_invite_link: 'Falha ao gerar link de convite',
    invite_accepted_successfully: 'Convite aceito com sucesso',
    failed_to_accept_invite: 'Falha ao aceitar convite',
    invite_link_expired: 'O link de convite expirou',
    invalid_invite_link: 'Link de convite inválido',
    invite_error: 'Erro de Convite',
    back_to_home: 'Voltar para o Início',
    multilingual_instant_communication: 'Comunicação Instantânea Multilíngue',
    youre_invited_to_join: 'Você está convidado para entrar',
    click_accept_to_join_conversation: 'Clique em aceitar para entrar na conversa',
    auto_translation: 'Tradução Automática',
    cross_language_communication: 'Comunicação sem barreiras linguísticas',
    voice_video_calls: 'Chamadas de Voz e Vídeo',
    high_quality_communication: 'Comunicação em tempo real de alta qualidade',
    group_chat: 'Chat em Grupo',
    connect_with_friends: 'Mantenha-se conectado com amigos',
    accepting: 'Aceitando...',
    processing_invite: 'Processando convite...',
    accept_invitation: 'Aceitar Convite',
    by_accepting_you_agree: 'Ao aceitar, você concorda com',
    terms_and_privacy: 'Termos de Serviço e Política de Privacidade',
    
    // Profile Edit
    pleaseSelectImage: 'Por favor selecione uma imagem',
    avatarUpdated: 'Avatar atualizado',
    uploadFailed: 'Falha no upload',
    profileUpdated: 'Perfil atualizado',
    uploading: 'Enviando...',
    tapToChangeAvatar: 'Toque para alterar o avatar',
    enterFirstName: 'Por favor digite o primeiro nome',
    enterLastName: 'Por favor digite o sobrenome',
    profileEditNote: 'As informações modificadas serão visíveis para todos os amigos',
    accountIdCopied: 'ID da conta copiado',
    copyFailed: 'Falha ao copiar',
    
    // Service Center
    serviceCenter: 'Centro de Serviços',
    accountAndIdentity: 'Conta e Identidade',
    myWorkAccounts: 'Minhas Contas de Trabalho',
    manageEnterpriseIdentities: 'Ver/gerenciar identidades empresariais',
    myCreatorAccounts: 'Minhas Contas de Criador',
    manageContentCreatorIdentities: 'Ver/gerenciar identidades de criador',
    applyEnterpriseAccount: 'Solicitar Conta Empresarial',
    createEnterpriseWizard: 'Entrar no assistente de criação empresarial',
    oaContentUpload: 'Upload de Conteúdo/Produto',
    oaProductUpload: 'Upload de Produto',
    oaContentManagement: 'Gestão de Conteúdo/Produto',
    oaProductManagement: 'Gestão de Produtos',
    oaPublishContent: 'Publicar Conteúdo',
    oaUploadProduct: 'Fazer Upload de Produto',
    oaArticle: 'Artigo',
    oaVideo: 'Vídeo',
    oaProduct: 'Produto',
    oaTitle: 'Título',
    oaTitlePlaceholder: 'Digite o título',
    oaDescription: 'Descrição',
    oaDescriptionPlaceholder: 'Digite a descrição',
    oaSelectVideo: 'Selecionar Vídeo',
    oaVideoCover: 'Capa do Vídeo (Opcional)',
    oaUploadImages: 'Fazer Upload de Imagens',
    oaMaxImages: 'Máximo 9 imagens',
    oaProductCover: 'Capa do Produto',
    oaPrice: 'Preço',
    oaPricePlaceholder: 'Digite o preço',
    oaPublish: 'Publicar',
    oaPublishing: 'Publicando...',
    oaNoContent: 'Sem conteúdo, clique em "Publicar Conteúdo" para começar',
    oaStartPublish: 'Começar a Publicar',
    oaNoProducts: 'Sem produtos, clique em "Upload de Produto" para começar',
    oaUploadProductFirst: 'Sem produtos, faça upload de um produto primeiro',
    oaViews: 'Visualizações',
    oaLikes: 'Curtidas',
    oaBindProduct: 'Vincular Promoção de Produto',
    oaBoundProduct: 'Produto Vinculado',
    oaSelectProductToBind: 'Selecione um produto para promover neste conteúdo',
    oaUnbind: 'Desvincular',
    oaClose: 'Fechar',
    oaContentList: 'Lista de Conteúdo',
    oaProductList: 'Lista de Produtos',
    oaPublishSuccess: 'Publicado com sucesso',
    oaPublishFailed: 'Falha ao publicar',
    oaDeleteSuccess: 'Excluído com sucesso',
    oaDeleteFailed: 'Falha ao excluir',
    oaBindSuccess: 'Vinculado com sucesso',
    oaBindFailed: 'Falha ao vincular',
    oaStatContent: 'Total de Obras',
    oaStatFollowers: 'Total de Seguidores',
    oaStatViews: 'Total de Visualizações',
    oaStatEarnings: 'Ganhos do Mês',
    oaDrafts: 'Rascunhos',
    oaOnline: 'Publicado',
    oaTrash: 'Lixeira',
    oaMoveToBin: 'Mover para Lixeira',
    oaRestore: 'Restaurar',
    oaPermanentDelete: 'Excluir Permanentemente',
    oaRestoreSuccess: 'Restaurado',
    oaAll: 'Todos',
    close: 'Fechar',
    followNow: 'Seguir',
    following: 'Seguindo',
    saySmething: 'Diga algo...',
    noImage: 'Sem imagem',
    contentNotFound: 'Conteúdo não encontrado ou excluído',
    viewProduct: 'Ver',
    tagsLabel: 'Tags',
    invalidDate: 'Data inválida',
    shareSuccess: 'Compartilhado com sucesso',
    shareFailed: 'Falha ao compartilhar',
    linkCopied: 'Link copiado',
    copiedToClipboard: 'Copiado para a área de transferência',
    lineOaInviteTitle: 'Esta é minha conta LINE multilíngue',
    lineOaInviteDesc: 'Siga-me para iniciar comunicação multilíngue!',
    lineOaFollowMe: 'Siga-me no LINE',
    lineOaLoginToConnect: 'Faça login para iniciar chat multilíngue'
  },
};

// UI语言：由浏览器自动检测，只在首次访问时设置，之后永远不变
let uiLanguage: Language = 'en';

// 翻译语言：用户手动选择，用于消息翻译
let translationLanguage: Language = 'en';

/**
 * 设置消息翻译语言（用户选择）
 * 注意：这个函数只影响消息翻译，不会改变UI语言
 */
export function setTranslationLanguage(lang: Language) {
  translationLanguage = lang;
  localStorage.setItem('mychat-translation-language', lang);
  console.log(`Translation language set to: ${lang}`);
}

/**
 * 获取当前UI显示语言（由浏览器自动检测，不可手动更改）
 */
export function getCurrentLanguage(): Language {
  return uiLanguage;
}

/**
 * 获取用户的消息翻译语言偏好
 */
export function getUserLanguagePreference(): Language {
  return translationLanguage;
}

/**
 * 从服务器同步语言偏好到本地
 * 当用户登录或数据加载时调用，确保本地缓存与服务器一致
 */
export function syncLanguagePreferenceFromServer(serverLanguage: string | undefined | null) {
  if (!serverLanguage) return;
  
  const lang = serverLanguage as Language;
  const currentLocal = localStorage.getItem('mychat-translation-language');
  
  // 只有当服务器语言与本地不同时才更新
  if (currentLocal !== lang) {
    console.log(`Syncing translation language from server: ${currentLocal} -> ${lang}`);
    translationLanguage = lang;
    localStorage.setItem('mychat-translation-language', lang);
  }
}

/**
 * 内部使用：设置UI语言（只在初始化时调用）
 */
function setUILanguage(lang: Language) {
  if (SUPPORTED_UI_LANGUAGES.has(lang)) {
    uiLanguage = lang;
    localStorage.setItem('mychat-ui-language', lang);
    console.log(`UI language initialized to: ${lang}`);
  } else {
    uiLanguage = 'en';
    localStorage.setItem('mychat-ui-language', 'en');
    console.log(`UI language initialized to: en (${lang} not fully supported)`);
  }
}

export function t(key: keyof I18nMessages, ...args: string[]): string {
  const message = messages[getCurrentLanguage()][key];
  
  // Support multiple {} placeholders with positional arguments
  if (args.length === 0) {
    return message;
  }
  
  let result = message;
  args.forEach((arg, index) => {
    // Replace {} placeholders in order with provided arguments
    result = result.replace('{}', arg);
  });
  
  return result;
}

// Get translation in a specific language (for language picker confirmation dialog)
export function tInLanguage(languageCode: string, key: keyof I18nMessages, ...args: string[]): string {
  const lang = languageCode as Language;
  const message = messages[lang]?.[key] || messages['en'][key]; // fallback to English
  
  // Support multiple {} placeholders with positional arguments
  if (args.length === 0) {
    return message;
  }
  
  let result = message;
  args.forEach((arg, index) => {
    // Replace {} placeholders in order with provided arguments
    result = result.replace('{}', arg);
  });
  
  return result;
}

export function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t('justNow');
  if (minutes < 60) return `${minutes} ${t('minutesAgo')}`;
  if (hours < 24) return `${hours} ${t('hoursAgo')}`;
  if (days === 1) return t('yesterday');
  if (days < 7) return `${days} ${t('daysAgo')}`;
  
  return date.toLocaleDateString();
}

// Locale mapping for date formatting
const dateLocaleMap: Record<Language, string> = {
  zh: 'zh-CN',
  en: 'en-US',
  th: 'th-TH',
  ja: 'ja-JP',
  id: 'id-ID',
  es: 'es-ES',
  fr: 'fr-FR',
  ar: 'ar-SA',
  hi: 'hi-IN',
  de: 'de-DE',
  ru: 'ru-RU',
  pt: 'pt-BR',
};

export function getLocalizedDate(dateStr: string | Date, language?: Language): string {
  const lang = language || getCurrentLanguage();
  const locale = dateLocaleMap[lang] || 'en-US';
  
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime())) {
      return messages[lang].invalidDate;
    }
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return messages[lang].invalidDate;
  }
}

// Apply saved language attributes on app startup
function initializeLanguageSettings() {
  const rtlCodes = ['ar', 'ur'];
  const userPreferredLang = localStorage.getItem('user-preferred-language');
  const uiLang = getCurrentLanguage();
  
  if (typeof document !== "undefined") {
    const html = document.documentElement;
    
    // 设置HTML lang为UI语言（用于辅助功能和SEO）
    html.setAttribute("lang", uiLang);
    
    // 默认保持LTR布局，不自动改变布局方向
    // RTL语言也使用LTR布局，只在聊天内容中应用RTL方向
    html.setAttribute("dir", "ltr");
    document.body.classList.remove("rtl");
    
    // 如果用户偏好的语言是RTL，在聊天区域应用RTL方向
    if (userPreferredLang && rtlCodes.includes(userPreferredLang)) {
      document.body.classList.add("has-rtl-chat");
    } else {
      document.body.classList.remove("has-rtl-chat");
    }
    
    // 如果UI语言本身是RTL，也添加chat RTL class（为了聊天界面正确显示）
    if (rtlCodes.includes(uiLang)) {
      document.body.classList.add("has-rtl-chat");
    }
  }
}

/**
 * 仅检测浏览器语言（不保存到 localStorage）
 * 用于用户注册时初始化语言偏好
 */
export function detectBrowserLanguage(): Language {
  // 获取用户浏览器语言偏好列表
  const getUserLanguages = (): string[] => {
    if (typeof navigator === 'undefined') return ['en'];
    
    // 优先使用 navigator.languages (现代浏览器)
    if (navigator.languages && navigator.languages.length > 0) {
      return [...navigator.languages];
    }
    
    // 备选方案：单一语言检测
    const fallbackLang = navigator.language || (navigator as any).userLanguage || 'en';
    return [fallbackLang];
  };
  
  // 扩展语言代码映射表 - 支持所有55种语言（12种UI + 43种翻译）
  const languageMap: Record<string, Language> = {
    // 12种完整UI支持语言
    'zh': 'zh', 'zh-CN': 'zh', 'zh-TW': 'zh', 'zh-HK': 'zh',
    'en': 'en', 'en-US': 'en', 'en-GB': 'en', 'en-AU': 'en',
    'th': 'th', 'th-TH': 'th',
    'ja': 'ja', 'ja-JP': 'ja',
    'id': 'id', 'id-ID': 'id',
    'es': 'es', 'es-ES': 'es', 'es-MX': 'es',
    'fr': 'fr', 'fr-FR': 'fr', 'fr-CA': 'fr',
    'ar': 'ar', 'ar-SA': 'ar', 'ar-EG': 'ar',
    'hi': 'hi', 'hi-IN': 'hi',
    'de': 'de', 'de-DE': 'de', 'de-AT': 'de',
    'ru': 'ru', 'ru-RU': 'ru',
    'pt': 'pt', 'pt-BR': 'pt', 'pt-PT': 'pt',
    
    // 43种额外翻译支持语言（UI显示英文，消息翻译用对应语言）
    'vi': 'vi', 'vi-VN': 'vi',
    'ko': 'ko', 'ko-KR': 'ko',
    'ms': 'ms', 'ms-MY': 'ms',
    'tl': 'tl', 'tl-PH': 'tl',
    'my': 'my', 'my-MM': 'my',
    'km': 'km', 'km-KH': 'km',
    'lo': 'lo', 'lo-LA': 'lo',
    'ne': 'ne', 'ne-NP': 'ne',
    'si': 'si', 'si-LK': 'si',
    'ta': 'ta', 'ta-IN': 'ta',
    'te': 'te', 'te-IN': 'te',
    'ml': 'ml', 'ml-IN': 'ml',
    'kn': 'kn', 'kn-IN': 'kn',
    'pa': 'pa', 'pa-IN': 'pa',
    'gu': 'gu', 'gu-IN': 'gu',
    'mr': 'mr', 'mr-IN': 'mr',
    'bn': 'bn', 'bn-BD': 'bn', 'bn-IN': 'bn',
    'ur': 'ur', 'ur-PK': 'ur',
    'it': 'it', 'it-IT': 'it',
    'nl': 'nl', 'nl-NL': 'nl', 'nl-BE': 'nl',
    'pl': 'pl', 'pl-PL': 'pl',
    'tr': 'tr', 'tr-TR': 'tr',
    'ro': 'ro', 'ro-RO': 'ro',
    'sv': 'sv', 'sv-SE': 'sv',
    'no': 'no', 'no-NO': 'no', 'nb': 'no', 'nn': 'no',
    'da': 'da', 'da-DK': 'da',
    'fi': 'fi', 'fi-FI': 'fi',
    'cs': 'cs', 'cs-CZ': 'cs',
    'el': 'el', 'el-GR': 'el',
    'hu': 'hu', 'hu-HU': 'hu',
    'uk': 'uk', 'uk-UA': 'uk',
    'bg': 'bg', 'bg-BG': 'bg',
    'sr': 'sr', 'sr-RS': 'sr',
    'hr': 'hr', 'hr-HR': 'hr',
    'sk': 'sk', 'sk-SK': 'sk',
    'sl': 'sl', 'sl-SI': 'sl',
    'he': 'he', 'he-IL': 'he', 'iw': 'he',
    'fa': 'fa', 'fa-IR': 'fa',
    'sw': 'sw', 'sw-KE': 'sw', 'sw-TZ': 'sw',
    'am': 'am', 'am-ET': 'am',
    'zu': 'zu', 'zu-ZA': 'zu',
    'af': 'af', 'af-ZA': 'af',
  };
  
  // 尝试匹配浏览器语言
  const userLanguages = getUserLanguages();
  for (const lang of userLanguages) {
    const normalized = lang.toLowerCase();
    if (languageMap[normalized]) {
      return languageMap[normalized];
    }
    // 尝试只匹配语言代码前缀 (如 "en-US" -> "en")
    const prefix = normalized.split('-')[0];
    if (languageMap[prefix]) {
      return languageMap[prefix];
    }
  }
  
  // 默认英文
  return 'en';
}

/**
 * 自动检测用户浏览器/手机语言设置并应用到系统
 */
/**
 * 自动检测并初始化UI语言（只在首次加载时调用）
 */
export function detectAndSetLanguage(): Language {
  // 使用新的检测函数
  const detectedLang = detectBrowserLanguage();
  
  // 检查是否已有存储的UI语言
  const storedUILang = localStorage.getItem('mychat-ui-language') as Language;
  
  if (storedUILang && SUPPORTED_UI_LANGUAGES.has(storedUILang)) {
    // 如果已有UI语言设置，使用已存储的
    setUILanguage(storedUILang);
    return storedUILang;
  } else {
    // 首次访问，使用浏览器检测的语言
    setUILanguage(detectedLang);
    return detectedLang;
  }
}

/**
 * 监听浏览器语言变化并自动更新
 */
export function setupLanguageChangeListener() {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('languagechange', () => {
    detectAndSetLanguage();
    
    // 触发页面刷新或重新渲染（可选）
    // window.location.reload();
  });
}

/**
 * AI助手ID常量
 */
export const AI_ASSISTANT_ID = "01e453c0-0d05-4dce-a85d-e11f6d513c94";

/**
 * 获取翻译后的用户显示名称
 * 如果用户是AI助手，返回翻译后的名称；否则返回原始名称
 */
export function getTranslatedUserName(userId: string, originalName: string): string {
  if (userId === AI_ASSISTANT_ID) {
    const currentMessages = messages[uiLanguage];
    return currentMessages.aiAssistantName;
  }
  return originalName;
}

/**
 * 检查用户是否是AI助手
 */
export function isAIAssistant(userId: string): boolean {
  return userId === AI_ASSISTANT_ID;
}

// 初始化UI语言和翻译语言 - 全部自动跟随浏览器设置
if (typeof window !== 'undefined') {
  // 自动检测浏览器语言
  const detectedLang = detectBrowserLanguage();
  
  // 翻译语言使用检测到的语言（支持 55 种语言）
  translationLanguage = detectedLang;
  
  // UI 语言：只支持 12 种，其他语言降级为英文
  if (SUPPORTED_UI_LANGUAGES.has(detectedLang)) {
    uiLanguage = detectedLang;
  } else {
    uiLanguage = 'en';
  }
  
  console.log(`Language auto-detected: UI=${uiLanguage}, Translation=${translationLanguage}`);
  
  // 应用语言属性
  initializeLanguageSettings();
} else {
  // 服务端环境，使用默认设置
  uiLanguage = 'en';
  translationLanguage = 'en';
}
