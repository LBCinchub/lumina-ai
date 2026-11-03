// Privacy policy content. Keep it in step with what the app actually does.
export const LAST_UPDATED = 'November 2, 2026';

// Where people send privacy requests.
export const CONTACT_EMAIL = 'lbcnetworkteam@gmail.com';

export const INTRO = 'This policy explains what information LBC AI collects, how it is used and shared, and the choices you have. It applies to the LBC AI app at lbchub.site.';

export const POLICY_SECTIONS = [
  {
    title: 'Who We Are',
    paragraphs: ['LBC AI is operated by LBC Network Inc. In this policy, “we” and “us” mean LBC Network Inc., and “LBC AI” means the app and its features.'],
  },
  {
    title: 'Information We Collect',
    paragraphs: ['We collect what you give us, what is created as you use LBC AI, and information from accounts you choose to connect.'],
    points: [
      { label: 'Account Information', text: 'Your name, email address, and how you sign in (email and password, Google, Microsoft, Facebook, or Apple).' },
      { label: 'Your Conversations And Content', text: "The messages you send and LBC AI's replies, conversation titles and summaries, and what you create in the app, such as documents, research reports, images, projects, tasks, agents and their instructions, templates, and the personal context you choose to add." },
      { label: 'Files You Upload', text: 'Images, documents, and other files you attach in chat or add to Documents, Knowledge, or Image Studio.' },
      { label: 'Long-Term Memory', text: 'When memory is on, LBC AI saves short notes it learns from your chats, such as your goals, preferences, and ongoing projects, so it can remember them later. Financial, health, legal, and personal hardship topics are only remembered if you turn that on.' },
      { label: 'Connected Accounts', text: 'If you connect Google Calendar, Gmail, GitHub, or Telegram, we receive the information needed for the features you use with them, as described below.' },
      { label: 'Voice', text: "In voice mode, your browser's built-in speech service turns your speech into text, and LBC AI receives only that text. Replies are read aloud by your device. During a call, LBC AI also checks how loud the microphone sound is, on your device, so it can stop talking when you speak. We do not record or store audio." },
      { label: 'Security Information', text: 'Keys that identify your trusted devices and, if you turn on Face ID or a passkey, the public part of that credential. Your face, fingerprint, and other biometric data never leave your device.' },
      { label: 'Usage Information', text: 'Basic technical information recorded by our hosting provider when you use LBC AI, such as pages visited and browser and device type. To personalize suggestions, LBC AI also keeps a short record of how you use it, such as the suggestions you open and the first words of your messages.' },
      { label: 'Early Access Requests', text: 'The email address and details you submit if you join the early access list on our home page.' },
    ],
  },
  {
    title: 'How We Use Information',
    paragraphs: ['We use your information to run LBC AI for you. We do not sell your personal information or use it for advertising.'],
    points: [
      { text: 'To provide LBC AI: answering your messages, remembering what matters to you, and creating the documents, research, images, and tasks you ask for.' },
      { text: 'To personalize LBC AI using your memory, your context, and how you use the app.' },
      { text: 'To keep your account secure, including confirming new devices and asking for your approval before sensitive actions.' },
      { text: 'To send you notifications about your account and the tasks you run.' },
      { text: 'To fix problems, keep LBC AI reliable, and meet our legal obligations.' },
    ],
  },
  {
    title: 'How AI Processes Your Information',
    points: [
      { text: 'To answer you, LBC AI sends your message and the context needed to answer it, such as the recent conversation, relevant memories, documents you selected, or calendar and email details you asked about, to the AI services that generate its replies.' },
      { text: 'Research and some answers use web search: the search terms LBC AI writes from your request are sent to search services.' },
      { text: 'LBC AI does not train AI models on your conversations or on data from your connected accounts.' },
      { text: 'Actions outside LBC AI, such as sending an email or pushing code, only happen after you review and approve them.' },
    ],
  },
  {
    title: 'Google Calendar And Gmail',
    paragraphs: ["Connecting Google is optional. You choose what to allow on Google's consent screen, and you can disconnect at any time in Settings or in your Google Account."],
    points: [
      { label: 'Google Calendar', text: 'LBC AI reads your calendar events to bring meeting context into your chats and projects. When you link a meeting to a project, we save its title, time, notes, and number of attendees.' },
      { label: 'Gmail', text: 'LBC AI reads the emails you ask it about so it can answer. What it reads can appear in its replies, which are saved in your chat history. It writes and sends email only when you ask and approve the exact message.' },
      {
        label: 'Limited Use',
        text: "We use Google user data only to provide the features you use. We do not sell it, use it for advertising, or use it to train AI models, and no person reads it unless you allow it or it is needed for security or to comply with the law. LBC AI's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.",
        link: { label: "Read Google's Policy", href: 'https://developers.google.com/terms/api-services-user-data-policy' },
      },
    ],
  },
  {
    title: 'GitHub And Telegram',
    points: [
      { label: 'GitHub', text: 'If you connect GitHub, LBC AI can see the repositories you allow and, after you review the changes, push code or create releases for you.' },
      { label: 'Telegram', text: 'If you pair an agent with Telegram, we keep your Telegram chat ID, and messages between you and that agent travel through Telegram under its own privacy policy.' },
    ],
  },
  {
    title: 'When We Share Information',
    paragraphs: ['We do not sell your personal information. We share it only:'],
    points: [
      { label: 'With Service Providers', text: 'Companies that help us run LBC AI, such as hosting and database, AI, web search, and email delivery services, process information on our behalf.' },
      { label: 'With Services You Connect', text: 'Google, GitHub, and Telegram receive what is needed when you use features that work with them.' },
      { label: 'Within The LBC Ecosystem', text: 'When you choose to share a conversation to lbc-hub.com.' },
      { label: 'For Legal Reasons', text: 'When the law requires it, or to protect the rights, safety, and security of our users, the public, or LBC AI.' },
      { label: 'In A Business Change', text: 'If LBC Network Inc. is involved in a merger, acquisition, or sale of assets, your information may transfer, and this policy will continue to apply to it.' },
    ],
  },
  {
    title: 'How We Store And Protect Information',
    points: [
      { text: 'Your conversations, memories, and other content are private to your account. Access rules stop other users from seeing them, and authorized LBC AI administrators access them only when needed to run and secure the service.' },
      { text: 'Information travels over encrypted connections.' },
      { text: "Files and images you upload are stored at unlisted web links. Anyone who has a file's exact link can open it, so avoid uploading anything you would not want shared that way." },
      { text: 'Your information may be stored and processed in Canada, the United States, or other countries where our service providers operate.' },
      { text: 'No system is completely secure, but we work to protect your information and to limit who can access it.' },
    ],
  },
  {
    title: 'How Long We Keep Information',
    points: [
      { text: 'We keep your information while your account is active and as long as needed to provide LBC AI.' },
      { text: 'When you forget a memory, it is deleted. Only a one-way fingerprint is kept, so LBC AI does not learn it again.' },
      { text: 'When you ask us to delete your account, we delete or anonymize your personal information, except what we must keep to meet legal obligations, resolve disputes, or prevent abuse.' },
    ],
  },
  {
    title: 'Your Choices And Rights',
    points: [
      { text: 'In Settings, under Memory, you can see and forget what LBC AI remembers, turn memory off, and choose whether it may search your past chats or remember sensitive topics. Both are off unless you turn them on.' },
      { text: 'In Settings, you can disconnect Gmail and Google Calendar and remove trusted devices or Face ID. You can disconnect GitHub or Telegram where you connected them.' },
      { text: 'You can ask us for a copy of your personal information, ask us to correct it, or ask us to delete your account, and you can withdraw your consent to optional features at any time.' },
      {
        text: 'If you are in Canada, you can also contact the Office of the Privacy Commissioner of Canada. Depending on where you live, you may have other rights under local law.',
        link: { label: 'Visit priv.gc.ca', href: 'https://www.priv.gc.ca' },
      },
    ],
  },
  {
    title: 'Children',
    paragraphs: ['LBC AI is not intended for children under 13, and we do not knowingly collect their personal information. If you believe a child has given us information, contact us and we will delete it.'],
  },
  {
    title: 'Cookies And Local Storage',
    paragraphs: ["LBC AI uses cookies and your browser's local storage to keep you signed in and to remember settings such as your theme. We do not use advertising cookies."],
  },
  {
    title: 'Changes To This Policy',
    paragraphs: ['We may update this policy as LBC AI changes. We will change the date at the top, and we will tell you in the app or by email before significant changes take effect.'],
  },
  {
    title: 'Contact Us',
    paragraphs: ['For questions about this policy or to make a request about your information, contact LBC Network Inc.'],
    points: [
      { label: 'Email', text: CONTACT_EMAIL },
      { label: 'Website', text: 'lbchub.site' },
    ],
  },
];